"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getMyRole } from "@/lib/isAdminClient";

type FileRow = {
  id: string;
  created_at: string;
  file_type: "final" | "reference";
  file_path: string;
  original_name: string;
};

const STATUS_OPTIONS = [
  "new",
  "reviewing",
  "waiting_client",
  "in_progress",
  "ready",
  "completed",
  "cancelled",
];

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

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [ready, setReady] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  const [order, setOrder] = useState<any>(null);
  const [files, setFiles] = useState<FileRow[]>([]);
  const [error, setError] = useState("");

  const [status, setStatus] = useState("new");
  const [adminNote, setAdminNote] = useState("");
  const [clientNote, setClientNote] = useState("");
  const [saving, setSaving] = useState(false);

  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [loadingFileId, setLoadingFileId] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

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

      const res = await fetch(`/api/admin/orders/${id}`, {
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
        setError(data?.error || text || "Error cargando pedido");
        return;
      }

      setOrder(data.order);
      setFiles(data.files || []);
      setStatus(data.order?.status || "new");
      setAdminNote(data.order?.admin_note || "");
      setClientNote(data.order?.client_note || "");
    })();
  }, [id]);

  async function saveTracking() {
    if (!token || !id) return;

    setSaving(true);
    setError("");

    try {
      const res = await fetch(`/api/admin/orders/${id}/update`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status,
          admin_note: adminNote,
          client_note: clientNote,
        }),
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
        throw new Error(data?.error || text || "No se pudo guardar");
      }

      setOrder((prev: any) => ({
        ...prev,
        status: data.order.status,
        admin_note: data.order.admin_note,
        client_note: data.order.client_note,
        updated_at: data.order.updated_at,
      }));
    } catch (err: any) {
      setError(err.message || "Error guardando cambios");
    } finally {
      setSaving(false);
    }
  }

  async function getSignedUrl(fileId: string) {
    if (!token) throw new Error("No autenticado");
    if (signedUrls[fileId]) return signedUrls[fileId];

    setLoadingFileId(fileId);

    try {
      const res = await fetch(`/api/admin/files/${fileId}/signed-url`, {
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

      if (!res.ok) throw new Error(data?.error || text || "No se pudo generar link");

      setSignedUrls((prev) => ({ ...prev, [fileId]: data.url }));
      return data.url as string;
    } finally {
      setLoadingFileId(null);
    }
  }

  async function onPreview(fileId: string) {
    await getSignedUrl(fileId);
  }

  async function onDownload(fileId: string, filename: string) {
    const url = await getSignedUrl(fileId);

    const resp = await fetch(url);
    if (!resp.ok) throw new Error("No se pudo descargar el archivo");

    const blob = await resp.blob();

    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = filename || "archivo";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(blobUrl);
  }

  if (!ready) {
    return (
      <main style={{ maxWidth: 900, margin: "40px auto", padding: 16, fontFamily: "Arial" }}>
        <p>Verificando acceso...</p>
      </main>
    );
  }

  if (error && !order) {
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

  function FileCard({ f }: { f: FileRow }) {
    const url = signedUrls[f.id];

    return (
      <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
          <div>
            <strong>{f.original_name}</strong>
            <div style={{ fontSize: 12, opacity: 0.7 }}>
              {new Date(f.created_at).toLocaleString()}
            </div>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" onClick={() => onPreview(f.id)} disabled={loadingFileId === f.id}>
              {loadingFileId === f.id ? "..." : "Ver"}
            </button>

            <button
              type="button"
              onClick={() => onDownload(f.id, f.original_name)}
              disabled={loadingFileId === f.id}
            >
              Descargar
            </button>
          </div>
        </div>

        {url && (
          <div style={{ marginTop: 10 }}>
            <img
              src={url}
              alt={f.original_name}
              style={{ maxWidth: "100%", borderRadius: 6, border: "1px solid #eee" }}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <main style={{ maxWidth: 900, margin: "40px auto", padding: 16, fontFamily: "Arial" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <a href="/admin" style={{ textDecoration: "none" }}>
          ← Volver
        </a>

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

      <h1 style={{ marginTop: 10 }}>Pedido</h1>

      {error && <p style={{ color: "crimson" }}>{error}</p>}

      <div style={{ padding: 12, border: "1px solid #ddd", borderRadius: 8 }}>
        <p>
          <strong>Cliente:</strong> {order.contact_name} ({order.contact_channel}:{" "}
          {order.contact_value})
        </p>
        <p>
          <strong>Tipo:</strong> {order.product_type} • <strong>Forma:</strong> {order.shape}
        </p>
        <p>
          <strong>Tamaño:</strong> {order.width_cm ?? "?"}
          {order.shape === "rectangle" ? ` × ${order.height_cm ?? "?"}` : ""} cm
        </p>
        <p>
          <strong>Imagen final:</strong> {order.has_final_image ? "sí" : "no"}
        </p>
        <p>
          <strong>Estado actual:</strong> {prettyStatus(order.status)}
        </p>
        <p>
          <strong>Última actualización:</strong>{" "}
          {order.updated_at ? new Date(order.updated_at).toLocaleString() : "—"}
        </p>
        <p>
          <strong>Descripción:</strong>
          <br />
          {order.description}
        </p>
        {order.notes && (
          <p>
            <strong>Notas del brief:</strong>
            <br />
            {order.notes}
          </p>
        )}
        <p style={{ fontSize: 12, opacity: 0.7 }}>
          <strong>ID:</strong> {order.id}
        </p>
      </div>

      <div style={{ marginTop: 20, padding: 12, border: "1px solid #ddd", borderRadius: 8 }}>
        <h2>Seguimiento del pedido</h2>

        <label style={{ display: "grid", gap: 6, marginTop: 12 }}>
          <span>Estado</span>
          <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ padding: 8 }}>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {prettyStatus(s)}
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: "grid", gap: 6, marginTop: 12 }}>
          <span>Nota interna (solo admin)</span>
          <textarea
            rows={4}
            value={adminNote}
            onChange={(e) => setAdminNote(e.target.value)}
            style={{ width: "100%", padding: 8 }}
          />
        </label>

        <label style={{ display: "grid", gap: 6, marginTop: 12 }}>
          <span>Nota visible para cliente</span>
          <textarea
            rows={4}
            value={clientNote}
            onChange={(e) => setClientNote(e.target.value)}
            style={{ width: "100%", padding: 8 }}
          />
        </label>

        <button
          type="button"
          onClick={saveTracking}
          disabled={saving}
          style={{ marginTop: 12, padding: "10px 14px", cursor: "pointer" }}
        >
          {saving ? "Guardando..." : "Guardar cambios"}
        </button>
      </div>

      <h2 style={{ marginTop: 20 }}>Archivos finales</h2>
      {finals.length === 0 ? (
        <p>No hay.</p>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {finals.map((f) => (
            <FileCard key={f.id} f={f} />
          ))}
        </div>
      )}

      <h2 style={{ marginTop: 20 }}>Referencias</h2>
      {refs.length === 0 ? (
        <p>No hay.</p>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {refs.map((f) => (
            <FileCard key={f.id} f={f} />
          ))}
        </div>
      )}
    </main>
  );
}