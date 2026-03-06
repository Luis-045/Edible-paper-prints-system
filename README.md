# Delifesti

Sistema full-stack para gestion de pedidos de impresion comestible.

Delifesti centraliza el flujo completo entre cliente y administrador: autenticacion, captura de brief, carga de archivos, seguimiento de estados y descarga segura de assets.

## Tabla de contenido
- [Resumen](#resumen)
- [Stack tecnico](#stack-tecnico)
- [Arquitectura funcional](#arquitectura-funcional)
- [Flujos por rol](#flujos-por-rol)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Requisitos](#requisitos)
- [Configuracion local](#configuracion-local)
- [Variables de entorno](#variables-de-entorno)
- [Scripts disponibles](#scripts-disponibles)
- [Testing y calidad](#testing-y-calidad)
- [API principal](#api-principal)
- [Modelo de datos esperado](#modelo-de-datos-esperado)
- [Seguridad implementada](#seguridad-implementada)
- [Versionado y tags](#versionado-y-tags)
- [Troubleshooting](#troubleshooting)
- [Roadmap recomendado](#roadmap-recomendado)

## Resumen
Objetivo del sistema:
- Recibir pedidos de clientes de forma estandarizada.
- Guardar archivos de referencia/finales de manera segura.
- Permitir gestion operativa eficiente por parte de admin.
- Mantener trazabilidad por estados y notas.

Estado actual destacado:
- Landing moderna de marca (`/`).
- Signup/Login con rol (`client`, `admin`).
- Captura de nombre y telefono en registro.
- Formulario de pedido protegido (`/nuevo-pedido`) usando datos de cuenta.
- Dashboard cliente con vistas Activos / Historial.
- Admin con tabs por estado, busqueda por cliente/telefono, paginacion y cambio rapido de estado.
- Suite de regresion automatica para APIs criticas.

## Stack tecnico
- Next.js 16 (App Router)
- React 19
- TypeScript (strict)
- Supabase
  - Auth
  - Postgres
  - Storage
- TailwindCSS v4 (base), con sistema de tokens CSS global
- Vitest para tests de API

## Arquitectura funcional
Capas principales:
1. **UI (App Router)**: paginas cliente/admin y formularios.
2. **API Routes (`app/api/...`)**: logica de negocio, validaciones y permisos.
3. **Integracion Supabase (`lib/...`)**:
   - `supabaseClient`: cliente browser (anon).
   - `supabaseAdmin`: cliente server con service role.
   - helpers de auth/roles (`authServer`, `requireAdmin`).

## Flujos por rol
### Cliente
1. Se registra (nombre + telefono + email + password).
2. Inicia sesion.
3. Crea pedido en `/nuevo-pedido`.
4. Consulta progreso en `/dashboard`.

### Admin
1. Inicia sesion con rol admin.
2. Gestiona cola en `/admin`:
   - Pendientes
   - Listos
   - Archivados
   - Todos
3. Actualiza estado rapido desde lista o detalle.
4. Revisa y descarga archivos con signed URLs.

## Estructura del proyecto
```txt
app/
  page.tsx                      # Landing
  login/page.tsx                # Auth
  nuevo-pedido/page.tsx         # Formulario cliente (autenticado)
  dashboard/page.tsx            # Lista cliente
  dashboard/orders/[id]/page.tsx
  admin/page.tsx                # Lista admin con filtros/paginacion
  admin/orders/[id]/page.tsx    # Detalle admin
  api/
    orders/route.ts
    orders/[id]/files/route.ts
    my/orders/route.ts
    my/orders/[id]/route.ts
    admin/orders/route.ts
    admin/orders/[id]/route.ts
    admin/orders/[id]/update/route.ts
    admin/files/[fileId]/signed-url/route.ts

lib/
  supabase.ts
  supabaseClient.ts
  authServer.ts
  requireAdmin.ts
  isAdminClient.ts
  apiErrors.ts

tests/api/
  orders-create.test.ts
  my-orders.test.ts
  order-files.test.ts
```

## Requisitos
- Node.js 20+
- npm 10+
- Proyecto Supabase configurado
- Bucket de storage para archivos de pedido (`order-files`)

## Configuracion local
1. Instalar dependencias:
```bash
npm install
```

2. Crear archivo `.env.local` en la raiz.

3. Levantar entorno de desarrollo:
```bash
npm run dev
```

4. Abrir:
- [http://localhost:3000](http://localhost:3000)

## Variables de entorno
Definir en `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

Notas:
- `SUPABASE_SERVICE_ROLE_KEY` solo se usa del lado servidor (API routes).
- Nunca exponer service role en cliente.

## Scripts disponibles
```bash
npm run dev         # desarrollo
npm run build       # build produccion
npm run start       # servir build
npm run lint        # lint
npm test            # tests (vitest run)
npm run test:watch  # tests en modo watch
```

## Testing y calidad
Comando recomendado antes de merge/deploy:
```bash
npx tsc --noEmit
npm run lint
npm test
```

Suite actual de regresion:
- Creacion de pedidos (`POST /api/orders`)
- Lectura de pedidos de cliente (`GET /api/my/orders`)
- Validaciones de upload (`POST /api/orders/:id/files`)

Los tests usan mocks, no escriben en base de datos real.

## API principal
### Cliente
- `POST /api/orders`
  - Crea pedido usando datos de contacto de la cuenta (metadata Auth).
- `POST /api/orders/:id/files`
  - Subida de archivos con validaciones de tipo/tamano/cantidad.
- `GET /api/my/orders`
  - Lista pedidos del cliente autenticado.
- `GET /api/my/orders/:id`
  - Detalle de pedido del cliente autenticado.

### Admin
- `GET /api/admin/orders`
  - Filtros soportados:
    - `view=pending|ready|archived|all`
    - `q=<texto>` (nombre o telefono)
    - `page`, `page_size`
- `GET /api/admin/orders/:id`
  - Detalle completo de pedido.
- `PATCH /api/admin/orders/:id/update`
  - Actualiza estado y notas.
- `GET /api/admin/files/:fileId/signed-url`
  - URL firmada temporal para preview/descarga.

## Modelo de datos esperado
Tablas principales (Supabase/Postgres):
- `profiles`
  - `id` (uuid, referencia a auth.users)
  - `email`
  - `role` (`client` | `admin`)
- `orders`
  - `id`
  - `user_id`
  - `status`
  - `contact_name`
  - `contact_channel`
  - `contact_value`
  - `product_type`
  - `shape`
  - `width_cm`, `height_cm`
  - `description`, `notes`
  - `admin_note`, `client_note`
  - `created_at`, `updated_at`
- `order_files`
  - `id`
  - `order_id`
  - `file_type` (`final` | `reference`)
  - `file_path`
  - `original_name`
  - `created_at`

Bucket de storage:
- `order-files`

## Seguridad implementada
- Validacion de JWT por header `Authorization: Bearer <token>` en API server.
- Guard `requireAdmin` para endpoints administrativos.
- Upload endurecido:
  - maximo de archivos por request
  - tamano maximo por archivo
  - allowlist MIME
- Signed URLs con expiracion para acceso temporal a archivos.
- Manejo de errores sanitizado (sin exponer detalles internos de DB).

## Versionado y tags
Se recomienda SemVer:
- `vMAJOR.MINOR.PATCH`

Ejemplos:
```bash
git tag -a v1.1.0 -m "Admin filters and quick status updates"
git push origin v1.1.0
```

## Troubleshooting
### 1) `EPERM` en `.next/trace` (Windows + OneDrive)
Si falla `next build` por permisos, limpiar cache local y reintentar:
```bash
# PowerShell
Remove-Item -Recurse -Force .next
npm run build
```

### 2) No aparecen pedidos en dashboard
- Verificar sesion activa.
- Revisar que el pedido se haya creado con el mismo usuario.
- Confirmar que metadata de usuario tenga nombre/telefono.

### 3) Upload rechazado
- Revisar tipo de archivo permitido (imagenes).
- Revisar tamano maximo por archivo.
- Revisar limite de cantidad por request.

## Roadmap recomendado
- Pantalla de perfil editable (nombre/telefono) para usuarios existentes.
- Notificaciones al cliente por cambio de estado.
- Exportacion CSV para operacion admin.
- CI (GitHub Actions) con `lint + typecheck + test` en PRs.

---

Si necesitas, puedo agregar en otro commit:
- diagrama de arquitectura,
- seccion de migraciones SQL,
- guia de despliegue paso a paso para Vercel + Supabase.
