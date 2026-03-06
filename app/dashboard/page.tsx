"use client";

import Link from "next/link";
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
      <main className="page">
        <section className="panel">
          <h1>Mis pedidos</h1>
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
          <span>Delifesti</span>
        </div>

        <div className="nav-actions">
          <Link className="button button-primary" href="/nuevo-pedido">
            Nuevo pedido
          </Link>
          <button
            className="button button-secondary"
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.href = "/login";
            }}
          >
            Cerrar sesion
          </button>
        </div>
      </nav>

      <section className="panel">
        <h1>Mis pedidos</h1>
        <p className="helper spacer-top">Consulta el estado y seguimiento de tus briefs.</p>

        {error && <p className="notice notice-error">{error}</p>}

        {orders.length === 0 ? (
          <p className="helper spacer-top">Aun no tienes pedidos.</p>
        ) : (
          <div className="list-grid">
            {orders.map((order) => (
              <Link key={order.id} className="list-item" href={`/dashboard/orders/${order.id}`}>
                <div className="item-top">
                  <h3 className="item-title">{order.contact_name}</h3>
                  <span className="muted">
                    {new Date(order.updated_at || order.created_at).toLocaleString()}
                  </span>
                </div>

                <p className="muted">
                  {order.product_type} * {order.shape} * {order.width_cm ?? "?"}
                  {order.shape === "rectangle" ? ` x ${order.height_cm ?? "?"}` : ""} cm
                </p>

                <div>
                  <span className="status-chip">{prettyStatus(order.status)}</span>
                </div>

                {order.client_note && (
                  <p className="muted">
                    <strong>Nota:</strong> {order.client_note}
                  </p>
                )}

                <p className="id-text">{order.id}</p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
