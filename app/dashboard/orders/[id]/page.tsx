"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type FileRow = {
  id: string;
  created_at: string;
  file_type: "final" | "reference";
  original_name: string;
};

type OrderDetail = {
  id: string;
  status: string;
  updated_at: string | null;
  product_type: string;
  shape: string;
  width_cm: number | null;
  height_cm: number | null;
  description: string;
  notes: string | null;
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

export default function ClientOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [ready, setReady] = useState(false);
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [files, setFiles] = useState<FileRow[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;

    (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (!token) {
        window.location.href = "/login";
        return;
      }

      setReady(true);

      const res = await fetch(`/api/my/orders/${id}`, {
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${token}`,
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
        setError(data?.error || text || "Error cargando pedido");
        return;
      }

      setOrder(data.order as OrderDetail);
      setFiles((data.files || []) as FileRow[]);
    })();
  }, [id]);

  if (!ready) {
    return (
      <main className="page">
        <section className="panel">
          <p className="helper">Verificando acceso...</p>
        </section>
      </main>
    );
  }

  if (error) {
    return (
      <main className="page">
        <section className="panel">
          <p className="notice notice-error">{error}</p>
        </section>
      </main>
    );
  }

  if (!order) {
    return (
      <main className="page">
        <section className="panel">
          <p className="helper">Cargando...</p>
        </section>
      </main>
    );
  }

  const finals = files.filter((file) => file.file_type === "final");
  const refs = files.filter((file) => file.file_type === "reference");

  return (
    <main className="page">
      <nav className="nav">
        <div className="nav-actions">
          <Link className="button button-ghost" href="/dashboard">
            Volver
          </Link>
        </div>

        <button
          className="button button-secondary"
          onClick={async () => {
            await supabase.auth.signOut();
            window.location.href = "/login";
          }}
        >
          Cerrar sesion
        </button>
      </nav>

      <section className="panel stack">
        <h1>Detalle de pedido</h1>
        <div>
          <span className="status-chip">{prettyStatus(order.status)}</span>
        </div>

        <div className="info-grid">
          <p className="info-item">
            <strong>Ultima actualizacion:</strong>{" "}
            {order.updated_at ? new Date(order.updated_at).toLocaleString() : "-"}
          </p>
          <p className="info-item">
            <strong>Tipo:</strong> {order.product_type}
          </p>
          <p className="info-item">
            <strong>Forma:</strong> {order.shape}
          </p>
          <p className="info-item">
            <strong>Tamano:</strong> {order.width_cm ?? "?"}
            {order.shape === "rectangle" ? ` x ${order.height_cm ?? "?"}` : ""} cm
          </p>
        </div>

        <p className="info-item">
          <strong>Descripcion:</strong>
          <br />
          {order.description}
        </p>

        {order.notes && (
          <p className="info-item">
            <strong>Notas del brief:</strong>
            <br />
            {order.notes}
          </p>
        )}

        {order.client_note && (
          <p className="info-item">
            <strong>Nota del administrador:</strong>
            <br />
            {order.client_note}
          </p>
        )}

        <p className="id-text">{order.id}</p>
      </section>

      <section className="panel spacer-top">
        <h2>Archivos finales</h2>
        {finals.length === 0 ? (
          <p className="helper spacer-top">No hay archivos finales.</p>
        ) : (
          <ul className="stack spacer-top">
            {finals.map((file) => (
              <li key={file.id} className="card">
                <strong>{file.original_name}</strong>
                <p className="muted">{new Date(file.created_at).toLocaleString()}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel spacer-top">
        <h2>Referencias</h2>
        {refs.length === 0 ? (
          <p className="helper spacer-top">No hay referencias.</p>
        ) : (
          <ul className="stack spacer-top">
            {refs.map((file) => (
              <li key={file.id} className="card">
                <strong>{file.original_name}</strong>
                <p className="muted">{new Date(file.created_at).toLocaleString()}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
