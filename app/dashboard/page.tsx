"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type OrderRow = {
  id: string;
  created_at: string;
  updated_at: string;
  status: string;
  product_type: string;
  paper_type: string | null;
  base_price_mxn: number | null;
  sheet_count: number | null;
  extra_cost_mxn: number | null;
  total_price_mxn: number | null;
  shape: string;
  width_cm: number | null;
  height_cm: number | null;
  has_final_image: boolean;
  description: string;
  client_note: string | null;
};

type ClientView = "active" | "history";

const HISTORY_STATUSES = new Set(["completed", "cancelled"]);

function paperLabel(value: string | null) {
  if (value === "sugar") return "Azúcar";
  return "Arroz";
}

function quoteLabel(order: OrderRow) {
  if (!order.sheet_count || !order.total_price_mxn) {
    return "Cotización pendiente";
  }

  return `$${order.total_price_mxn} MXN (${order.sheet_count} hoja(s))`;
}

function prettyStatus(status: string) {
  switch (status) {
    case "new":
      return "Recibido";
    case "reviewing":
      return "En revisión";
    case "waiting_client":
      return "Falta tu respuesta";
    case "in_progress":
      return "En proceso";
    case "ready":
      return "Listo para entrega";
    case "completed":
      return "Completado";
    case "cancelled":
      return "Cancelado";
    default:
      return status;
  }
}

function formatSize(order: OrderRow) {
  if (order.shape === "circle") {
    return `${order.width_cm ?? "?"} cm de diámetro`;
  }

  return `${order.width_cm ?? "?"} x ${order.height_cm ?? "?"} cm`;
}

function shortId(id: string) {
  return id.slice(0, 8).toUpperCase();
}

export default function DashboardPage() {
  const [ready, setReady] = useState(false);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [error, setError] = useState("");
  const [view, setView] = useState<ClientView>("active");

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
          return JSON.parse(text) as { orders?: OrderRow[]; error?: string };
        } catch {
          return null;
        }
      })();

      if (!res.ok || !data) {
        setError(data?.error || text || "Error cargando pedidos");
        return;
      }

      setOrders(data.orders || []);
    })();
  }, []);

  const activeOrders = useMemo(
    () => orders.filter((order) => !HISTORY_STATUSES.has(order.status)),
    [orders]
  );

  const historyOrders = useMemo(
    () => orders.filter((order) => HISTORY_STATUSES.has(order.status)),
    [orders]
  );

  const visibleOrders = view === "active" ? activeOrders : historyOrders;

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
            Cerrar sesión
          </button>
        </div>
      </nav>

      <section className="panel stack">
        <div className="section-head">
          <h1>Mis pedidos</h1>
          <p className="helper">
            Activos: {activeOrders.length} | Historial: {historyOrders.length}
          </p>
        </div>

        <div className="tab-row">
          <button
            type="button"
            className={`tab-button ${view === "active" ? "tab-button-active" : ""}`}
            onClick={() => setView("active")}
          >
            Activos
          </button>
          <button
            type="button"
            className={`tab-button ${view === "history" ? "tab-button-active" : ""}`}
            onClick={() => setView("history")}
          >
            Historial
          </button>
        </div>

        {error && <p className="notice notice-error">{error}</p>}

        {visibleOrders.length === 0 ? (
          <p className="helper">No hay pedidos en esta vista.</p>
        ) : (
          <div className="list-grid">
            {visibleOrders.map((order) => (
              <Link key={order.id} className="list-item" href={`/dashboard/orders/${order.id}`}>
                <div className="item-top">
                  <h3 className="item-title">Pedido #{shortId(order.id)}</h3>
                  <span className="muted">{new Date(order.updated_at || order.created_at).toLocaleString()}</span>
                </div>

                <div className="meta-grid">
                  <p className="meta-item">
                    <strong>Producto:</strong> {order.product_type}
                  </p>
                  <p className="meta-item">
                    <strong>Hoja:</strong> {paperLabel(order.paper_type)} (${order.base_price_mxn ?? "-"}/hoja)
                  </p>
                  <p className="meta-item">
                    <strong>Forma:</strong> {order.shape}
                  </p>
                  <p className="meta-item">
                    <strong>Tamaño:</strong> {formatSize(order)}
                  </p>
                  <p className="meta-item">
                    <strong>Imagen final:</strong> {order.has_final_image ? "Sí" : "No"}
                  </p>
                  <p className="meta-item">
                    <strong>Cotización:</strong> {quoteLabel(order)}
                  </p>
                </div>

                <p className="description-snippet">{order.description}</p>

                <div>
                  <span className="status-chip">{prettyStatus(order.status)}</span>
                </div>

                {order.client_note && (
                  <p className="note-box">
                    <strong>Nota del equipo:</strong> {order.client_note}
                  </p>
                )}
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
