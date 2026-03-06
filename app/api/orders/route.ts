import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase";
import { getUserFromRequest } from "../../../lib/authServer";
import { databaseOperationError, internalServerError } from "@/lib/apiErrors";

export async function POST(req: Request) {
  try {
    const { user, error: authError } = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: authError || "No autenticado" }, { status: 401 });
    }

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

    const { data, error } = await supabaseAdmin
      .from("orders")
      .insert([
        {
          user_id: user.id,
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

    if (error || !data) {
      return databaseOperationError();
    }

    return NextResponse.json({ ok: true, order: data }, { status: 201 });
  } catch {
    return internalServerError();
  }
}
