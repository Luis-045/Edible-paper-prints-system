export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireAdmin } from "@/lib/requireAdmin";
import { databaseOperationError, internalServerError, isNotFoundError } from "@/lib/apiErrors";

export async function GET(
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

    const { data: order, error: orderErr } = await supabaseAdmin
      .from("orders")
      .select(`
        id,
        created_at,
        updated_at,
        user_id,
        status,
        admin_note,
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
      .select("id, created_at, file_type, file_path, original_name")
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
