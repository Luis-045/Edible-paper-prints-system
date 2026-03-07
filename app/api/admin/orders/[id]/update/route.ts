export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireAdmin } from "@/lib/requireAdmin";
import { databaseOperationError, internalServerError, isNotFoundError } from "@/lib/apiErrors";

const ALLOWED_STATUS = [
  "new",
  "reviewing",
  "waiting_client",
  "in_progress",
  "ready",
  "completed",
  "cancelled",
] as const;

type AllowedStatus = (typeof ALLOWED_STATUS)[number];
type UpdatePayload = {
  status?: AllowedStatus;
  admin_note?: string | null;
  client_note?: string | null;
  sheet_count?: number | null;
  extra_cost_mxn?: number;
  total_price_mxn?: number | null;
};

type ExistingOrder = {
  id: string;
  base_price_mxn: number | null;
  sheet_count: number | null;
  extra_cost_mxn: number | null;
};

function isAllowedStatus(value: string): value is AllowedStatus {
  return (ALLOWED_STATUS as readonly string[]).includes(value);
}

function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireAdmin(req);
    if (!guard.ok) {
      return NextResponse.json({ error: guard.error }, { status: guard.status });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Falta id" }, { status: 400 });
    }

    const body = (await req.json()) as {
      status?: string;
      admin_note?: string | null;
      client_note?: string | null;
      sheet_count?: number | null;
      extra_cost_mxn?: number;
    };

    const updates: UpdatePayload = {};
    const quoteTouched = body.sheet_count !== undefined || body.extra_cost_mxn !== undefined;

    if (body.status !== undefined) {
      if (!isAllowedStatus(body.status)) {
        return NextResponse.json({ error: "Status invalido" }, { status: 400 });
      }
      updates.status = body.status;
    }

    if (body.admin_note !== undefined) {
      updates.admin_note = body.admin_note?.trim() ? body.admin_note : null;
    }

    if (body.client_note !== undefined) {
      updates.client_note = body.client_note?.trim() ? body.client_note : null;
    }

    if (body.sheet_count !== undefined) {
      if (body.sheet_count !== null && (!Number.isInteger(body.sheet_count) || body.sheet_count < 1)) {
        return NextResponse.json({ error: "sheet_count debe ser un entero mayor o igual a 1" }, { status: 400 });
      }
      updates.sheet_count = body.sheet_count;
    }

    if (body.extra_cost_mxn !== undefined) {
      if (!isNonNegativeNumber(body.extra_cost_mxn)) {
        return NextResponse.json({ error: "extra_cost_mxn debe ser un numero mayor o igual a 0" }, { status: 400 });
      }
      updates.extra_cost_mxn = body.extra_cost_mxn;
    }

    if (quoteTouched) {
      const { data: existing, error: existingError } = await supabaseAdmin
        .from("orders")
        .select("id, base_price_mxn, sheet_count, extra_cost_mxn")
        .eq("id", id)
        .single<ExistingOrder>();

      if (existingError) {
        if (isNotFoundError(existingError)) {
          return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
        }
        return databaseOperationError();
      }

      if (!existing) {
        return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
      }

      const basePrice = existing.base_price_mxn ?? 0;
      const nextSheetCount = updates.sheet_count !== undefined ? updates.sheet_count : existing.sheet_count;
      const nextExtra = updates.extra_cost_mxn !== undefined ? updates.extra_cost_mxn : existing.extra_cost_mxn ?? 0;

      if (nextSheetCount && nextSheetCount > 0) {
        updates.total_price_mxn = Number((basePrice * nextSheetCount + nextExtra).toFixed(2));
      } else {
        updates.total_price_mxn = null;
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No hay cambios para guardar" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("orders")
      .update(updates)
      .eq("id", id)
      .select("id, updated_at, status, admin_note, client_note, sheet_count, extra_cost_mxn, total_price_mxn")
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
