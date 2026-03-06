"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function redirectByRole(userId: string) {
    // leer rol desde profiles
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();

    // si por alguna razón no existe profile, manda al home
    if (error || !profile?.role) {
      window.location.href = "/";
      return;
    }

    if (profile.role === "admin") {
      window.location.href = "/admin";
    } else {
      window.location.href = "/";
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    setLoading(true);

    try {
      if (mode === "signup") {
        // REGISTRO
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;

        const user = data.user;
        if (!user) throw new Error("No se pudo obtener el usuario creado.");

        // crear perfil (si falla por duplicado, no pasa nada grave)
        const { error: profileError } = await supabase
          .from("profiles")
          .insert([
            {
              id: user.id,
              email: user.email,
              role: "client",
            },
          ]);

        // Si ya existe profile (por ejemplo reintento), ignoramos error de duplicado
        if (profileError && !String(profileError.message).toLowerCase().includes("duplicate")) {
          throw profileError;
        }

        setMsg("Cuenta creada. Ahora inicia sesión.");
        setMode("login");
        setPassword("");
        return;
      }

      //LOGIN
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;

      const userId = data.user?.id;
      if (!userId) throw new Error("No se pudo obtener el usuario.");

      // ✅ redirigir según role
      await redirectByRole(userId);
    } catch (err: any) {
      setMsg(err.message || "Error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 520, margin: "40px auto", padding: 16, fontFamily: "Arial" }}>
      <h1>{mode === "login" ? "Iniciar sesión" : "Crear cuenta"}</h1>

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12, marginTop: 16 }}>
        <label>
          Email
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            type="email"
            style={{ width: "100%", padding: 8 }}
          />
        </label>

        <label>
          Contraseña
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            type="password"
            style={{ width: "100%", padding: 8 }}
          />
        </label>

        <button type="submit" disabled={loading} style={{ padding: 10, cursor: "pointer" }}>
          {loading ? "..." : mode === "login" ? "Entrar" : "Registrarme"}
        </button>
      </form>

      {msg && <p style={{ marginTop: 12 }}>{msg}</p>}

      <button
        type="button"
        onClick={() => {
          setMsg("");
          setMode(mode === "login" ? "signup" : "login");
        }}
        style={{ marginTop: 16, padding: 10, cursor: "pointer" }}
      >
        {mode === "login" ? "No tengo cuenta" : "Ya tengo cuenta"}
      </button>
    </main>
  );
}