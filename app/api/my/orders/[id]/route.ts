export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getUserFromRequest } from "@/lib/authServer";
import { databaseOperationError, internalServerError, isNotFoundError } from "@/lib/apiErrors";

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
        shape,
        width_cm,
        height_cm,
        description,
        notes
      `)
      .eq("id", id)
      .eq("user_id", user.id)
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
