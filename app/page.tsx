"use client";

import { useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function HomePage() {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  // Campos del brief
  const [contactName, setContactName] = useState("");
  const [contactChannel, setContactChannel] = useState("whatsapp");
  const [contactValue, setContactValue] = useState("");
  const [hasFinalImage, setHasFinalImage] = useState("no");
  const [productType, setProductType] = useState("pastel");
  const [shape, setShape] = useState("circle");
  const [widthCm, setWidthCm] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");

  // Archivos
  const [finalFiles, setFinalFiles] = useState<File[]>([]);
  const [referenceFiles, setReferenceFiles] = useState<File[]>([]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;

    if (!token) {
      setMsg("Inicia sesión para crear un pedido.");
      window.location.href = "/login";
      return;
    }

    setMsg("");
    setLoading(true);

    const payload = {
      contact_name: contactName,
      contact_channel: contactChannel,
      contact_value: contactValue,
      has_final_image: hasFinalImage === "yes",
      product_type: productType,
      shape,
      width_cm: widthCm ? Number(widthCm) : null,
      height_cm: heightCm ? Number(heightCm) : null,
      description,
      notes: notes.trim() ? notes : null,
    };

    try {
      // 1) Crear pedido
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "No se pudo crear el pedido");

      const orderId = data.order.id as string;

      // 2) Subir archivos si existen
      async function uploadFiles(fileType: "final" | "reference", files: File[]) {
        const onlyReal = files.filter((f) => f && f.size > 0);
        if (onlyReal.length === 0) return;

        const fd = new FormData();
        fd.append("file_type", fileType);

        for (const file of onlyReal) {
          fd.append("files", file);
        }

        const up = await fetch(`/api/orders/${orderId}/files`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
          },
          body: fd,
        });

        const upData = await up.json();
        if (!up.ok) throw new Error(upData?.error || `Error subiendo ${fileType}`);
      }

      await uploadFiles("final", finalFiles);
      await uploadFiles("reference", referenceFiles);

      setMsg(`Brief enviado. ID: ${orderId}`);

      // Reset del formulario
      setContactName("");
      setContactChannel("whatsapp");
      setContactValue("");
      setHasFinalImage("no");
      setProductType("pastel");
      setShape("circle");
      setWidthCm("");
      setHeightCm("");
      setDescription("");
      setNotes("");
      setFinalFiles([]);
      setReferenceFiles([]);
    } catch (err: any) {
      setMsg(err.message || "Error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 720, margin: "40px auto", padding: 16, fontFamily: "Arial" }}>
      <h1>Brief de impresión comestible</h1>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12, marginTop: 20 }}>
        <label>
          Nombre
          <input
            name="contact_name"
            required
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            style={{ width: "100%", padding: 8 }}
          />
        </label>

        <label>
          Medio de contacto
          <select
            name="contact_channel"
            value={contactChannel}
            onChange={(e) => setContactChannel(e.target.value)}
            style={{ width: "100%", padding: 8 }}
          >
            <option value="whatsapp">WhatsApp</option>
            <option value="email">Email</option>
          </select>
        </label>

        <label>
          WhatsApp o Email
          <input
            name="contact_value"
            required
            value={contactValue}
            onChange={(e) => setContactValue(e.target.value)}
            style={{ width: "100%", padding: 8 }}
          />
        </label>

        <label>
          ¿Tienes imagen final lista?
          <select
            name="has_final_image"
            value={hasFinalImage}
            onChange={(e) => setHasFinalImage(e.target.value)}
            style={{ width: "100%", padding: 8 }}
          >
            <option value="no">No, solo ideas/referencias</option>
            <option value="yes">Sí, ya tengo el archivo final</option>
          </select>
        </label>

        <label>
          ¿Qué vas a imprimir?
          <select
            name="product_type"
            value={productType}
            onChange={(e) => setProductType(e.target.value)}
            style={{ width: "100%", padding: 8 }}
          >
            <option value="pastel">Pastel</option>
            <option value="gelatina">Gelatina</option>
            <option value="cupcakes">Cupcakes</option>
            <option value="otro">Otro</option>
          </select>
        </label>

        <label>
          Forma
          <select
            name="shape"
            value={shape}
            onChange={(e) => setShape(e.target.value)}
            style={{ width: "100%", padding: 8 }}
          >
            <option value="circle">Círculo</option>
            <option value="rectangle">Rectángulo</option>
            <option value="custom">Personalizado</option>
          </select>
        </label>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <label>
            Diámetro o ancho (cm)
            <input
              name="width_cm"
              type="number"
              step="0.1"
              value={widthCm}
              onChange={(e) => setWidthCm(e.target.value)}
              style={{ width: "100%", padding: 8 }}
            />
          </label>

          <label>
            Alto (cm) si rectángulo
            <input
              name="height_cm"
              type="number"
              step="0.1"
              value={heightCm}
              onChange={(e) => setHeightCm(e.target.value)}
              style={{ width: "100%", padding: 8 }}
            />
          </label>
        </div>

        <label>
          Descripción
          <textarea
            name="description"
            required
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={{ width: "100%", padding: 8 }}
          />
        </label>

        <label>
          Notas (texto exacto, sin fondo, etc.)
          <textarea
            name="notes"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            style={{ width: "100%", padding: 8 }}
          />
        </label>

        <label>
          Archivos finales (si ya los tienes)
          <input
            name="final_files"
            type="file"
            multiple
            accept="image/*"
            onChange={(e) => setFinalFiles(Array.from(e.target.files || []))}
          />
        </label>

        <label>
          Referencias / ideas (opcional)
          <input
            name="reference_files"
            type="file"
            multiple
            accept="image/*"
            onChange={(e) => setReferenceFiles(Array.from(e.target.files || []))}
          />
        </label>

        <button type="submit" disabled={loading} style={{ padding: 10, cursor: "pointer" }}>
          {loading ? "Enviando..." : "Enviar brief"}
        </button>
      </form>

      {msg && <p style={{ marginTop: 16 }}>{msg}</p>}
    </main>
  );
}