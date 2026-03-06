import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUserFromRequest: vi.fn(),
  from: vi.fn(),
}));

vi.mock("@/lib/authServer", () => ({
  getUserFromRequest: mocks.getUserFromRequest,
}));

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: mocks.from,
  },
}));

import { POST } from "@/app/api/orders/route";

describe("POST /api/orders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when user is not authenticated", async () => {
    mocks.getUserFromRequest.mockResolvedValueOnce({ user: null, error: "No autenticado" });

    const req = new Request("http://localhost/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error).toBe("No autenticado");
  });

  it("returns 400 when required fields are missing", async () => {
    mocks.getUserFromRequest.mockResolvedValueOnce({ user: { id: "user_1" }, error: null });

    const req = new Request("http://localhost/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contact_name: "Luis",
        contact_channel: "whatsapp",
        contact_value: "5512345678",
        has_final_image: false,
        product_type: "pastel",
        shape: "circle",
      }),
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain("description");
  });

  it("creates an order successfully", async () => {
    mocks.getUserFromRequest.mockResolvedValueOnce({ user: { id: "user_1" }, error: null });

    let insertedRows: Array<Record<string, unknown>> = [];

    mocks.from.mockReturnValueOnce({
      insert: (rows: Array<Record<string, unknown>>) => {
        insertedRows = rows;

        return {
          select: () => ({
            single: async () => ({
              data: { id: "order_1", created_at: "2026-03-06T13:00:00.000Z" },
              error: null,
            }),
          }),
        };
      },
    });

    const req = new Request("http://localhost/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contact_name: "Luis",
        contact_channel: "whatsapp",
        contact_value: "5512345678",
        has_final_image: false,
        product_type: "pastel",
        shape: "circle",
        description: "Pokemon",
      }),
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.ok).toBe(true);
    expect(json.order.id).toBe("order_1");
    expect(insertedRows[0]?.user_id).toBe("user_1");
  });
});
