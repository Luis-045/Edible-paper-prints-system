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
    mocks.getUserFromRequest.mockResolvedValueOnce({
      user: { id: "user_1", user_metadata: { full_name: "Luis", phone: "5512345678" } },
      error: null,
    });

    const req = new Request("http://localhost/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        has_final_image: false,
        product_type: "pastel",
        shape: "circle",
      }),
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain("paper_type");
  });

  it("returns 400 when account metadata has no name or phone", async () => {
    mocks.getUserFromRequest.mockResolvedValueOnce({
      user: { id: "user_1", user_metadata: {} },
      error: null,
    });

    const req = new Request("http://localhost/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        has_final_image: false,
        product_type: "pastel",
        paper_type: "rice",
        shape: "circle",
        description: "Pokemon",
      }),
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain("nombre o telefono");
  });

  it("creates an order successfully using account metadata", async () => {
    mocks.getUserFromRequest.mockResolvedValueOnce({
      user: {
        id: "user_1",
        user_metadata: { full_name: "Luis Flores", phone: "5512345678" },
      },
      error: null,
    });

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
        has_final_image: false,
        product_type: "pastel",
        paper_type: "sugar",
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
    expect(insertedRows[0]?.contact_name).toBe("Luis Flores");
    expect(insertedRows[0]?.contact_value).toBe("5512345678");
    expect(insertedRows[0]?.paper_type).toBe("sugar");
    expect(insertedRows[0]?.base_price_mxn).toBe(100);
  });
});
