import Link from "next/link";
import FloatingContact from "@/components/floating-contact";
import HeroCarousel from "@/components/hero-carousel";

const INSTAGRAM_URL = "https://www.instagram.com/delifesti/";
const BUSINESS_WHATSAPP = (process.env.NEXT_PUBLIC_BUSINESS_WHATSAPP || "").replace(/\D/g, "");
const WHATSAPP_URL = BUSINESS_WHATSAPP
  ? `https://wa.me/${BUSINESS_WHATSAPP}?text=${encodeURIComponent(
      "Hola Delifesti, quiero información sobre impresión transfer comestible."
    )}`
  : "";

const products = [
  {
    title: "Hoja de azúcar",
    price: "$99 MXN",
    imageSrc: "/hoja-azucar.jpg",
    accent: "home-product-card-pink",
    description: "Acabado premium para fotos, personajes, logos finos y diseños con color intenso.",
  },
  {
    title: "Hoja de arroz",
    price: "$50 MXN",
    imageSrc: "/hoja-arroz.jpg",
    accent: "home-product-card-blue",
    description: "Una opción práctica para pedidos de volumen, etiquetas comestibles y diseños sencillos.",
  },
];

const heroImages = [
  { src: "/hero-1.jpeg", alt: "Impresión comestible personalizada con osito y globos" },
  { src: "/hero-2.jpeg", alt: "Impresión comestible de cumpleaños con dinosaurio" },
  { src: "/hero-3.jpeg", alt: "Impresión comestible de abejitas para repostería" },
];

const steps = [
  ["1. Envías tu idea", "Sube referencias, tamaño, forma y tipo de hoja."],
  ["2. Revisamos tu pedido", "Validamos diseño, calidad y acomodo de impresión."],
  ["3. Recibes cotización", "Ves el total y seguimiento desde tu dashboard."],
];

export default function HomePage() {
  return (
    <main className="home-page">
      <nav className="home-nav" aria-label="Principal">
        <a className="home-brand" href="#inicio" aria-label="Delifesti inicio">
          <img className="home-brand-logo" src="/delifesti-logo.jpg" alt="Deli Festi" />
        </a>

        <div className="home-top-links">
          <a href="#materiales">Materiales</a>
          <a href="#proceso">Proceso</a>
          <Link href="/login">Iniciar pedido</Link>
        </div>

        <Link className="button button-primary home-nav-button" href="/login">
          Iniciar sesión
        </Link>
      </nav>

      <section id="inicio" className="home-hero">
        <div className="home-hero-copy">
          <span className="eyebrow">Impresión transfer comestible personalizada</span>
          <h1>Diseños comestibles para tus postres</h1>
          <p>
            En Delifesti preparamos impresiones en hoja de arroz y hoja de azúcar para pasteles, cupcakes,
            galletas, logos y celebraciones. El precio incluye el diseño personalizado.
          </p>

          <div className="cta-row">
            <Link className="button button-primary" href="/login">
              Comenzar pedido
            </Link>
            <a className="button button-secondary" href="#materiales">
              Ver materiales
            </a>
          </div>
        </div>

        <div className="home-hero-visual" aria-label="Muestras reales de impresión comestible Delifesti">
          <HeroCarousel images={heroImages} />
        </div>
      </section>

      <section id="proceso" className="home-steps" aria-labelledby="home-steps-title">
        <h2 id="home-steps-title">Proceso de pedido y cotización</h2>
        <div className="home-steps-grid">
          {steps.map(([title, copy]) => (
            <article className="home-step-card" key={title}>
              <h3>{title}</h3>
              <p>{copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="materiales" className="home-section">
        <div className="home-section-heading">
          <p>Materiales</p>
          <h2>Elige la hoja ideal para tu diseño.</h2>
        </div>

        <div className="home-product-grid">
          {products.map((product) => (
            <article className={`home-product-card ${product.accent}`} key={product.title}>
              <div className="home-product-top">
                <div>
                  <h3>{product.title}</h3>
                  <p>El precio incluye el diseño personalizado.</p>
                </div>
                <strong>{product.price}</strong>
              </div>
              <img className="home-product-photo" src={product.imageSrc} alt={product.title} />
              <p className="home-product-description">{product.description}</p>
            </article>
          ))}
        </div>
      </section>

      <FloatingContact whatsappUrl={WHATSAPP_URL} instagramUrl={INSTAGRAM_URL} />
    </main>
  );
}
