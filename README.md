# Delifesti

Delifesti is a full-stack platform for managing edible print orders end-to-end: customer intake, file handling, progress tracking, and admin operations.

## Overview
Delifesti is designed for operational reliability in a real business setting:
- Structured order intake
- Role-based access (customer/admin)
- Secure file access workflow
- Clear order lifecycle management
- Operational views for high-volume admin usage

## Core Capabilities
- Authentication and role-based routing
- Customer order creation and tracking
- Admin queue management with status workflows
- Filtered and paginated admin views
- File upload pipeline with validation controls
- Short-lived secure file links for access

## Technology Stack
- Next.js (App Router)
- React
- TypeScript
- Supabase (Auth, Database, Storage)
- Vitest (API regression tests)

## Repository Structure
```txt
app/
  page.tsx
  login/page.tsx
  nuevo-pedido/page.tsx
  dashboard/page.tsx
  dashboard/orders/[id]/page.tsx
  admin/page.tsx
  admin/orders/[id]/page.tsx
  api/

lib/
  auth and infrastructure helpers

tests/
  api regression tests
```

## Local Development
### Prerequisites
- Node.js 20+
- npm 10+
- Supabase project configured

### Install
```bash
npm install
```

### Environment
Create `.env.local`:
```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

### Run
```bash
npm run dev
```

## Available Scripts
```bash
npm run dev
npm run build
npm run start
npm run lint
npm test
npm run test:watch
```

## Quality Gate
Recommended pre-release check:
```bash
npx tsc --noEmit
npm run lint
npm test
```

## Testing Strategy
The project includes API regression tests focused on critical business flows:
- Order creation
- Customer order retrieval
- File upload validation

Tests run with mocks and are safe for local/CI execution.



