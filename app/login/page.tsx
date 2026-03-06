"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type AuthMode = "login" | "signup";

type ProfileRole = {
  role: "admin" | "client";
};

function safeRedirectPath(raw: string | null) {
  if (!raw) return null;
  if (!raw.startsWith("/")) return null;
  if (raw.startsWith("//")) return null;
  return raw;
}

export default function LoginPage() {
  const searchParams = useSearchParams();
  const initialMode = searchParams.get("mode") === "signup" ? "signup" : "login";

  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const nextPath = useMemo(() => safeRedirectPath(searchParams.get("next")), [searchParams]);

  async function redirectByRole(userId: string) {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single<ProfileRole>();

    if (error || !profile?.role) {
      window.location.href = "/dashboard";
      return;
    }

    if (profile.role === "admin") {
      window.location.href = "/admin";
      return;
    }

    if (nextPath) {
      window.location.href = nextPath;
      return;
    }

    window.location.href = "/dashboard";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    setLoading(true);

    try {
      if (mode === "signup") {
        if (!fullName.trim()) throw new Error("El nombre es obligatorio.");
        if (!phone.trim()) throw new Error("El telefono es obligatorio.");

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName.trim(),
              phone: phone.trim(),
            },
          },
        });
        if (error) throw error;

        const user = data.user;
        if (!user) throw new Error("No se pudo obtener el usuario creado.");

        const { error: profileError } = await supabase.from("profiles").insert([
          {
            id: user.id,
            email: user.email,
            role: "client",
          },
        ]);

        if (profileError && !String(profileError.message).toLowerCase().includes("duplicate")) {
          throw profileError;
        }

        setMsg("Cuenta creada. Ahora inicia sesion.");
        setMode("login");
        setPassword("");
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      const userId = data.user?.id;
      if (!userId) throw new Error("No se pudo obtener el usuario.");

      await redirectByRole(userId);
    } catch (error) {
      const text = error instanceof Error ? error.message : "Error inesperado";
      setMsg(text);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page-narrow">
      <nav className="nav">
        <div className="brand">
          <span className="brand-dot" />
          <span>Delifesti</span>
        </div>
        <div className="nav-actions">
          <Link className="button button-ghost" href="/">
            Volver al inicio
          </Link>
        </div>
      </nav>

      <section className="panel">
        <h1>{mode === "login" ? "Iniciar sesion" : "Crear cuenta"}</h1>
        <p className="helper spacer-top">
          Accede para gestionar pedidos y revisar el avance de tus archivos.
        </p>

        <form onSubmit={handleSubmit} className="form">
          {mode === "signup" && (
            <>
              <div className="field">
                <label htmlFor="full_name">Nombre completo</label>
                <input
                  id="full_name"
                  className="input"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  type="text"
                />
              </div>

              <div className="field">
                <label htmlFor="phone">Telefono</label>
                <input
                  id="phone"
                  className="input"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  type="tel"
                  placeholder="Ej. 5512345678"
                />
              </div>
            </>
          )}

          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              type="email"
            />
          </div>

          <div className="field">
            <label htmlFor="password">Contraseña</label>
            <input
              id="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              type="password"
            />
          </div>

          <button type="submit" className="button button-primary" disabled={loading}>
            {loading ? "Procesando..." : mode === "login" ? "Entrar" : "Registrarme"}
          </button>
        </form>

        {msg && (
          <p className={`notice ${msg.toLowerCase().includes("creada") ? "notice-success" : "notice-error"}`}>
            {msg}
          </p>
        )}

        <div className="spacer-top">
          <button
            type="button"
            className="button button-secondary"
            onClick={() => {
              setMsg("");
              setMode(mode === "login" ? "signup" : "login");
            }}
          >
            {mode === "login" ? "No tengo cuenta" : "Ya tengo cuenta"}
          </button>
        </div>
      </section>
    </main>
  );
}
