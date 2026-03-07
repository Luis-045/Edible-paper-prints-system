"use client";

import { Suspense, useMemo, useState } from "react";
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

function mapAuthErrorMessage(message: string) {
  const lower = message.toLowerCase();

  if (lower.includes("email not confirmed") || lower.includes("email_not_confirmed")) {
    return "Tu correo aún no está verificado. Revisa tu bandeja y confirma tu cuenta.";
  }

  if (lower.includes("invalid login credentials")) {
    return "Email o contraseña incorrectos.";
  }

  if (lower.includes("user already registered")) {
    return "Este correo ya está registrado. Intenta iniciar sesión.";
  }

  if (lower.includes("error occurred")) {
    return "Ocurrió un problema al procesar la solicitud. Intenta de nuevo en unos segundos.";
  }

  if (lower.includes("rate limit")) {
    return "Intentaste demasiadas veces. Espera unos minutos antes de reenviar otro correo.";
  }

  return message;
}

function LoginContent() {
  const searchParams = useSearchParams();
  const initialMode = searchParams.get("mode") === "signup" ? "signup" : "login";

  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const [pendingVerificationEmail, setPendingVerificationEmail] = useState("");
  const [showVerificationGuide, setShowVerificationGuide] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  const nextPath = useMemo(() => safeRedirectPath(searchParams.get("next")), [searchParams]);

  async function redirectByRole(userId: string, userEmail?: string) {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle<ProfileRole>();

    if (error) {
      window.location.href = "/dashboard";
      return;
    }

    let role = profile?.role;

    if (!role && userEmail) {
      const { error: createProfileError } = await supabase.from("profiles").insert([
        {
          id: userId,
          email: userEmail,
          role: "client",
        },
      ]);

      if (createProfileError && !String(createProfileError.message).toLowerCase().includes("duplicate")) {
        window.location.href = "/dashboard";
        return;
      }

      role = "client";
    }

    if (role === "admin") {
      window.location.href = "/admin";
      return;
    }

    if (nextPath) {
      window.location.href = nextPath;
      return;
    }

    window.location.href = "/dashboard";
  }

  async function resendVerificationEmail() {
    if (!pendingVerificationEmail) {
      setMsg("Primero regístrate para reenviar la verificación.");
      return;
    }

    setResendLoading(true);

    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: pendingVerificationEmail,
        options: {
          emailRedirectTo: typeof window !== "undefined" ? `${window.location.origin}/login` : undefined,
        },
      });

      if (error) {
        throw error;
      }

      setMsg("Te reenviamos el correo de verificación. Revisa bandeja de entrada y spam.");
    } catch (error) {
      const text = error instanceof Error ? mapAuthErrorMessage(error.message) : "No se pudo reenviar el correo";
      setMsg(text);
    } finally {
      setResendLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    setLoading(true);

    try {
      if (mode === "signup") {
        if (!fullName.trim()) throw new Error("El nombre es obligatorio.");
        if (!phone.trim()) throw new Error("El teléfono es obligatorio.");

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName.trim(),
              phone: phone.trim(),
            },
            emailRedirectTo: typeof window !== "undefined" ? `${window.location.origin}/login` : undefined,
          },
        });

        if (error) throw error;

        const user = data.user;
        if (!user) throw new Error("No se pudo obtener el usuario creado.");

        setPendingVerificationEmail(email.trim());
        setShowVerificationGuide(true);
        setMsg("Cuenta creada. Revisa tu correo y confirma tu cuenta antes de iniciar sesión.");
        setMode("login");
        setPassword("");
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      const userId = data.user?.id;
      if (!userId) throw new Error("No se pudo obtener el usuario.");

      await redirectByRole(userId, data.user?.email ?? email);
    } catch (error) {
      const text = error instanceof Error ? mapAuthErrorMessage(error.message) : "Error inesperado";
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
        <h1>{mode === "login" ? "Iniciar sesión" : "Crear cuenta"}</h1>
        <p className="helper spacer-top">Accede para gestionar pedidos y revisar el avance de tus archivos.</p>

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
                <label htmlFor="phone">Teléfono</label>
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
          <p
            className={`notice ${(msg.toLowerCase().includes("cuenta creada") || msg.toLowerCase().includes("te reenviamos")) ? "notice-success" : "notice-error"}`}
          >
            {msg}
          </p>
        )}

        {showVerificationGuide && pendingVerificationEmail && (
          <div className="notice spacer-top">
            <p>
              Siguiente paso: revisa tu correo <strong>{pendingVerificationEmail}</strong> y abre el enlace de
              verificación.
            </p>
            <p className="helper spacer-top">
              Si no lo ves en 1-2 minutos, revisa tu carpeta de spam o correo no deseado.
            </p>
            <div className="spacer-top">
              <button
                type="button"
                className="button button-ghost"
                onClick={resendVerificationEmail}
                disabled={resendLoading}
              >
                {resendLoading ? "Reenviando..." : "Reenviar correo de verificación"}
              </button>
            </div>
          </div>
        )}

        <div className="spacer-top">
          <button
            type="button"
            className="button button-secondary"
            onClick={() => {
              setMsg("");
              setShowVerificationGuide(false);
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

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="page-narrow" />}>
      <LoginContent />
    </Suspense>
  );
}


