import Link from "next/link";

export default function HomePage() {
  return (
    <main className="page">
      <nav className="nav">
        <div className="brand">
          <span className="brand-dot" />
          <span>Delifesti</span>
        </div>
        <div className="nav-actions">
          <Link className="button button-ghost" href="/login">
            Iniciar sesion
          </Link>
        </div>
      </nav>

      <section className="hero">
        <span className="eyebrow">Plataforma de briefs comestibles</span>
        <h1>Tu diseno listo para imprimir en minutos.</h1>
        <p>
          Delifesti simplifica el proceso de pedido: recibes briefs claros, archivos organizados y
          seguimiento del avance en un solo lugar.
        </p>

        <div className="cta-row">
          <Link className="button button-primary" href="/login">
            Iniciar sesion
          </Link>
          <Link className="button button-secondary" href="/login?mode=signup">
            Crear cuenta
          </Link>
          <Link className="button button-ghost" href="/nuevo-pedido">
            Nuevo pedido
          </Link>
        </div>
      </section>

      <section className="grid-3">
        <article className="card">
          <h3>1. Captura rapida</h3>
          <p>Completa el brief con medidas, formato y notas en una interfaz simple y limpia.</p>
        </article>
        <article className="card">
          <h3>2. Archivos seguros</h3>
          <p>Sube referencias o archivos finales con validaciones para mantener calidad y orden.</p>
        </article>
        <article className="card">
          <h3>3. Seguimiento claro</h3>
          <p>Consulta estado, notas y actualizaciones del pedido desde tu dashboard en tiempo real.</p>
        </article>
      </section>
    </main>
  );
}
