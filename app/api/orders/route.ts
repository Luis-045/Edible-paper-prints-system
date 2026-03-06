import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase";
import { getUserFromRequest } from "../../../lib/authServer";

export async function POST(req: Request) {
  try {
    // ✅ 1) Validar que venga usuario autenticado
    const { user, error: authError } = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: authError }, { status: 401 });
    }

    // ✅ 2) Leer body
    const body = await req.json();

    const required = [
      "contact_name",
      "contact_channel",
      "contact_value",
      "has_final_image",
      "product_type",
      "shape",
      "description",
    ];

    for (const key of required) {
      if (body[key] === undefined || body[key] === null || body[key] === "") {
        return NextResponse.json({ error: `Falta campo: ${key}` }, { status: 400 });
      }
    }

    // ✅ 3) Insertar pedido ligado al usuario
    const { data, error } = await supabaseAdmin
      .from("orders")
      .insert([
        {
          user_id: user.id, // 👈 IMPORTANTÍSIMO
          contact_name: body.contact_name,
          contact_channel: body.contact_channel,
          contact_value: body.contact_value,
          has_final_image: Boolean(body.has_final_image),
          product_type: body.product_type,
          shape: body.shape,
          width_cm: body.width_cm ?? null,
          height_cm: body.height_cm ?? null,
          description: body.description,
          notes: body.notes ?? null,
        },
      ])
      .select("id, created_at")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, order: data }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Error desconocido" },
      { status: 500 }
    );
  }
}