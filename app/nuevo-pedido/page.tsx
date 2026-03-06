"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type AuthStatus = "checking" | "ready";

type FormMessage = {
  type: "success" | "error";
  text: string;
} | null;

type AccountContact = {
  full_name: string;
  phone: string;
};

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export default function NewOrderPage() {
  const [authStatus, setAuthStatus] = useState<AuthStatus>("checking");
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<FormMessage>(null);
  const [accountContact, setAccountContact] = useState<AccountContact | null>(null);

  const [hasFinalImage, setHasFinalImage] = useState("no");
  const [productType, setProductType] = useState("pastel");
  const [shape, setShape] = useState("circle");
  const [widthCm, setWidthCm] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");

  const [finalFiles, setFinalFiles] = useState<File[]>([]);
  const [referenceFiles, setReferenceFiles] = useState<File[]>([]);

  useEffect(() => {
    (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData.session;
      const accessToken = session?.access_token ?? null;

      if (!accessToken || !session?.user) {
        window.location.href = "/login?next=/nuevo-pedido";
        return;
      }

      const metadata = session.user.user_metadata as { full_name?: string; phone?: string };
      const fullName = cleanText(metadata?.full_name);
      const phone = cleanText(metadata?.phone);

      if (!fullName || !phone) {
        setMessage({
          type: "error",
          text: "Tu cuenta no tiene nombre o telefono. Cierra sesion y registrate de nuevo con esos datos.",
        });
      } else {
        setAccountContact({ full_name: fullName, phone });
      }

      setToken(accessToken);
      setAuthStatus("ready");
    })();
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!token) {
      setMessage({ type: "error", text: "Tu sesion expiro. Inicia sesion de nuevo." });
      window.location.href = "/login?next=/nuevo-pedido";
      return;
    }

    if (!accountContact) {
      setMessage({
        type: "error",
        text: "Falta nombre o telefono en tu cuenta. No se puede crear el pedido.",
      });
      return;
    }

    setMessage(null);
    setLoading(true);

    const payload = {
      has_final_image: hasFinalImage === "yes",
      product_type: productType,
      shape,
      width_cm: widthCm ? Number(widthCm) : null,
      height_cm: heightCm ? Number(heightCm) : null,
      description,
      notes: notes.trim() ? notes : null,
    };

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = (await res.json()) as { error?: string; order?: { id: string } };
      if (!res.ok || !data.order?.id) {
        throw new Error(data.error || "No se pudo crear el pedido");
      }

      const orderId = data.order.id;

      async function uploadFiles(fileType: "final" | "reference", files: File[]) {
        const onlyReal = files.filter((file) => file && file.size > 0);
        if (onlyReal.length === 0) return;

        const fd = new FormData();
        fd.append("file_type", fileType);

        for (const file of onlyReal) {
          fd.append("files", file);
        }

        const uploadRes = await fetch(`/api/orders/${orderId}/files`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: fd,
        });

        const uploadData = (await uploadRes.json()) as { error?: string };
        if (!uploadRes.ok) {
          throw new Error(uploadData.error || `Error subiendo archivos ${fileType}`);
        }
      }

      await uploadFiles("final", finalFiles);
      await uploadFiles("reference", referenceFiles);

      setMessage({ type: "success", text: `Pedido creado con exito. ID: ${orderId}` });

      setHasFinalImage("no");
      setProductType("pastel");
      setShape("circle");
      setWidthCm("");
      setHeightCm("");
      setDescription("");
      setNotes("");
      setFinalFiles([]);
      setReferenceFiles([]);
    } catch (error) {
      const text = error instanceof Error ? error.message : "Ocurrio un error inesperado";
      setMessage({ type: "error", text });
    } finally {
      setLoading(false);
    }
  }

  if (authStatus !== "ready") {
    return (
      <main className="page-narrow">
        <section className="panel">
          <h1>Verificando sesion...</h1>
          <p className="helper spacer-top">Te redirigimos a login si hace falta autenticacion.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="page-narrow">
      <nav className="nav">
        <div className="brand">
          <span className="brand-dot" />
          <span>Delifesti</span>
        </div>
        <div className="nav-actions">
          <Link className="button button-secondary" href="/dashboard">
            Mis pedidos
          </Link>
        </div>
      </nav>

      <section className="panel">
        <h1>Nuevo pedido</h1>
        <p className="helper spacer-top">
          Tus datos de contacto se toman de tu cuenta para que todos tus pedidos queden consistentes.
        </p>

        {accountContact && (
          <div className="card spacer-top">
            <p>
              <strong>Nombre:</strong> {accountContact.full_name}
            </p>
            <p>
              <strong>Telefono:</strong> {accountContact.phone}
            </p>
          </div>
        )}

        <form onSubmit={onSubmit} className="form">
          <div className="field">
            <label htmlFor="has_final_image">Tienes imagen final lista?</label>
            <select
              id="has_final_image"
              className="select"
              value={hasFinalImage}
              onChange={(e) => setHasFinalImage(e.target.value)}
            >
              <option value="no">No, solo ideas o referencias</option>
              <option value="yes">Si, ya tengo el archivo final</option>
            </select>
          </div>

          <div className="field">
            <label htmlFor="product_type">Que vas a imprimir?</label>
            <select
              id="product_type"
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
            <label htmlFor="shape">Forma</label>
            <select
              id="shape"
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
              <option value="circle">Circulo</option>
              <option value="rectangle">Rectangulo</option>
              <option value="custom">Personalizado</option>
            </select>
          </div>

          {shape === "circle" ? (
            <div className="field">
              <label htmlFor="diameter_cm">Diametro (cm)</label>
              <input
                id="diameter_cm"
                className="input"
                type="number"
                step="0.1"
                value={widthCm}
                onChange={(e) => setWidthCm(e.target.value)}
              />
            </div>
          ) : (
            <div className="two-cols">
              <div className="field">
                <label htmlFor="width_cm">Ancho (cm)</label>
                <input
                  id="width_cm"
                  className="input"
                  type="number"
                  step="0.1"
                  value={widthCm}
                  onChange={(e) => setWidthCm(e.target.value)}
                />
              </div>

              <div className="field">
                <label htmlFor="height_cm">Alto (cm)</label>
                <input
                  id="height_cm"
                  className="input"
                  type="number"
                  step="0.1"
                  value={heightCm}
                  onChange={(e) => setHeightCm(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="field">
            <label htmlFor="description">Descripcion del pedido</label>
            <textarea
              id="description"
              className="textarea"
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="notes">Notas adicionales</label>
            <textarea
              id="notes"
              className="textarea"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="final_files">Archivos finales (si ya los tienes)</label>
            <input
              id="final_files"
              className="file-input"
              type="file"
              multiple
              accept="image/*"
              onChange={(e) => setFinalFiles(Array.from(e.target.files || []))}
            />
          </div>

          <div className="field">
            <label htmlFor="reference_files">Referencias o ideas (opcional)</label>
            <input
              id="reference_files"
              className="file-input"
              type="file"
              multiple
              accept="image/*"
              onChange={(e) => setReferenceFiles(Array.from(e.target.files || []))}
            />
          </div>

          <button type="submit" className="button button-primary" disabled={loading || !accountContact}>
            {loading ? "Enviando..." : "Enviar brief"}
          </button>
        </form>

        {message && (
          <p className={`notice ${message.type === "success" ? "notice-success" : "notice-error"}`}>
            {message.text}
          </p>
        )}
      </section>
    </main>
  );
}
