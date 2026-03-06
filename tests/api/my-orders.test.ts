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

import { GET } from "@/app/api/my/orders/route";

describe("GET /api/my/orders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when user is not authenticated", async () => {
    mocks.getUserFromRequest.mockResolvedValueOnce({ user: null, error: "No autenticado" });

    const req = new Request("http://localhost/api/my/orders", { method: "GET" });
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error).toBe("No autenticado");
  });

  it("returns orders for the authenticated user", async () => {
    mocks.getUserFromRequest.mockResolvedValueOnce({ user: { id: "user_1" }, error: null });

    const expectedOrders = [{ id: "order_1", status: "new" }];

    mocks.from.mockReturnValueOnce({
      select: () => ({
        eq: () => ({
          order: async () => ({ data: expectedOrders, error: null }),
        }),
      }),
    });

    const req = new Request("http://localhost/api/my/orders", { method: "GET" });
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.orders).toEqual(expectedOrders);
  });

  it("returns a sanitized 500 on database errors", async () => {
    mocks.getUserFromRequest.mockResolvedValueOnce({ user: { id: "user_1" }, error: null });

    mocks.from.mockReturnValueOnce({
      select: () => ({
        eq: () => ({
          order: async () => ({ data: null, error: { message: "db raw error" } }),
        }),
      }),
    });

    const req = new Request("http://localhost/api/my/orders", { method: "GET" });
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).toBe("No se pudo procesar la solicitud");
  });
});
