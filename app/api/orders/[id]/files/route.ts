export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getUserFromRequest } from "@/lib/authServer";


export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // ✅ 1) Validar usuario autenticado (token)
    const { user, error: authError } = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: authError }, { status: 401 });
    }

    // ✅ 2) Obtener orderId de la ruta dinámica
    const { id: orderId } = await params;

    if (!orderId) {
      return NextResponse.json({ error: "Falta order id" }, { status: 400 });
    }

    // ✅ 3) Verificar que el pedido exista y sea del usuario
    const { data: orderRow, error: orderErr } = await supabaseAdmin
      .from("orders")
      .select("id, user_id")
      .eq("id", orderId)
      .single();

    if (orderErr || !orderRow) {
      return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
    }

    if (orderRow.user_id !== user.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    // ✅ 4) Procesar formData
    const formData = await req.formData();
    const fileType = String(formData.get("file_type") || "reference");
    const files = formData.getAll("files") as File[];

    if (fileType !== "final" && fileType !== "reference") {
      return NextResponse.json({ error: "file_type inválido" }, { status: 400 });
    }

    const validFiles = (files || []).filter(
      (f) => f && typeof (f as any).name === "string" && (f as any).size > 0
    ) as File[];

    if (validFiles.length === 0) {
      return NextResponse.json({ error: "No llegaron archivos" }, { status: 400 });
    }

    // ✅ 5) Subir archivos y registrar en DB
    const uploaded: any[] = [];

    for (const file of validFiles) {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const safeName = file.name.replace(/\s+/g, "_");
      const path = `${orderId}/${fileType}/${Date.now()}_${safeName}`;

      const { error: uploadError } = await supabaseAdmin.storage
        .from("order-files")
        .upload(path, buffer, {
          contentType: file.type || "application/octet-stream",
          upsert: false,
        });

      if (uploadError) {
        return NextResponse.json({ error: uploadError.message }, { status: 500 });
      }

      const { data: row, error: dbError } = await supabaseAdmin
        .from("order_files")
        .insert([
          {
            order_id: orderId,
            file_type: fileType,
            file_path: path,
            original_name: file.name,
          },
        ])
        .select("id, file_path, original_name, created_at")
        .single();

      if (dbError) {
        return NextResponse.json({ error: dbError.message }, { status: 500 });
      }

      uploaded.push(row);
    }

    return NextResponse.json({ ok: true, uploaded }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Error desconocido" },
      { status: 500 }
    );
  }
}