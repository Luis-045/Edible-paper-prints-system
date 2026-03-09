import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUserFromRequest: vi.fn(),
  from: vi.fn(),
  storageFrom: vi.fn(),
}));

vi.mock("@/lib/authServer", () => ({
  getUserFromRequest: mocks.getUserFromRequest,
}));

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: mocks.from,
    storage: {
      from: mocks.storageFrom,
    },
  },
}));

import { POST } from "@/app/api/orders/[id]/files/route";

describe("POST /api/orders/:id/files", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects when more than 8 files are uploaded", async () => {
    mocks.getUserFromRequest.mockResolvedValueOnce({ user: { id: "user_1" }, error: null });

    mocks.from.mockImplementation((table: string) => {
      if (table === "orders") {
        return {
          select: () => ({
            eq: () => ({
              is: () => ({
                single: async () => ({
                  data: { id: "order_1", user_id: "user_1" },
                  error: null,
                }),
              }),
            }),
          }),
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    });

    const formData = new FormData();
    formData.append("file_type", "reference");

    for (let i = 0; i < 9; i += 1) {
      formData.append("files", new File([new Uint8Array([1, 2, 3])], `img-${i}.png`, { type: "image/png" }));
    }

    const req = new Request("http://localhost/api/orders/order_1/files", {
      method: "POST",
      body: formData,
    });

    const res = await POST(req, { params: Promise.resolve({ id: "order_1" }) });
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain("Maximo 8");
  });

  it("rejects unsupported file types", async () => {
    mocks.getUserFromRequest.mockResolvedValueOnce({ user: { id: "user_1" }, error: null });

    mocks.from.mockImplementation((table: string) => {
      if (table === "orders") {
        return {
          select: () => ({
            eq: () => ({
              is: () => ({
                single: async () => ({
                  data: { id: "order_1", user_id: "user_1" },
                  error: null,
                }),
              }),
            }),
          }),
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    });

    const formData = new FormData();
    formData.append("file_type", "reference");
    formData.append("files", new File(["hello"], "notes.txt", { type: "text/plain" }));

    const req = new Request("http://localhost/api/orders/order_1/files", {
      method: "POST",
      body: formData,
    });

    const res = await POST(req, { params: Promise.resolve({ id: "order_1" }) });
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain("Tipo de archivo no permitido");
  });

  it("uploads valid files and returns 201", async () => {
    mocks.getUserFromRequest.mockResolvedValueOnce({ user: { id: "user_1" }, error: null });

    mocks.from.mockImplementation((table: string) => {
      if (table === "orders") {
        return {
          select: () => ({
            eq: () => ({
              is: () => ({
                single: async () => ({
                  data: { id: "order_1", user_id: "user_1" },
                  error: null,
                }),
              }),
            }),
          }),
        };
      }

      if (table === "order_files") {
        return {
          insert: () => ({
            select: () => ({
              single: async () => ({
                data: {
                  id: "file_1",
                  file_path: "order_1/reference/test.png",
                  original_name: "test.png",
                  created_at: "2026-03-06T13:00:00.000Z",
                },
                error: null,
              }),
            }),
          }),
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    });

    mocks.storageFrom.mockReturnValue({
      upload: async () => ({ error: null }),
    });

    const formData = new FormData();
    formData.append("file_type", "reference");
    formData.append("files", new File([new Uint8Array([1, 2, 3])], "test.png", { type: "image/png" }));

    const req = new Request("http://localhost/api/orders/order_1/files", {
      method: "POST",
      body: formData,
    });

    const res = await POST(req, { params: Promise.resolve({ id: "order_1" }) });
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.ok).toBe(true);
    expect(json.uploaded).toHaveLength(1);
  });
});
