export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireAdmin } from "@/lib/requireAdmin";

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
        shape,
        width_cm,
        height_cm,
        description,
        notes
      `)
      .eq("id", id)
      .single();

    if (orderErr) {
      const msg = String(orderErr.message || "");
      if (msg.toLowerCase().includes("0 rows")) {
        return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
      }
      return NextResponse.json({ error: orderErr.message }, { status: 500 });
    }

    const { data: files, error: filesErr } = await supabaseAdmin
      .from("order_files")
      .select("id, created_at, file_type, file_path, original_name")
      .eq("order_id", id)
      .order("created_at", { ascending: true });

    if (filesErr) {
      return NextResponse.json({ error: filesErr.message }, { status: 500 });
    }

    return NextResponse.json(
      { ok: true, order, files: files ?? [] },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Error desconocido" },
      { status: 500 }
    );
  }
}