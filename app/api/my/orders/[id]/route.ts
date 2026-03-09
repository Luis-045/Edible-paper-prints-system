export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getUserFromRequest } from "@/lib/authServer";
import { databaseOperationError, internalServerError, isNotFoundError } from "@/lib/apiErrors";

const EDITABLE_BY_CLIENT = new Set(["new", "reviewing", "waiting_client"]);
const DELETABLE_BY_CLIENT = new Set(["new", "reviewing", "waiting_client", "in_progress", "ready"]);
const PAPER_PRICES: Record<string, number> = {
  rice: 50,
  sugar: 100,
};

type UpdateOrderBody = {
  has_final_image?: boolean;
  product_type?: string;
  paper_type?: string;
  shape?: string;
  width_cm?: number | null;
  height_cm?: number | null;
  description?: string;
  notes?: string | null;
};

type OwnedOrderRow = {
  id: string;
  status: string;
  deleted_at: string | null;
};

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isPositiveNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

async function getOwnedOrder(orderId: string, userId: string) {
  const { data, error } = await supabaseAdmin
    .from("orders")
    .select("id, status, deleted_at")
    .eq("id", orderId)
    .eq("user_id", userId)
    .single<OwnedOrderRow>();

  if (error) {
    if (isNotFoundError(error)) {
      return { found: false as const };
    }

    return { found: false as const, error: true as const };
  }

  if (!data || data.deleted_at) {
    return { found: false as const };
  }

  return { found: true as const, order: data };
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error: authError } = await getUserFromRequest(req);

    if (!user) {
      return NextResponse.json(
        { error: authError || "No autenticado" },
        { status: 401 }
      );
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Falta id" }, { status: 400 });
    }

    const { data: order, error: orderErr } = await supabaseAdmin
      .from("orders")
      .select(`
        id,
        created_at,
        updated_at,
        status,
        client_note,
        contact_name,
        contact_channel,
        contact_value,
        has_final_image,
        product_type,
        paper_type,
        base_price_mxn,
        sheet_count,
        extra_cost_mxn,
        total_price_mxn,
        shape,
        width_cm,
        height_cm,
        description,
        notes
      `)
      .eq("id", id)
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .single();

    if (orderErr) {
      if (isNotFoundError(orderErr)) {
        return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
      }
      return databaseOperationError();
    }

    if (!order) {
      return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
    }

    const { data: files, error: filesErr } = await supabaseAdmin
      .from("order_files")
      .select("id, created_at, file_type, original_name")
      .eq("order_id", id)
      .order("created_at", { ascending: true });

    if (filesErr) {
      return databaseOperationError();
    }

    return NextResponse.json(
      { ok: true, order, files: files ?? [] },
      { status: 200 }
    );
  } catch {
    return internalServerError();
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error: authError } = await getUserFromRequest(req);

    if (!user) {
      return NextResponse.json(
        { error: authError || "No autenticado" },
        { status: 401 }
      );
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Falta id" }, { status: 400 });
    }

    const owned = await getOwnedOrder(id, user.id);
    if (!owned.found) {
      if ("error" in owned && owned.error) {
        return databaseOperationError();
      }
      return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
    }

    if (!EDITABLE_BY_CLIENT.has(owned.order.status)) {
      return NextResponse.json(
        { error: "Este pedido ya no puede editarse. Contacta a Delifesti para continuar." },
        { status: 409 }
      );
    }

    const body = (await req.json()) as UpdateOrderBody;

    const required = ["has_final_image", "product_type", "paper_type", "shape", "description"] as const;
    for (const key of required) {
      if (body[key] === undefined || body[key] === null || body[key] === "") {
        return NextResponse.json({ error: `Falta campo: ${key}` }, { status: 400 });
      }
    }

    const paperType = cleanText(body.paper_type).toLowerCase();
    const basePrice = PAPER_PRICES[paperType];

    if (!basePrice) {
      return NextResponse.json({ error: "Tipo de hoja inválido" }, { status: 400 });
    }

    const shape = cleanText(body.shape).toLowerCase();
    const width = body.width_cm;
    const height = body.height_cm;

    if (!isPositiveNumber(width)) {
      return NextResponse.json({ error: "width_cm debe ser un número mayor a 0" }, { status: 400 });
    }

    if (shape !== "circle" && !isPositiveNumber(height)) {
      return NextResponse.json({ error: "height_cm debe ser un número mayor a 0 para esa forma" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("orders")
      .update({
        has_final_image: Boolean(body.has_final_image),
        product_type: body.product_type,
        paper_type: paperType,
        base_price_mxn: basePrice,
        shape,
        width_cm: width,
        height_cm: shape === "circle" ? null : height,
        description: cleanText(body.description),
        notes: cleanText(body.notes) || null,
        status: "new",
        sheet_count: null,
        extra_cost_mxn: 0,
        total_price_mxn: null,
      })
      .eq("id", id)
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .select(`
        id,
        created_at,
        updated_at,
        status,
        client_note,
        has_final_image,
        product_type,
        paper_type,
        base_price_mxn,
        sheet_count,
        extra_cost_mxn,
        total_price_mxn,
        shape,
        width_cm,
        height_cm,
        description,
        notes
      `)
      .single();

    if (error) {
      if (isNotFoundError(error)) {
        return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
      }
      return databaseOperationError();
    }

    if (!data) {
      return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, order: data }, { status: 200 });
  } catch {
    return internalServerError();
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error: authError } = await getUserFromRequest(req);

    if (!user) {
      return NextResponse.json(
        { error: authError || "No autenticado" },
        { status: 401 }
      );
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Falta id" }, { status: 400 });
    }

    const owned = await getOwnedOrder(id, user.id);
    if (!owned.found) {
      if ("error" in owned && owned.error) {
        return databaseOperationError();
      }
      return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
    }

    if (!DELETABLE_BY_CLIENT.has(owned.order.status)) {
      return NextResponse.json(
        { error: "Este pedido ya no puede cancelarse desde tu cuenta." },
        { status: 409 }
      );
    }

    const { error } = await supabaseAdmin
      .from("orders")
      .update({
        status: "cancelled",
        deleted_at: new Date().toISOString(),
        deleted_by: user.id,
      })
      .eq("id", id)
      .eq("user_id", user.id)
      .is("deleted_at", null);

    if (error) {
      return databaseOperationError();
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch {
    return internalServerError();
  }
}
