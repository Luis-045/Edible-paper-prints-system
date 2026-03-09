export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getUserFromRequest } from "@/lib/authServer";
import { databaseOperationError, internalServerError, isNotFoundError } from "@/lib/apiErrors";

const MAX_FILES_PER_REQUEST = 8;
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
]);

type UploadedFileRow = {
  id: string;
  file_path: string;
  original_name: string;
  created_at: string;
};

function isFileLike(entry: FormDataEntryValue): entry is File {
  return typeof entry !== "string";
}

function sanitizeFileName(name: string) {
  const normalized = name
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9._-]/g, "");

  const trimmed = normalized.slice(-120);
  return trimmed || "file";
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error: authError } = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: authError || "No autenticado" }, { status: 401 });
    }

    const { id: orderId } = await params;
    if (!orderId) {
      return NextResponse.json({ error: "Falta order id" }, { status: 400 });
    }

    const { data: orderRow, error: orderErr } = await supabaseAdmin
      .from("orders")
      .select("id, user_id")
      .eq("id", orderId)
      .is("deleted_at", null)
      .single();

    if (orderErr) {
      if (isNotFoundError(orderErr)) {
        return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
      }
      return databaseOperationError();
    }

    if (!orderRow) {
      return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
    }

    if (orderRow.user_id !== user.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const formData = await req.formData();
    const fileType = String(formData.get("file_type") || "reference");

    if (fileType !== "final" && fileType !== "reference") {
      return NextResponse.json({ error: "file_type invalido" }, { status: 400 });
    }

    const entries = formData.getAll("files");
    const validFiles = entries.filter(isFileLike).filter((file) => file.size > 0);

    if (validFiles.length === 0) {
      return NextResponse.json({ error: "No llegaron archivos" }, { status: 400 });
    }

    if (validFiles.length > MAX_FILES_PER_REQUEST) {
      return NextResponse.json(
        { error: `Maximo ${MAX_FILES_PER_REQUEST} archivos por solicitud` },
        { status: 400 }
      );
    }

    for (const file of validFiles) {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        return NextResponse.json(
          { error: `Archivo demasiado grande: ${file.name}. Maximo 10MB` },
          { status: 400 }
        );
      }

      const mimeType = (file.type || "").toLowerCase();
      if (!ALLOWED_MIME_TYPES.has(mimeType)) {
        return NextResponse.json(
          { error: `Tipo de archivo no permitido: ${file.name}` },
          { status: 400 }
        );
      }
    }

    const uploaded: UploadedFileRow[] = [];

    for (const file of validFiles) {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const safeName = sanitizeFileName(file.name);
      const path = `${orderId}/${fileType}/${Date.now()}_${crypto.randomUUID()}_${safeName}`;

      const { error: uploadError } = await supabaseAdmin.storage
        .from("order-files")
        .upload(path, buffer, {
          contentType: file.type || "application/octet-stream",
          upsert: false,
        });

      if (uploadError) {
        return NextResponse.json({ error: "No se pudo subir el archivo" }, { status: 500 });
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

      if (dbError || !row) {
        return databaseOperationError();
      }

      uploaded.push(row);
    }

    return NextResponse.json({ ok: true, uploaded }, { status: 201 });
  } catch {
    return internalServerError();
  }
}

