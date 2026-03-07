export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireAdmin } from "@/lib/requireAdmin";
import { databaseOperationError, internalServerError } from "@/lib/apiErrors";

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

const VIEW_STATUS: Record<string, string[] | null> = {
  pending: ["new", "reviewing", "waiting_client", "in_progress"],
  ready: ["ready"],
  archived: ["completed", "cancelled"],
  all: null,
};

function parsePositiveInt(value: string | null, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return parsed;
}

function escapeLike(value: string) {
  return value.replace(/[%,_]/g, "");
}

export async function GET(req: Request) {
  try {
    const guard = await requireAdmin(req);
    if (!guard.ok) {
      return NextResponse.json({ error: guard.error }, { status: guard.status });
    }

    const url = new URL(req.url);
    const viewParam = (url.searchParams.get("view") || "pending").toLowerCase();
    const view = Object.prototype.hasOwnProperty.call(VIEW_STATUS, viewParam) ? viewParam : "pending";
    const statuses = VIEW_STATUS[view];

    const page = parsePositiveInt(url.searchParams.get("page"), 1);
    const pageSize = Math.min(parsePositiveInt(url.searchParams.get("page_size"), DEFAULT_PAGE_SIZE), MAX_PAGE_SIZE);
    const q = (url.searchParams.get("q") || "").trim();

    let query = supabaseAdmin
      .from("orders")
      .select(
        `
        id,
        created_at,
        updated_at,
        status,
        contact_name,
        contact_value,
        product_type,
        paper_type,
        base_price_mxn,
        sheet_count,
        extra_cost_mxn,
        total_price_mxn,
        shape,
        width_cm,
        height_cm,
        has_final_image
      `,
        { count: "exact" }
      )
      .order("updated_at", { ascending: false });

    if (statuses) {
      query = query.in("status", statuses);
    }

    if (q) {
      const safeQuery = escapeLike(q);
      query = query.or(`contact_name.ilike.%${safeQuery}%,contact_value.ilike.%${safeQuery}%`);
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error, count } = await query.range(from, to);

    if (error) {
      return databaseOperationError();
    }

    const total = count ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    return NextResponse.json(
      {
        ok: true,
        orders: data ?? [],
        pagination: {
          page,
          page_size: pageSize,
          total,
          total_pages: totalPages,
        },
        filters: {
          view,
          q,
        },
      },
      { status: 200 }
    );
  } catch {
    return internalServerError();
  }
}
