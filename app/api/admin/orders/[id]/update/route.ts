export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireAdmin } from "@/lib/requireAdmin";

const ALLOWED_STATUS = [
  "new",
  "reviewing",
  "waiting_client",
  "in_progress",
  "ready",
  "completed",
  "cancelled",
];

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

    const body = await req.json();

    const updates: Record<string, any> = {};

    if (body.status !== undefined) {
      if (!ALLOWED_STATUS.includes(body.status)) {
        return NextResponse.json({ error: "Status inválido" }, { status: 400 });
      }
      updates.status = body.status;
    }

    if (body.admin_note !== undefined) {
      updates.admin_note = body.admin_note?.trim() ? body.admin_note : null;
    }

    if (body.client_note !== undefined) {
      updates.client_note = body.client_note?.trim() ? body.client_note : null;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No hay cambios para guardar" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("orders")
      .update(updates)
      .eq("id", id)
      .select("id, updated_at, status, admin_note, client_note")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, order: data }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Error desconocido" },
      { status: 500 }
    );
  }
}