"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type FileRow = {
  id: string;
  created_at: string;
  file_type: "final" | "reference";
  original_name: string;
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
  const [order, setOrder] = useState<any>(null);
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

      setOrder(data.order);
      setFiles(data.files || []);
    })();
  }, [id]);

  if (!ready) {
    return (
      <main style={{ maxWidth: 900, margin: "40px auto", padding: 16, fontFamily: "Arial" }}>
        <p>Verificando acceso...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main style={{ maxWidth: 900, margin: "40px auto", padding: 16, fontFamily: "Arial" }}>
        <p style={{ color: "crimson" }}>{error}</p>
      </main>
    );
  }

  if (!order) {
    return (
      <main style={{ maxWidth: 900, margin: "40px auto", padding: 16, fontFamily: "Arial" }}>
        <p>Cargando...</p>
      </main>
    );
  }

  const finals = files.filter((f) => f.file_type === "final");
  const refs = files.filter((f) => f.file_type === "reference");

  return (
    <main style={{ maxWidth: 900, margin: "40px auto", padding: 16, fontFamily: "Arial" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <a href="/dashboard" style={{ textDecoration: "none" }}>
          ← Volver
        </a>

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
          Cerrar sesión
        </button>
      </div>

      <h1 style={{ marginTop: 10 }}>Detalle de mi pedido</h1>

      <div style={{ padding: 12, border: "1px solid #ddd", borderRadius: 8 }}>
        <p><strong>Estado:</strong> {prettyStatus(order.status)}</p>
        <p>
          <strong>Última actualización:</strong>{" "}
          {order.updated_at ? new Date(order.updated_at).toLocaleString() : "—"}
        </p>
        <p><strong>Tipo:</strong> {order.product_type}</p>
        <p><strong>Forma:</strong> {order.shape}</p>
        <p>
          <strong>Tamaño:</strong> {order.width_cm ?? "?"}
          {order.shape === "rectangle" ? ` × ${order.height_cm ?? "?"}` : ""} cm
        </p>
        <p><strong>Descripción:</strong><br />{order.description}</p>

        {order.notes && (
          <p>
            <strong>Notas del brief:</strong>
            <br />
            {order.notes}
          </p>
        )}

        {order.client_note && (
          <p>
            <strong>Nota del administrador:</strong>
            <br />
            {order.client_note}
          </p>
        )}

        <p style={{ fontSize: 12, opacity: 0.7 }}>
          <strong>ID:</strong> {order.id}
        </p>
      </div>

      <h2 style={{ marginTop: 20 }}>Archivos finales</h2>
      {finals.length === 0 ? <p>No hay.</p> : (
        <ul>
          {finals.map((f) => (
            <li key={f.id}>{f.original_name}</li>
          ))}
        </ul>
      )}

      <h2 style={{ marginTop: 20 }}>Referencias</h2>
      {refs.length === 0 ? <p>No hay.</p> : (
        <ul>
          {refs.map((f) => (
            <li key={f.id}>{f.original_name}</li>
          ))}
        </ul>
      )}
    </main>
  );
}