"use client";

import Link from "next/link";
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

      setReady(true);

      const res = await fetch("/api/admin/orders", {
        cache: "no-store",
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

      setOrders((data.orders || []) as OrderRow[]);
    })();
  }, []);

  if (!ready) {
    return (
      <main className="page">
        <section className="panel">
          <h1>Admin | Pedidos</h1>
          <p className="helper spacer-top">Verificando acceso...</p>
        </section>
      </main>
    );
  }

  return (
    <main className="page">
      <nav className="nav">
        <div className="brand">
          <span className="brand-dot" />
          <span>Delifesti Admin</span>
        </div>

        <button
          className="button button-secondary"
          onClick={async () => {
            const { supabase } = await import("@/lib/supabaseClient");
            await supabase.auth.signOut();
            window.location.href = "/login";
          }}
        >
          Cerrar sesion
        </button>
      </nav>

      <section className="panel">
        <h1>Pedidos recientes</h1>
        <p className="helper spacer-top">Gestiona estado, notas internas y notas para cliente.</p>

        {error && <p className="notice notice-error">{error}</p>}

        {orders.length === 0 ? (
          <p className="helper spacer-top">No hay pedidos por mostrar.</p>
        ) : (
          <div className="list-grid">
            {orders.map((order) => (
              <Link key={order.id} className="list-item" href={`/admin/orders/${order.id}`}>
                <div className="item-top">
                  <h3 className="item-title">{order.contact_name}</h3>
                  <span className="muted">
                    {new Date(order.updated_at || order.created_at).toLocaleString()}
                  </span>
                </div>

                <p className="muted">
                  {order.product_type} * {order.shape} * {order.width_cm ?? "?"}
                  {order.shape === "rectangle" ? ` x ${order.height_cm ?? "?"}` : ""} cm * final: {order.has_final_image ? "si" : "no"}
                </p>

                <div>
                  <span className="status-chip">{prettyStatus(order.status)}</span>
                </div>

                <p className="id-text">{order.id}</p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
