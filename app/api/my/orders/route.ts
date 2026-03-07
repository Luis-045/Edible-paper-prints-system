export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getUserFromRequest } from "@/lib/authServer";
import { databaseOperationError, internalServerError } from "@/lib/apiErrors";

export async function GET(req: Request) {
  try {
    const { user, error: authError } = await getUserFromRequest(req);

    if (!user) {
      return NextResponse.json(
        { error: authError || "No autenticado" },
        { status: 401 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("orders")
      .select(`
        id,
        created_at,
        updated_at,
        status,
        product_type,
        shape,
        width_cm,
        height_cm,
        has_final_image,
        description,
        client_note
      `)
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    if (error) {
      return databaseOperationError();
    }

    return NextResponse.json({ ok: true, orders: data ?? [] }, { status: 200 });
  } catch {
    return internalServerError();
  }
}
