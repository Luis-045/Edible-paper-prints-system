"use client";

import Image from "next/image";
import Link from "next/link";
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

type OrderDetail = {
  id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  deleted_by: string | null;
  user_id: string;
  status: string;
  admin_note: string | null;
  client_note: string | null;
  contact_name: string;
  contact_channel: string;
  contact_value: string;
  has_final_image: boolean;
  product_type: string;
  paper_type: string | null;
  base_price_mxn: number | null;
  sheet_count: number | null;
  extra_cost_mxn: number | null;
  total_price_mxn: number | null;
  shape: string;
  width_cm: number | null;
  height_cm: number | null;
  description: string;
  notes: string | null;
};

type OrderUpdateResponse = {
  order: {
    status: string;
    admin_note: string | null;
    client_note: string | null;
    sheet_count: number | null;
    extra_cost_mxn: number | null;
    total_price_mxn: number | null;
    deleted_at: string | null;
    deleted_by: string | null;
    updated_at: string;
  };
};

const STATUS_OPTIONS = [
  "new",
  "reviewing",
  "waiting_client",
  "in_progress",
  "ready",
  "completed",
  "cancelled",
] as const;

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

function paperLabel(value: string | null) {
  if (value === "sugar") return "Azúcar";
  return "Arroz";
}

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [ready, setReady] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [files, setFiles] = useState<FileRow[]>([]);
  const [error, setError] = useState("");

  const [status, setStatus] = useState("new");
  const [sheetCount, setSheetCount] = useState("");
  const [extraCost, setExtraCost] = useState("0");
  const [adminNote, setAdminNote] = useState("");
  const [clientNote, setClientNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [lifecycleLoading, setLifecycleLoading] = useState(false);

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
        setError(data?.error || text || "Error cargando pedido");
        return;
      }

      setOrder(data.order as OrderDetail);
      setFiles((data.files || []) as FileRow[]);
      setStatus((data.order?.status as string) || "new");
      setAdminNote((data.order?.admin_note as string) || "");
      setClientNote((data.order?.client_note as string) || "");
      setSheetCount(data.order?.sheet_count ? String(data.order.sheet_count) : "");
      setExtraCost(String(data.order?.extra_cost_mxn ?? 0));
    })();
  }, [id]);

  async function saveTracking() {
    if (!token || !id || !order || order.deleted_at) return;

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
          sheet_count: sheetCount ? Number(sheetCount) : null,
          extra_cost_mxn: extraCost === "" ? 0 : Number(extraCost),
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

      if (!res.ok || !data?.order) {
        throw new Error(data?.error || text || "No se pudo guardar");
      }

      const updateData = data as OrderUpdateResponse;

      setOrder((prev) => {
        if (!prev) return prev;

        return {
          ...prev,
          status: updateData.order.status,
          admin_note: updateData.order.admin_note,
          client_note: updateData.order.client_note,
          sheet_count: updateData.order.sheet_count,
          extra_cost_mxn: updateData.order.extra_cost_mxn,
          total_price_mxn: updateData.order.total_price_mxn,
          deleted_at: updateData.order.deleted_at,
          deleted_by: updateData.order.deleted_by,
          updated_at: updateData.order.updated_at,
        };
      });
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Error guardando cambios";
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  async function updateLifecycle(action: "delete" | "restore") {
    if (!token || !id) return;

    if (action === "delete") {
      const ok = window.confirm("¿Deseas ocultar este pedido de las vistas normales?");
      if (!ok) return;
    }

    setLifecycleLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/admin/orders/${id}/update`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(action === "delete" ? { mark_deleted: true } : { restore: true }),
      });

      const text = await res.text();
      const data = (() => {
        try {
          return JSON.parse(text);
        } catch {
          return null;
        }
      })();

      if (!res.ok || !data?.order) {
        throw new Error(data?.error || text || "No se pudo actualizar el ciclo de vida");
      }

      const updateData = data as OrderUpdateResponse;

      setOrder((prev) => {
        if (!prev) return prev;

        return {
          ...prev,
          status: updateData.order.status,
          admin_note: updateData.order.admin_note,
          client_note: updateData.order.client_note,
          sheet_count: updateData.order.sheet_count,
          extra_cost_mxn: updateData.order.extra_cost_mxn,
          total_price_mxn: updateData.order.total_price_mxn,
          deleted_at: updateData.order.deleted_at,
          deleted_by: updateData.order.deleted_by,
          updated_at: updateData.order.updated_at,
        };
      });

      setStatus(updateData.order.status);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "No se pudo actualizar";
      setError(message);
    } finally {
      setLifecycleLoading(false);
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

      if (!res.ok || !data?.url) {
        throw new Error(data?.error || text || "No se pudo generar link");
      }

      setSignedUrls((prev) => ({ ...prev, [fileId]: String(data.url) }));
      return String(data.url);
    } finally {
      setLoadingFileId(null);
    }
  }

  async function onPreview(fileId: string) {
    await getSignedUrl(fileId);
  }

  async function onDownload(fileId: string, filename: string) {
    const url = await getSignedUrl(fileId);

    const response = await fetch(url);
    if (!response.ok) throw new Error("No se pudo descargar el archivo");

    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);

    const anchor = document.createElement("a");
    anchor.href = blobUrl;
    anchor.download = filename || "archivo";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    URL.revokeObjectURL(blobUrl);
  }

  if (!ready) {
    return (
      <main className="page">
        <section className="panel">
          <p className="helper">Verificando acceso...</p>
        </section>
      </main>
    );
  }

  if (error && !order) {
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

  const isDeleted = Boolean(order.deleted_at);
  const finalFiles = files.filter((file) => file.file_type === "final");
  const referenceFiles = files.filter((file) => file.file_type === "reference");

  function FileCard({ file }: { file: FileRow }) {
    const previewUrl = signedUrls[file.id];

    return (
      <div className="file-card">
        <div className="file-top">
          <div>
            <strong>{file.original_name}</strong>
            <p className="muted">{new Date(file.created_at).toLocaleString()}</p>
          </div>

          <div className="inline-actions">
            <button
              type="button"
              className="button button-secondary"
              onClick={() => onPreview(file.id)}
              disabled={loadingFileId === file.id}
            >
              {loadingFileId === file.id ? "..." : "Ver"}
            </button>

            <button
              type="button"
              className="button button-ghost"
              onClick={() => onDownload(file.id, file.original_name)}
              disabled={loadingFileId === file.id}
            >
              Descargar
            </button>
          </div>
        </div>

        {previewUrl && (
          <Image
            src={previewUrl}
            alt={file.original_name}
            width={1200}
            height={800}
            unoptimized
            className="preview-image"
          />
        )}
      </div>
    );
  }

  return (
    <main className="page">
      <nav className="nav">
        <Link className="button button-ghost" href="/admin">
          Volver
        </Link>

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
        <h1>Pedido</h1>
        {error && <p className="notice notice-error">{error}</p>}

        <div>
          <span className="status-chip">{isDeleted ? "Eliminado" : prettyStatus(order.status)}</span>
        </div>

        {isDeleted && (
          <p className="notice notice-error">
            Pedido eliminado el {order.deleted_at ? new Date(order.deleted_at).toLocaleString() : "-"}
          </p>
        )}

        <div className="info-grid">
          <p className="info-item">
            <strong>Cliente:</strong> {order.contact_name}
          </p>
          <p className="info-item">
            <strong>Contacto:</strong> {order.contact_channel} - {order.contact_value}
          </p>
          <p className="info-item">
            <strong>Tipo:</strong> {order.product_type}
          </p>
          <p className="info-item">
            <strong>Hoja:</strong> {paperLabel(order.paper_type)} (${order.base_price_mxn ?? "-"} por hoja)
          </p>
          <p className="info-item">
            <strong>Forma:</strong> {order.shape}
          </p>
          <p className="info-item">
            <strong>Tamaño:</strong> {order.width_cm ?? "?"}
            {order.shape === "rectangle" ? ` x ${order.height_cm ?? "?"}` : ""} cm
          </p>
          <p className="info-item">
            <strong>Imagen final:</strong> {order.has_final_image ? "sí" : "no"}
          </p>
          <p className="info-item">
            <strong>Última actualización:</strong> {new Date(order.updated_at).toLocaleString()}
          </p>
        </div>

        <p className="info-item">
          <strong>Descripción:</strong>
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

        <div className="card">
          <p>
            <strong>Cotización actual</strong>
          </p>
          <p>Hojas: {order.sheet_count ?? "pendiente"}</p>
          <p>Extra: ${order.extra_cost_mxn ?? 0} MXN</p>
          <p>Total: {order.total_price_mxn ? `$${order.total_price_mxn} MXN` : "Pendiente de cotizar"}</p>
        </div>

        <div className="inline-actions">
          {isDeleted ? (
            <button
              type="button"
              className="button button-primary"
              onClick={() => updateLifecycle("restore")}
              disabled={lifecycleLoading}
            >
              {lifecycleLoading ? "Restaurando..." : "Restaurar pedido"}
            </button>
          ) : (
            <button
              type="button"
              className="button button-ghost"
              onClick={() => updateLifecycle("delete")}
              disabled={lifecycleLoading}
            >
              {lifecycleLoading ? "Ocultando..." : "Ocultar pedido"}
            </button>
          )}
        </div>

        <p className="id-text">{order.id}</p>
      </section>

      <section className="panel spacer-top">
        <h2>Seguimiento del pedido</h2>

        {isDeleted && <p className="helper spacer-top">Restaura el pedido para editar seguimiento o cotización.</p>}

        <div className="form">
          <div className="field">
            <label htmlFor="status">Estado</label>
            <select id="status" className="select" value={status} onChange={(e) => setStatus(e.target.value)} disabled={isDeleted}>
              {STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {prettyStatus(option)}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="sheet-count">Cantidad de hojas</label>
            <input
              id="sheet-count"
              className="input"
              type="number"
              min="1"
              step="1"
              value={sheetCount}
              onChange={(e) => setSheetCount(e.target.value)}
              disabled={isDeleted}
            />
          </div>

          <div className="field">
            <label htmlFor="extra-cost">Costo extra (MXN)</label>
            <input
              id="extra-cost"
              className="input"
              type="number"
              min="0"
              step="0.01"
              value={extraCost}
              onChange={(e) => setExtraCost(e.target.value)}
              disabled={isDeleted}
            />
          </div>

          <div className="field">
            <label htmlFor="admin-note">Nota interna (solo admin)</label>
            <textarea
              id="admin-note"
              className="textarea"
              rows={4}
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              disabled={isDeleted}
            />
          </div>

          <div className="field">
            <label htmlFor="client-note">Nota visible para cliente</label>
            <textarea
              id="client-note"
              className="textarea"
              rows={4}
              value={clientNote}
              onChange={(e) => setClientNote(e.target.value)}
              disabled={isDeleted}
            />
          </div>

          <button type="button" className="button button-primary" onClick={saveTracking} disabled={saving || isDeleted}>
            {saving ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </section>

      <section className="panel spacer-top">
        <h2>Archivos finales</h2>
        {finalFiles.length === 0 ? (
          <p className="helper spacer-top">No hay archivos finales.</p>
        ) : (
          <div className="file-grid spacer-top">
            {finalFiles.map((file) => (
              <FileCard key={file.id} file={file} />
            ))}
          </div>
        )}
      </section>

      <section className="panel spacer-top">
        <h2>Referencias</h2>
        {referenceFiles.length === 0 ? (
          <p className="helper spacer-top">No hay referencias.</p>
        ) : (
          <div className="file-grid spacer-top">
            {referenceFiles.map((file) => (
              <FileCard key={file.id} file={file} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
