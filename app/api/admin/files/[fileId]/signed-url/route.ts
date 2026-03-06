export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireAdmin } from "@/lib/requireAdmin";
import { databaseOperationError, internalServerError, isNotFoundError } from "@/lib/apiErrors";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const guard = await requireAdmin(req);
    if (!guard.ok) {
      return NextResponse.json({ error: guard.error }, { status: guard.status });
    }

    const { fileId } = await params;
    if (!fileId) {
      return NextResponse.json({ error: "Falta fileId" }, { status: 400 });
    }

    const { data: fileRow, error: dbErr } = await supabaseAdmin
      .from("order_files")
      .select("file_path, original_name")
      .eq("id", fileId)
      .single();

    if (dbErr) {
      if (isNotFoundError(dbErr)) {
        return NextResponse.json({ error: "Archivo no encontrado" }, { status: 404 });
      }
      return databaseOperationError();
    }

    if (!fileRow) {
      return NextResponse.json({ error: "Archivo no encontrado" }, { status: 404 });
    }

    const { data, error } = await supabaseAdmin.storage
      .from("order-files")
      .createSignedUrl(fileRow.file_path, 60 * 5);

    if (error || !data?.signedUrl) {
      return databaseOperationError();
    }

    return NextResponse.json(
      { ok: true, url: data.signedUrl, name: fileRow.original_name },
      { status: 200 }
    );
  } catch {
    return internalServerError();
  }
}
