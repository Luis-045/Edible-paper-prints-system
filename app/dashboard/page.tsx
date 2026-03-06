"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

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
  client_note: string | null;
};

function prettyStatus(status: string) {
  switch (status) {
    case "new":
      return "Nuevo";
    case "reviewing":
      return "Revisando";
    case "waiting_client":
      return "Esperando respuesta";
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

export default function DashboardPage() {
  const [ready, setReady] = useState(false);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (!token) {
        window.location.href = "/login";
        return;
      }

      setReady(true);

      const res = await fetch(`/api/my/orders?ts=${Date.now()}`, {
        method: "GET",
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${token}`,
          "Cache-Control": "no-store",
        },
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
        <h1>Mis pedidos</h1>
        <p>Verificando acceso...</p>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 900, margin: "40px auto", padding: 16, fontFamily: "Arial" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Mis pedidos</h1>

        <button
          onClick={async () => {
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
          Cerrar sesion
        </button>
      </div>

      {error && <p style={{ color: "crimson" }}>{error}</p>}

      {orders.length === 0 ? (
        <p style={{ marginTop: 20 }}>Aun no tienes pedidos.</p>
      ) : (
        <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
          {orders.map((o) => (
            <a
              key={o.id}
              href={`/dashboard/orders/${o.id}`}
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

              <div style={{ marginTop: 6 }}>
                {o.product_type} * {o.shape} * {o.width_cm ?? "?"}
                {o.shape === "rectangle" ? ` x ${o.height_cm ?? "?"}` : ""} cm
              </div>

              <div style={{ marginTop: 6 }}>
                <strong>Estado:</strong> {prettyStatus(o.status)}
              </div>

              {o.client_note && (
                <div style={{ marginTop: 8, fontSize: 14, opacity: 0.9 }}>
                  <strong>Nota:</strong> {o.client_note}
                </div>
              )}

              <div style={{ marginTop: 6, fontSize: 12, opacity: 0.7 }}>{o.id}</div>
            </a>
          ))}
        </div>
      )}
    </main>
  );
}
