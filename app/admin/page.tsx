"use client";

import { useEffect, useState } from "react";
import { getMyRole } from "@/lib/isAdminClient";

type OrderRow = {
  id: string;
  created_at: string;
  updated_at: string;
  status: string;
  contact_name: string;
  product_type: string;
  shape: string;
  width_cm: number | null;
  height_cm: number | null;
  has_final_image: boolean;
};

function prettyStatus(status: string) {
  switch (status) {
    case "new":
      return "Nuevo";
    case "reviewing":
      return "Revisando";
    case "waiting_client":
      return "Esperando cliente";
    case "in_progress":
      return "En proceso";
    case "ready":
      return "Listo";
    case "completed":
      return "Completado";
    case "cancelled":
      return "Cancelado";
    default:
      return status;
  }
}

export default function AdminPage() {
  const [ready, setReady] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      setError("");

      const { token, role } = await getMyRole();

      if (!token) {
        window.location.href = "/login";
        return;
      }

      if (role !== "admin") {
        window.location.href = "/";
        return;
      }

      setToken(token);
      setReady(true);

      const res = await fetch("/api/admin/orders", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const text = await res.text();
      const data = (() => {
        try {
          return JSON.parse(text);
        } catch {
          return null;
        }
      })();

      if (!res.ok) {
        setError(data?.error || text || "Error cargando pedidos");
        return;
      }

      setOrders(data.orders || []);
    })();
  }, []);

  if (!ready) {
    return (
      <main style={{ maxWidth: 900, margin: "40px auto", padding: 16, fontFamily: "Arial" }}>
        <h1>Admin — Pedidos</h1>
        <p>Verificando acceso...</p>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 900, margin: "40px auto", padding: 16, fontFamily: "Arial" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Admin — Pedidos</h1>

        <button
          onClick={async () => {
            const { supabase } = await import("@/lib/supabaseClient");
            await supabase.auth.signOut();
            window.location.href = "/login";
          }}
          style={{
            padding: "8px 12px",
            cursor: "pointer",
            borderRadius: 6,
            border: "1px solid #ccc",
            background: "#fff",
          }}
        >
          Cerrar sesión
        </button>
      </div>

      {error && <p style={{ color: "crimson" }}>{error}</p>}

      <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
        {orders.map((o) => (
          <a
            key={o.id}
            href={`/admin/orders/${o.id}`}
            style={{
              padding: 12,
              border: "1px solid #ddd",
              borderRadius: 8,
              textDecoration: "none",
              color: "inherit",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <strong>{o.contact_name}</strong>
              <span style={{ opacity: 0.7 }}>
                {new Date(o.updated_at || o.created_at).toLocaleString()}
              </span>
            </div>

            <div style={{ marginTop: 6, opacity: 0.9 }}>
              {o.product_type} • {o.shape} • {o.width_cm ?? "?"}
              {o.shape === "rectangle" ? ` × ${o.height_cm ?? "?"}` : ""} cm • final:{" "}
              {o.has_final_image ? "sí" : "no"}
            </div>

            <div style={{ marginTop: 6, fontSize: 13 }}>
              <strong>Estado:</strong> {prettyStatus(o.status)}
            </div>

            <div style={{ marginTop: 6, fontSize: 12, opacity: 0.7 }}>{o.id}</div>
          </a>
        ))}
      </div>
    </main>
  );
}