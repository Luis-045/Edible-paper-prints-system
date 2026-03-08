"use client";

import { useState } from "react";

type FloatingContactProps = {
  whatsappUrl?: string;
  instagramUrl: string;
};

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" width="22" height="22" fill="currentColor">
      <path d="M20.52 3.45A11.8 11.8 0 0 0 12.11 0C5.64 0 .37 5.27.37 11.74c0 2.06.54 4.08 1.56 5.86L0 24l6.58-1.9a11.7 11.7 0 0 0 5.53 1.41h.01c6.47 0 11.74-5.27 11.74-11.74a11.7 11.7 0 0 0-3.34-8.32Zm-8.41 18.08h-.01a9.9 9.9 0 0 1-5.04-1.37l-.36-.21-3.9 1.13 1.15-3.8-.23-.39a9.77 9.77 0 0 1-1.5-5.15C2.22 6.36 6.73 1.85 12.11 1.85c2.62 0 5.08 1.02 6.93 2.87a9.72 9.72 0 0 1 2.87 6.92c0 5.39-4.39 9.88-9.8 9.89Zm5.42-7.4c-.3-.15-1.78-.87-2.06-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.16-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.47-.89-.8-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.61-.92-2.21-.24-.58-.49-.5-.67-.5h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.49 0 1.46 1.07 2.88 1.22 3.08.15.2 2.1 3.2 5.09 4.49.71.31 1.27.49 1.7.63.72.23 1.37.2 1.89.12.58-.09 1.79-.73 2.04-1.43.25-.7.25-1.31.17-1.43-.07-.13-.27-.2-.57-.35Z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" width="22" height="22" fill="currentColor">
      <path d="M7.75 2h8.5A5.75 5.75 0 0 1 22 7.75v8.5A5.75 5.75 0 0 1 16.25 22h-8.5A5.75 5.75 0 0 1 2 16.25v-8.5A5.75 5.75 0 0 1 7.75 2Zm0 1.8A3.95 3.95 0 0 0 3.8 7.75v8.5a3.95 3.95 0 0 0 3.95 3.95h8.5a3.95 3.95 0 0 0 3.95-3.95v-8.5a3.95 3.95 0 0 0-3.95-3.95h-8.5Zm8.97 1.36a1.11 1.11 0 1 1 0 2.22 1.11 1.11 0 0 1 0-2.22ZM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 1.8a3.2 3.2 0 1 0 0 6.4 3.2 3.2 0 0 0 0-6.4Z" />
    </svg>
  );
}

export default function FloatingContact({ whatsappUrl, instagramUrl }: FloatingContactProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="floating-contact-wrap">
      <div className={`floating-contact-list ${open ? "floating-contact-list-open" : ""}`}>
        {whatsappUrl && (
          <a
            className="floating-contact-link"
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
            aria-label="WhatsApp"
            title="WhatsApp"
          >
            <WhatsAppIcon />
          </a>
        )}

        <a
          className="floating-contact-link"
          href={instagramUrl}
          target="_blank"
          rel="noreferrer"
          aria-label="Instagram"
          title="Instagram"
        >
          <InstagramIcon />
        </a>
      </div>

      <button
        type="button"
        className={`floating-contact-toggle ${open ? "floating-contact-toggle-open" : ""}`}
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-label={open ? "Cerrar contactos" : "Abrir contactos"}
      >
        <span className="floating-contact-toggle-text">Contáctanos</span>
        <span className="floating-contact-toggle-icon" aria-hidden="true">
          ✕
        </span>
      </button>
    </div>
  );
}
