import { NextResponse } from "next/server";

type DbErrorLike = {
  code?: string;
  message?: string;
  details?: string;
} | null | undefined;

export function isNotFoundError(error: DbErrorLike) {
  if (!error) return false;
  if (error.code === "PGRST116") return true;

  const text = `${error.message ?? ""} ${error.details ?? ""}`.toLowerCase();
  return text.includes("0 rows") || text.includes("no rows");
}

export function internalServerError() {
  return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
}

export function databaseOperationError() {
  return NextResponse.json({ error: "No se pudo procesar la solicitud" }, { status: 500 });
}
