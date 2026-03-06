# UI y CSS Guidelines (Delifesti)

## Objetivo
Mantener una interfaz consistente, minimalista y moderna con bajo costo de mantenimiento.

## Estructura recomendada
- `app/globals.css`: tokens de diseno, reset, clases base reutilizables.
- Componentes/paginas nuevas: usar clases reutilizables (`.button`, `.panel`, `.field`) antes que estilos inline.
- Estilos especificos muy locales: usar CSS Modules por componente (ejemplo `Component.module.css`) si una vista crece.

## Tokens base
Siempre usar variables CSS para evitar hardcode:
- Color: `--primary`, `--text`, `--text-muted`, `--border`.
- Espaciado/radio: `--radius-*`.
- Elevacion: `--shadow-*`.

## Convenciones
- Evitar colores directos en JSX (`style={{ color: ... }}`), preferir clases.
- Evitar `font-family` por componente, usar la tipografia global en layout.
- Formularios: usar clases `.field`, `.input`, `.select`, `.textarea`.
- Botones: usar variantes (`.button-primary`, `.button-secondary`, `.button-ghost`).

## Accesibilidad minima
- Cada input debe tener `label` con `htmlFor`.
- Mantener contraste alto entre texto y fondo.
- Estados de focus visibles (`outline` con token de focus).
- Texto de botones siempre explicito (`Entrar`, `Enviar brief`).

## Flujo UX actual
- `/`: landing publica de marca.
- `/login`: autenticacion.
- `/nuevo-pedido`: formulario protegido por sesion.
- `/dashboard`: pedidos del cliente.
- `/admin`: gestion operativa.

## Checklist al crear nuevas vistas
1. Reusar tokens y clases existentes.
2. Validar responsive en movil y desktop.
3. Evitar estilos inline salvo casos muy puntuales.
4. Mantener tono de texto en espanol neutro y amigable.
5. Correr `npx tsc --noEmit` y `npm run lint`.
