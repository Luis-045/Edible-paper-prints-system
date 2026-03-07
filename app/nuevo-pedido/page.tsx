"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type AuthStatus = "checking" | "ready";
type Step = 1 | 2 | 3;

type FormMessage = {
  type: "success" | "error";
  text: string;
} | null;

type AccountContact = {
  full_name: string;
  phone: string;
};

const BUSINESS_WHATSAPP = (process.env.NEXT_PUBLIC_BUSINESS_WHATSAPP || "").replace(/\D/g, "");

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function buildWhatsappMessage(params: {
  contact: AccountContact;
  hasFinalImage: string;
  productType: string;
  shape: string;
  widthCm: string;
  heightCm: string;
  description: string;
  notes: string;
  finalFilesCount: number;
  referenceFilesCount: number;
}) {
  const { contact, hasFinalImage, productType, shape, widthCm, heightCm, description, notes, finalFilesCount, referenceFilesCount } = params;

  const sizeText =
    shape === "circle"
      ? `Diametro: ${widthCm || "sin definir"} cm`
      : `Tamano: ${widthCm || "?"} x ${heightCm || "?"} cm`;

  return [
    "Hola Delifesti, quiero hacer un pedido de impresion comestible:",
    "",
    `Cliente: ${contact.full_name}`,
    `Telefono: ${contact.phone}`,
    `Tipo de producto: ${productType}`,
    `Forma: ${shape}`,
    sizeText,
    `Imagen final lista: ${hasFinalImage === "yes" ? "Si" : "No"}`,
    `Descripcion: ${description || "sin descripcion"}`,
    `Notas: ${notes || "sin notas"}`,
    `Archivos finales: ${finalFilesCount}`,
    `Archivos de referencia: ${referenceFilesCount}`,
  ].join("\n");
}

export default function NewOrderPage() {
  const [authStatus, setAuthStatus] = useState<AuthStatus>("checking");
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<FormMessage>(null);
  const [accountContact, setAccountContact] = useState<AccountContact | null>(null);

  const [step, setStep] = useState<Step>(1);

  const [hasFinalImage, setHasFinalImage] = useState("no");
  const [productType, setProductType] = useState("pastel");
  const [shape, setShape] = useState("circle");
  const [widthCm, setWidthCm] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");

  const [finalFiles, setFinalFiles] = useState<File[]>([]);
  const [referenceFiles, setReferenceFiles] = useState<File[]>([]);

  const [copyStatus, setCopyStatus] = useState("");

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

  const whatsappMessage = useMemo(
    () =>
      accountContact
        ? buildWhatsappMessage({
            contact: accountContact,
            hasFinalImage,
            productType,
            shape,
            widthCm,
            heightCm,
            description,
            notes,
            finalFilesCount: finalFiles.length,
            referenceFilesCount: referenceFiles.length,
          })
        : "",
    [accountContact, hasFinalImage, productType, shape, widthCm, heightCm, description, notes, finalFiles, referenceFiles]
  );

  const whatsappLink = useMemo(() => {
    if (!BUSINESS_WHATSAPP || !whatsappMessage) return "";
    return `https://wa.me/${BUSINESS_WHATSAPP}?text=${encodeURIComponent(whatsappMessage)}`;
  }, [whatsappMessage]);

  function validateStep1() {
    if (!description.trim()) {
      setMessage({ type: "error", text: "Agrega una descripcion para continuar." });
      return false;
    }

    if (!widthCm.trim()) {
      setMessage({ type: "error", text: shape === "circle" ? "Indica el diametro." : "Indica el ancho." });
      return false;
    }

    if (shape !== "circle" && !heightCm.trim()) {
      setMessage({ type: "error", text: "Indica el alto para esa forma." });
      return false;
    }

    return true;
  }

  function goNext() {
    setMessage(null);

    if (step === 1 && !validateStep1()) {
      return;
    }

    setStep((prev) => (prev < 3 ? ((prev + 1) as Step) : prev));
  }

  function goBack() {
    setMessage(null);
    setStep((prev) => (prev > 1 ? ((prev - 1) as Step) : prev));
  }

  async function copyWhatsappMessage() {
    try {
      await navigator.clipboard.writeText(whatsappMessage);
      setCopyStatus("Mensaje copiado. Puedes pegarlo en WhatsApp Web.");
    } catch {
      setCopyStatus("No se pudo copiar automaticamente. Selecciona y copia manualmente el texto.");
    }
  }

  async function createOrder() {
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

      setMessage({ type: "success", text: `Pedido enviado con exito. ID: ${orderId}` });

      setStep(1);
      setHasFinalImage("no");
      setProductType("pastel");
      setShape("circle");
      setWidthCm("");
      setHeightCm("");
      setDescription("");
      setNotes("");
      setFinalFiles([]);
      setReferenceFiles([]);
      setCopyStatus("");
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

      <section className="panel stack">
        <h1>Crear pedido</h1>
        <p className="helper">Completa 3 pasos. Te tomara menos de 2 minutos.</p>

        <div className="stepper">
          <div className={`step-pill ${step >= 1 ? "step-pill-active" : ""}`}>1. Datos</div>
          <div className={`step-pill ${step >= 2 ? "step-pill-active" : ""}`}>2. Archivos</div>
          <div className={`step-pill ${step >= 3 ? "step-pill-active" : ""}`}>3. Confirmar</div>
        </div>

        {accountContact && (
          <div className="card">
            <p>
              <strong>Nombre:</strong> {accountContact.full_name}
            </p>
            <p>
              <strong>Telefono:</strong> {accountContact.phone}
            </p>
          </div>
        )}

        {step === 1 && (
          <div className="stack">
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
                <p className="helper">Ejemplo: 20 cm</p>
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
              <label htmlFor="description">Que necesitas exactamente?</label>
              <textarea
                id="description"
                className="textarea"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              <p className="helper">Ejemplo: Tema Spiderman, fondo azul, texto Feliz Cumple Mateo</p>
            </div>

            <div className="field">
              <label htmlFor="notes">Notas adicionales (opcional)</label>
              <textarea
                id="notes"
                className="textarea"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="stack">
            <div className="upload-help-card">
              <p className="upload-help-title">Guia rapida de archivos</p>
              <ul className="upload-help-list">
                <li>Formatos recomendados: JPG, PNG o WEBP.</li>
                <li>Maximo 8 archivos por envio.</li>
                <li>Tamano maximo: 10 MB por archivo.</li>
                <li>Si tienes duda, sube referencia y nosotros te guiamos.</li>
              </ul>
            </div>

            <div className="field">
              <label htmlFor="final_files">Archivos finales (opcional)</label>
              <input
                id="final_files"
                className="file-input"
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => setFinalFiles(Array.from(e.target.files || []))}
              />
              <p className="helper">Si ya tienes arte final, subelo aqui.</p>
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
              <p className="helper">Puedes subir capturas de WhatsApp, JPG o PNG.</p>
            </div>

            <div className="upload-count-row">
              <span className="upload-chip">Finales: {finalFiles.length}</span>
              <span className="upload-chip">Referencias: {referenceFiles.length}</span>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="stack">
            <div className="card">
              <p>
                <strong>Resumen del pedido</strong>
              </p>
              <p>Producto: {productType}</p>
              <p>Forma: {shape}</p>
              <p>
                Tamano: {shape === "circle" ? `${widthCm || "?"} cm de diametro` : `${widthCm || "?"} x ${heightCm || "?"} cm`}
              </p>
              <p>Imagen final lista: {hasFinalImage === "yes" ? "Si" : "No"}</p>
              <p>Descripcion: {description}</p>
              <p>Notas: {notes || "Sin notas"}</p>
            </div>

            <div className="stack">
              <p className="helper">
                Tienes dudas del proceso? Podemos ayudarte por WhatsApp.
              </p>

              <div className="inline-actions">
                <a
                  className="button button-ghost"
                  href={whatsappLink || "#"}
                  target="_blank"
                  rel="noreferrer"
                  aria-disabled={!whatsappLink}
                  onClick={(e) => {
                    if (!whatsappLink) {
                      e.preventDefault();
                      setCopyStatus("Configura NEXT_PUBLIC_BUSINESS_WHATSAPP para habilitar este boton.");
                    }
                  }}
                >
                  Hablar por WhatsApp
                </a>

                <button type="button" className="button button-ghost" onClick={copyWhatsappMessage}>
                  Copiar mensaje
                </button>
              </div>

              <p className="helper">En desktop, si no abre WhatsApp Web, copia y pega el mensaje manualmente.</p>

              {copyStatus && <p className="helper">{copyStatus}</p>}
            </div>
          </div>
        )}

        <div className="wizard-actions">
          <button type="button" className="button button-ghost" onClick={goBack} disabled={step === 1 || loading}>
            Atras
          </button>

          {step < 3 ? (
            <button type="button" className="button button-primary" onClick={goNext} disabled={loading}>
              Siguiente
            </button>
          ) : (
            <button type="button" className="button button-primary" onClick={createOrder} disabled={loading || !accountContact}>
              {loading ? "Enviando..." : "Enviar pedido"}
            </button>
          )}
        </div>

        {message && (
          <p className={`notice ${message.type === "success" ? "notice-success" : "notice-error"}`}>
            {message.text}
          </p>
        )}
      </section>
    </main>
  );
}
