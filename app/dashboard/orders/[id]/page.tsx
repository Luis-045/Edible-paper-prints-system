"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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
  client_note: string | null;
};

type OrderDetailResponse = {
  order?: OrderDetail;
  files?: FileRow[];
  error?: string;
};

const EDITABLE_BY_CLIENT = new Set(["new", "reviewing", "waiting_client"]);
const DELETABLE_BY_CLIENT = new Set(["new", "reviewing", "waiting_client", "in_progress", "ready"]);

function paperLabel(value: string | null) {
  if (value === "sugar") return "Azúcar";
  return "Arroz";
}

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

function isPositiveNumberString(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0;
}

export default function ClientOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [ready, setReady] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [files, setFiles] = useState<FileRow[]>([]);
  const [error, setError] = useState("");

  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [hasFinalImage, setHasFinalImage] = useState("no");
  const [productType, setProductType] = useState("pastel");
  const [paperType, setPaperType] = useState("rice");
  const [shape, setShape] = useState("circle");
  const [widthCm, setWidthCm] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");

  const finals = useMemo(() => files.filter((file) => file.file_type === "final"), [files]);
  const refs = useMemo(() => files.filter((file) => file.file_type === "reference"), [files]);

  const canEdit = useMemo(() => (order ? EDITABLE_BY_CLIENT.has(order.status) : false), [order]);
  const canDelete = useMemo(() => (order ? DELETABLE_BY_CLIENT.has(order.status) : false), [order]);

  function syncFormFromOrder(nextOrder: OrderDetail) {
    setHasFinalImage(nextOrder.has_final_image ? "yes" : "no");
    setProductType(nextOrder.product_type || "pastel");
    setPaperType(nextOrder.paper_type === "sugar" ? "sugar" : "rice");
    setShape(nextOrder.shape || "circle");
    setWidthCm(nextOrder.width_cm ? String(nextOrder.width_cm) : "");
    setHeightCm(nextOrder.height_cm ? String(nextOrder.height_cm) : "");
    setDescription(nextOrder.description || "");
    setNotes(nextOrder.notes || "");
  }

  useEffect(() => {
    if (!id) return;

    (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      if (!accessToken) {
        window.location.href = "/login";
        return;
      }

      setToken(accessToken);
      setReady(true);

      const res = await fetch(`/api/my/orders/${id}`, {
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const text = await res.text();
      const data = (() => {
        try {
          return JSON.parse(text) as OrderDetailResponse;
        } catch {
          return null;
        }
      })();

      if (!res.ok || !data?.order) {
        setError(data?.error || text || "Error cargando pedido");
        return;
      }

      setOrder(data.order);
      setFiles(data.files || []);
      syncFormFromOrder(data.order);
    })();
  }, [id]);

  async function saveEdits() {
    if (!token || !id || !order) return;

    const trimmedDescription = description.trim();

    if (!trimmedDescription) {
      setError("Agrega una descripción para guardar.");
      return;
    }

    if (!isPositiveNumberString(widthCm)) {
      setError(shape === "circle" ? "Indica un diámetro válido." : "Indica un ancho válido.");
      return;
    }

    if (shape !== "circle" && !isPositiveNumberString(heightCm)) {
      setError("Indica un alto válido para esa forma.");
      return;
    }

    if (paperType !== "rice" && paperType !== "sugar") {
      setError("Tipo de hoja inválido.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const res = await fetch(`/api/my/orders/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          has_final_image: hasFinalImage === "yes",
          product_type: productType.trim(),
          paper_type: paperType,
          shape,
          width_cm: Number(widthCm),
          height_cm: shape === "circle" ? null : Number(heightCm),
          description: trimmedDescription,
          notes: notes.trim() || null,
        }),
      });

      const text = await res.text();
      const data = (() => {
        try {
          return JSON.parse(text) as { order?: OrderDetail; error?: string };
        } catch {
          return null;
        }
      })();

      if (!res.ok || !data?.order) {
        throw new Error(data?.error || text || "No se pudo actualizar el pedido");
      }

      setOrder(data.order);
      syncFormFromOrder(data.order);
      setIsEditing(false);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "No se pudo actualizar el pedido";
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteOrder() {
    if (!token || !id) return;

    const confirmed = window.confirm("¿Seguro que quieres cancelar este pedido? Se ocultará de tus listas activas.");
    if (!confirmed) return;

    setDeleting(true);
    setError("");

    try {
      const res = await fetch(`/api/my/orders/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const text = await res.text();
      const data = (() => {
        try {
          return JSON.parse(text) as { ok?: boolean; error?: string };
        } catch {
          return null;
        }
      })();

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || text || "No se pudo cancelar el pedido");
      }

      window.location.href = "/dashboard";
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "No se pudo cancelar el pedido";
      setError(message);
      setDeleting(false);
    }
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
          Cerrar sesión
        </button>
      </nav>

      <section className="panel stack">
        <h1>Detalle de pedido</h1>
        {error && <p className="notice notice-error">{error}</p>}

        <div>
          <span className="status-chip">{prettyStatus(order.status)}</span>
        </div>

        <div className="info-grid">
          <p className="info-item">
            <strong>Última actualización:</strong> {order.updated_at ? new Date(order.updated_at).toLocaleString() : "-"}
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
        </div>

        <div className="card">
          <p>
            <strong>Cotización</strong>
          </p>
          <p>Hojas: {order.sheet_count ?? "pendiente"}</p>
          <p>Extra: ${order.extra_cost_mxn ?? 0} MXN</p>
          <p>Total: {order.total_price_mxn ? `$${order.total_price_mxn} MXN` : "Pendiente de cotizar"}</p>
          <p className="helper spacer-top">Si editas este pedido, vuelve a estado Nuevo y se recalcula la cotización.</p>
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

        {order.client_note && (
          <p className="info-item">
            <strong>Nota del administrador:</strong>
            <br />
            {order.client_note}
          </p>
        )}

        <div className="inline-actions">
          <button
            type="button"
            className="button button-secondary"
            onClick={() => {
              if (!isEditing) {
                syncFormFromOrder(order);
              }
              setIsEditing((prev) => !prev);
              setError("");
            }}
            disabled={!canEdit || saving || deleting}
          >
            {isEditing ? "Cerrar edición" : "Editar pedido"}
          </button>

          <button
            type="button"
            className="button button-danger"
            onClick={deleteOrder}
            disabled={!canDelete || saving || deleting}
          >
            {deleting ? "Cancelando..." : "Cancelar pedido"}
          </button>
        </div>

        {!canEdit && (
          <p className="helper">Este estado ya no permite edición directa desde tu cuenta. Si necesitas cambios, contacta a Delifesti.</p>
        )}

        {!canDelete && <p className="helper">Este pedido ya no puede cancelarse desde tu cuenta.</p>}

        <p className="id-text">{order.id}</p>
      </section>

      {isEditing && (
        <section className="panel spacer-top">
          <h2>Editar pedido</h2>
          <p className="helper spacer-top">Guarda solo cuando termines. Al guardar, el pedido vuelve a revisión.</p>

          <div className="form">
            <div className="field">
              <label htmlFor="edit_has_final_image">¿Tienes imagen final lista?</label>
              <select
                id="edit_has_final_image"
                className="select"
                value={hasFinalImage}
                onChange={(e) => setHasFinalImage(e.target.value)}
              >
                <option value="no">No, solo ideas o referencias</option>
                <option value="yes">Sí, ya tengo el archivo final</option>
              </select>
            </div>

            <div className="field">
              <label htmlFor="edit_product_type">¿Qué vas a imprimir?</label>
              <select
                id="edit_product_type"
                className="select"
                value={productType}
                onChange={(e) => setProductType(e.target.value)}
              >
                <option value="pastel">Pastel</option>
                <option value="gelatina">Gelatina</option>
                <option value="cupcakes">Cupcakes</option>
                <option value="otro">Otro</option>
              </select>
            </div>

            <div className="field">
              <label htmlFor="edit_paper_type">Tipo de hoja</label>
              <select
                id="edit_paper_type"
                className="select"
                value={paperType}
                onChange={(e) => setPaperType(e.target.value)}
              >
                <option value="rice">Hoja de arroz ($50 por hoja)</option>
                <option value="sugar">Hoja de azúcar ($100 por hoja)</option>
              </select>
            </div>

            <div className="field">
              <label htmlFor="edit_shape">Forma</label>
              <select
                id="edit_shape"
                className="select"
                value={shape}
                onChange={(e) => {
                  const selectedShape = e.target.value;
                  setShape(selectedShape);
                  if (selectedShape === "circle") {
                    setHeightCm("");
                  }
                }}
              >
                <option value="circle">Círculo</option>
                <option value="rectangle">Rectángulo</option>
                <option value="custom">Personalizado</option>
              </select>
            </div>

            {shape === "circle" ? (
              <div className="field">
                <label htmlFor="edit_diameter_cm">Diámetro (cm)</label>
                <input
                  id="edit_diameter_cm"
                  className="input"
                  type="number"
                  step="0.1"
                  min="0"
                  value={widthCm}
                  onChange={(e) => setWidthCm(e.target.value)}
                />
              </div>
            ) : (
              <div className="two-cols">
                <div className="field">
                  <label htmlFor="edit_width_cm">Ancho (cm)</label>
                  <input
                    id="edit_width_cm"
                    className="input"
                    type="number"
                    step="0.1"
                    min="0"
                    value={widthCm}
                    onChange={(e) => setWidthCm(e.target.value)}
                  />
                </div>

                <div className="field">
                  <label htmlFor="edit_height_cm">Alto (cm)</label>
                  <input
                    id="edit_height_cm"
                    className="input"
                    type="number"
                    step="0.1"
                    min="0"
                    value={heightCm}
                    onChange={(e) => setHeightCm(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="field">
              <label htmlFor="edit_description">Descripción</label>
              <textarea
                id="edit_description"
                className="textarea"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="field">
              <label htmlFor="edit_notes">Notas adicionales</label>
              <textarea
                id="edit_notes"
                className="textarea"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div className="inline-actions">
              <button type="button" className="button button-primary" onClick={saveEdits} disabled={saving || deleting}>
                {saving ? "Guardando..." : "Guardar edición"}
              </button>

              <button
                type="button"
                className="button button-ghost"
                onClick={() => {
                  syncFormFromOrder(order);
                  setIsEditing(false);
                  setError("");
                }}
                disabled={saving || deleting}
              >
                Cancelar
              </button>
            </div>
          </div>
        </section>
      )}

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
