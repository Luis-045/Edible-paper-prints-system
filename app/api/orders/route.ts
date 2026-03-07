import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getUserFromRequest } from "@/lib/authServer";
import { databaseOperationError, internalServerError } from "@/lib/apiErrors";

type OrderBody = {
  has_final_image?: boolean;
  product_type?: string;
  paper_type?: string;
  shape?: string;
  width_cm?: number | null;
  height_cm?: number | null;
  description?: string;
  notes?: string | null;
};

type UserMetadata = {
  full_name?: string;
  phone?: string;
};

const PAPER_PRICES: Record<string, number> = {
  rice: 50,
  sugar: 100,
};

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(req: Request) {
  try {
    const { user, error: authError } = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: authError || "No autenticado" }, { status: 401 });
    }

    const body = (await req.json()) as OrderBody;

    const required = ["has_final_image", "product_type", "paper_type", "shape", "description"] as const;

    for (const key of required) {
      if (body[key] === undefined || body[key] === null || body[key] === "") {
        return NextResponse.json({ error: `Falta campo: ${key}` }, { status: 400 });
      }
    }

    const metadata = (user.user_metadata || {}) as UserMetadata;
    const fullName = cleanText(metadata.full_name);
    const phone = cleanText(metadata.phone);
    const paperType = cleanText(body.paper_type).toLowerCase();
    const basePrice = PAPER_PRICES[paperType];

    if (!fullName || !phone) {
      return NextResponse.json(
        { error: "Tu cuenta no tiene nombre o telefono. Completa tu perfil para crear pedidos." },
        { status: 400 }
      );
    }

    if (!basePrice) {
      return NextResponse.json({ error: "Tipo de hoja invalido" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("orders")
      .insert([
        {
          user_id: user.id,
          contact_name: fullName,
          contact_channel: "whatsapp",
          contact_value: phone,
          has_final_image: Boolean(body.has_final_image),
          product_type: body.product_type,
          paper_type: paperType,
          base_price_mxn: basePrice,
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
