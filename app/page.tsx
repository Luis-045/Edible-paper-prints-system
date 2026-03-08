import Link from "next/link";
import FloatingContact from "@/components/floating-contact";

const INSTAGRAM_URL = "https://www.instagram.com/delifesti/";
const BUSINESS_WHATSAPP = (process.env.NEXT_PUBLIC_BUSINESS_WHATSAPP || "").replace(/\D/g, "");
const WHATSAPP_URL = BUSINESS_WHATSAPP
  ? `https://wa.me/${BUSINESS_WHATSAPP}?text=${encodeURIComponent(
      "Hola Delifesti, quiero información sobre impresión transfer comestible."
    )}`
  : "";

export default function HomePage() {
  return (
    <main className="page">
      <nav className="nav">
        <div className="brand">
          <span className="brand-dot" />
          <span>Delifesti</span>
        </div>

        <div className="home-top-links">
          <a href="#tipos-hoja">Tipos de hoja</a>
          <a href="#como-funciona">Proceso de pedido y cotización</a>
          <a href="#sobre-delifesti">Delifesti</a>
        </div>

        <div className="nav-actions">
          <Link className="button button-primary" href="/login">
            Iniciar sesión
          </Link>
        </div>
      </nav>

      <section className="hero">
        <span className="eyebrow">Impresión transfer comestible especializada</span>
        <h1>Delifesti: transfer comestible para repostería y eventos.</h1>
        <p>
          Delifesti es un local de productos de repostería y fiesta. Aquí puedes enviar tu pedido, subir referencias y
          recibir seguimiento de tu cotización para impresión transfer en hoja de arroz o hoja de azúcar.
        </p>

        <div className="cta-row">
          <Link className="button button-primary" href="/login">
            Comenzar pedido
          </Link>
        </div>
      </section>

      <section id="tipos-hoja" className="panel stack spacer-top">
        <h2>Materiales para impresión transfer</h2>
        <p className="home-copy">Compara cada opción por calidad de impresión, costo y tipo de aplicación en repostería.</p>

        <div className="grid-3">
          <article className="card">
            <h3>Hoja de arroz - $50 MXN</h3>
            <p className="home-card-text">Ideal para pedidos de volumen y diseños simples con presupuesto controlado.</p>
          </article>
          <article className="card">
            <h3>Hoja de azúcar - $100 MXN</h3>
            <p className="home-card-text">Mejor definición y color para fotos, logos finos y acabados premium.</p>
          </article>
          <article className="card">
            <h3>¿Cuál elegir?</h3>
            <p className="home-card-text">
              Si priorizas costo, usa arroz. Si priorizas detalle visual y presentación final, usa azúcar.
            </p>
          </article>
        </div>
      </section>

      <section id="como-funciona" className="panel stack spacer-top">
        <h2>Proceso de pedido y cotización</h2>
        <div className="grid-3">
          <article className="card">
            <h3>1. Envías tu brief</h3>
            <p className="home-card-text">Define tamaño, forma, tipo de hoja y sube archivos o referencias.</p>
          </article>
          <article className="card">
            <h3>2. Revisamos tu pedido</h3>
            <p className="home-card-text">Delifesti valida diseño y calcula cuántas hojas se necesitan realmente.</p>
          </article>
          <article className="card">
            <h3>3. Recibes cotización</h3>
            <p className="home-card-text">Ves total y avance en tu dashboard antes de finalizar producción.</p>
          </article>
        </div>
      </section>

      <section id="sobre-delifesti" className="panel stack spacer-top">
        <h2>Delifesti: tienda y servicio especializado</h2>
        <p className="home-copy">
          Delifesti combina venta de insumos de repostería y fiesta con servicio de impresión transfer comestible,
          orientado a pastelerías, reposteros y clientes para eventos.
        </p>
        <p className="home-copy">
          Puedes ver trabajos y novedades en
          {" "}
          <a className="home-inline-link" href={INSTAGRAM_URL} target="_blank" rel="noreferrer">
            Instagram
          </a>
          .
        </p>
      </section>

      <FloatingContact whatsappUrl={WHATSAPP_URL} instagramUrl={INSTAGRAM_URL} />
    </main>
  );
}


