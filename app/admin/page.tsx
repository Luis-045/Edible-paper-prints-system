"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getMyRole } from "@/lib/isAdminClient";

type OrderRow = {
  id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  status: string;
  contact_name: string;
  contact_value: string;
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
};

type AdminView = "pending" | "ready" | "archived" | "deleted" | "all";

type AdminOrdersResponse = {
  orders: OrderRow[];
  pagination?: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
  };
  error?: string;
};

type UpdateStatusResponse = {
  order?: {
    status: string;
    updated_at: string;
  };
  error?: string;
};

const VIEW_OPTIONS: Array<{ key: AdminView; label: string }> = [
  { key: "pending", label: "Pendientes" },
  { key: "ready", label: "Listos" },
  { key: "archived", label: "Archivados" },
  { key: "deleted", label: "Eliminados" },
  { key: "all", label: "Todos" },
];

const STATUS_OPTIONS = [
  "new",
  "reviewing",
  "waiting_client",
  "in_progress",
  "ready",
  "completed",
  "cancelled",
] as const;

function paperLabel(value: string | null) {
  if (value === "sugar") return "Azúcar";
  return "Arroz";
}

function quoteLabel(order: OrderRow) {
  if (!order.sheet_count || !order.total_price_mxn) {
    return "Cotización pendiente";
  }

  const extra = order.extra_cost_mxn ?? 0;
  return `${order.sheet_count} hoja(s) • Total $${order.total_price_mxn} MXN${extra > 0 ? ` (incluye extra $${extra})` : ""}`;
}

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
  const [loading, setLoading] = useState(false);

  const [view, setView] = useState<AdminView>("pending");
  const [queryInput, setQueryInput] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [refreshTick, setRefreshTick] = useState(0);

  const [statusDraftByOrder, setStatusDraftByOrder] = useState<Record<string, string>>({});
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  const titleByView = useMemo(() => {
    switch (view) {
      case "pending":
        return "Pedidos pendientes";
      case "ready":
        return "Pedidos listos";
      case "archived":
        return "Pedidos archivados";
      case "deleted":
        return "Pedidos eliminados";
      case "all":
        return "Todos los pedidos";
      default:
        return "Pedidos";
    }
  }, [view]);

  useEffect(() => {
    (async () => {
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
    })();
  }, []);

  useEffect(() => {
    if (!token) return;

    (async () => {
      setLoading(true);
      setError("");

      const searchParams = new URLSearchParams({
        view,
        page: String(page),
        page_size: "25",
      });

      if (query.trim()) {
        searchParams.set("q", query.trim());
      }

      const res = await fetch(`/api/admin/orders?${searchParams.toString()}`, {
        cache: "no-store",
        headers: { Authorization: `Bearer ${token}` },
      });

      const text = await res.text();
      const data = (() => {
        try {
          return JSON.parse(text) as AdminOrdersResponse;
        } catch {
          return null;
        }
      })();

      if (!res.ok || !data) {
        setError(data?.error || text || "Error cargando pedidos");
        setOrders([]);
        setLoading(false);
        return;
      }

      setOrders(data.orders || []);
      setStatusDraftByOrder(
        (data.orders || []).reduce<Record<string, string>>((acc, order) => {
          acc[order.id] = order.status;
          return acc;
        }, {})
      );
      setTotalPages(data.pagination?.total_pages ?? 1);
      setTotal(data.pagination?.total ?? 0);
      setLoading(false);
    })();
  }, [token, view, page, query, refreshTick]);

  async function applyStatus(orderId: string) {
    if (!token) return;

    const draftStatus = statusDraftByOrder[orderId];
    const currentOrder = orders.find((order) => order.id === orderId);

    if (!currentOrder || currentOrder.deleted_at || !draftStatus || draftStatus === currentOrder.status) {
      return;
    }

    setUpdatingOrderId(orderId);
    setError("");

    try {
      const res = await fetch(`/api/admin/orders/${orderId}/update`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: draftStatus }),
      });

      const text = await res.text();
      const data = (() => {
        try {
          return JSON.parse(text) as UpdateStatusResponse;
        } catch {
          return null;
        }
      })();

      if (!res.ok || !data?.order) {
        throw new Error(data?.error || text || "No se pudo actualizar el estado");
      }

      setOrders((prev) =>
        prev.map((order) =>
          order.id === orderId
            ? { ...order, status: data.order?.status || order.status, updated_at: data.order?.updated_at || order.updated_at }
            : order
        )
      );

      setRefreshTick((prev) => prev + 1);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "No se pudo actualizar el estado";
      setError(message);
    } finally {
      setUpdatingOrderId(null);
    }
  }

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
          Cerrar sesión
        </button>
      </nav>

      <section className="panel stack">
        <div className="section-head">
          <h1>{titleByView}</h1>
          <p className="helper">Total: {total}</p>
        </div>

        <div className="tab-row">
          {VIEW_OPTIONS.map((option) => (
            <button
              key={option.key}
              type="button"
              className={`tab-button ${view === option.key ? "tab-button-active" : ""}`}
              onClick={() => {
                setView(option.key);
                setPage(1);
              }}
            >
              {option.label}
            </button>
          ))}
        </div>

        <form
          className="filter-row"
          onSubmit={(event) => {
            event.preventDefault();
            setPage(1);
            setQuery(queryInput);
          }}
        >
          <input
            className="input"
            placeholder="Buscar por cliente o teléfono"
            value={queryInput}
            onChange={(event) => setQueryInput(event.target.value)}
          />
          <button className="button button-primary" type="submit">
            Buscar
          </button>
          <button
            className="button button-ghost"
            type="button"
            onClick={() => {
              setQueryInput("");
              setQuery("");
              setPage(1);
            }}
          >
            Limpiar
          </button>
        </form>

        {error && <p className="notice notice-error">{error}</p>}

        {loading ? (
          <p className="helper">Cargando pedidos...</p>
        ) : orders.length === 0 ? (
          <p className="helper">No hay pedidos para este filtro.</p>
        ) : (
          <div className="list-grid">
            {orders.map((order) => {
              const isDeleted = Boolean(order.deleted_at);
              const canApplyStatus = !isDeleted;

              return (
                <article key={order.id} className="list-item">
                  <div className="item-top">
                    <h3 className="item-title">{order.contact_name}</h3>
                    <span className="muted">{new Date(order.updated_at || order.created_at).toLocaleString()}</span>
                  </div>

                  <p className="muted">
                    {order.product_type} • Hoja: {paperLabel(order.paper_type)} (${order.base_price_mxn ?? "-"}/hoja)
                  </p>

                  <p className="muted">
                    {order.shape} • {order.width_cm ?? "?"}
                    {order.shape === "rectangle" ? ` x ${order.height_cm ?? "?"}` : ""} cm • final: {order.has_final_image ? "sí" : "no"}
                  </p>

                  <p className="muted">
                    <strong>Teléfono:</strong> {order.contact_value || "-"}
                  </p>

                  <p className="muted">
                    <strong>Cotización:</strong> {quoteLabel(order)}
                  </p>

                  {isDeleted && (
                    <p className="notice notice-error">
                      Pedido eliminado el {order.deleted_at ? new Date(order.deleted_at).toLocaleString() : "-"}
                    </p>
                  )}

                  <div>
                    <span className="status-chip">{isDeleted ? "Eliminado" : prettyStatus(order.status)}</span>
                  </div>

                  <div className="inline-actions">
                    <select
                      className="select"
                      value={statusDraftByOrder[order.id] || order.status}
                      disabled={!canApplyStatus}
                      onChange={(event) =>
                        setStatusDraftByOrder((prev) => ({
                          ...prev,
                          [order.id]: event.target.value,
                        }))
                      }
                      style={{ minWidth: 180 }}
                    >
                      {STATUS_OPTIONS.map((statusOption) => (
                        <option key={statusOption} value={statusOption}>
                          {prettyStatus(statusOption)}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      className="button button-secondary"
                      onClick={() => applyStatus(order.id)}
                      disabled={!canApplyStatus || updatingOrderId === order.id || (statusDraftByOrder[order.id] || order.status) === order.status}
                    >
                      {updatingOrderId === order.id ? "Guardando..." : "Guardar estado"}
                    </button>

                    <Link className="button button-ghost" href={`/admin/orders/${order.id}`}>
                      Abrir detalle
                    </Link>
                  </div>

                  <p className="id-text">{order.id}</p>
                </article>
              );
            })}
          </div>
        )}

        <div className="pager-row">
          <button
            type="button"
            className="button button-secondary"
            disabled={page <= 1 || loading}
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
          >
            Anterior
          </button>
          <p className="helper">
            Página {page} de {totalPages}
          </p>
          <button
            type="button"
            className="button button-secondary"
            disabled={page >= totalPages || loading}
            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
          >
            Siguiente
          </button>
        </div>
      </section>
    </main>
  );
}
