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

  return `$${order.total_price_mxn} MXN`;
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

function shapeLabel(value: string) {
  if (value === "circle") return "Circular";
  if (value === "rectangle") return "Rectangular";
  if (value === "custom") return "Personalizado";
  return value;
}

function productLabel(value: string) {
  if (!value) return "Pedido personalizado";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatUpdatedDate(value: string) {
  return new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
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
              <Link key={order.id} className="list-item client-order-card" href={`/dashboard/orders/${order.id}`}>
                <div className="client-order-top">
                  <span className="status-chip">{prettyStatus(order.status)}</span>
                  <span className="client-order-date">{formatUpdatedDate(order.updated_at || order.created_at)}</span>
                </div>

                <div className="client-order-main">
                  <div>
                    <h3 className="client-order-title">{productLabel(order.product_type)} personalizado</h3>
                    <p className="client-order-summary">
                      Hoja de {paperLabel(order.paper_type).toLowerCase()} · {shapeLabel(order.shape)} ·{" "}
                      {formatSize(order)}
                    </p>
                    {order.description && <p className="client-order-description">{order.description}</p>}
                  </div>

                  <div className="client-order-quote">
                    <span>Cotización</span>
                    <strong>{quoteLabel(order)}</strong>
                  </div>
                </div>

                <div className="client-order-footer">
                  <span>Pedido #{shortId(order.id)}</span>
                  <strong>Ver pedido</strong>
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
