# System Architecture

## Overview

Next.js 16 App Router application backed by Supabase (PostgreSQL + Auth).
All business logic lives in the service layer — API routes and Server Components
never call Supabase directly.

## Layer separation

```
app/            → Route handlers and page components
components/     → UI (components/ui/) and domain components
services/       → All business logic
lib/supabase/   → Supabase client helpers
lib/permissions/→ RBAC role checks
lib/validators/ → Zod schemas shared between API routes and forms
types/          → Shared TypeScript types (database.types.ts is auto-generated)
```

## Route groups

| Group         | Path                                            | Description         |
| ------------- | ----------------------------------------------- | ------------------- |
| `(auth)`      | `/`, `/reset-password`                          | Public auth pages   |
| `(dashboard)` | `/dashboard`, `/movimientos`, `/solicitudes`, … | Protected app pages |

## Data flow — mutations

```
API route
  → validate session (Supabase server client)
  → validate body (Zod schema from lib/validators/)
  → call service
      → service uses Supabase server client
      → service calls auditoriaService (audit log)
  → (movements) call processMovimientoIntegrations
      → PDF via Google Apps Script
      → Sheets sync via Google Apps Script
      → Email notification via Resend
```

## Authentication

Supabase Auth with email/password (`signInWithPassword`).
No public sign-up — accounts are created by an ADMIN through the Users page.
Session is read server-side via `createServerClient()` from `lib/supabase/server.ts`.

## Authorization (RBAC)

Three roles enforced in `lib/permissions/rbac.ts`:

| Role       | Description                                                  |
| ---------- | ------------------------------------------------------------ |
| `ADMIN`    | Full access — user management, configuration, all operations |
| `OPERATOR` | Create and edit movements, fund requests, settlements        |
| `VIEWER`   | Read-only access to all modules                              |

Role is stored in `users.role` and checked at the API route level.
RLS (Row Level Security) is enabled on all tables.

## Supabase clients

| File                     | Client type                       | Used in                        |
| ------------------------ | --------------------------------- | ------------------------------ |
| `lib/supabase/server.ts` | SSR client (reads/writes cookies) | API routes, Server Components  |
| `lib/supabase/client.ts` | Browser client                    | Client Components              |
| `lib/supabase/admin.ts`  | Service role (bypasses RLS)       | User management, audit inserts |

## Folio system

Sequential numeric ID for movements stored in the `folio_counter` table (singleton row `id: 'main'`).
Incremented atomically via the `increment_and_get_folio()` Postgres RPC on each movement creation.
`folio_display` is a generated column (`lpad(folio::text, 6, '0')`).

## User creation

Admins call the `create_user_with_role(email, password, full_name, role)` Postgres RPC
via the service role client. Password hashing is handled inside the RPC via `pgcrypto`.

Bootstrap: call `create_initial_admin(email, password, full_name)` once from Supabase Studio SQL editor.

## Email

All transactional email is sent via **Resend** (`resend.com`).
No Gmail or SMTP credentials are stored in the application.

Services:

- `services/email/resend.service.ts` — movement notifications and auth emails (invite, reset)
- `services/email/workflow-emails.service.ts` — fund request workflow emails

See [email.md](email.md) for configuration and template details.

## Google integrations (optional)

Three outbound webhooks via Google Apps Script:

1. PDF generation + Google Drive storage
2. Email notification (legacy — superseded by Resend for transactional email)
3. Google Sheets sync

All triggered in `services/google/movement-postprocess.ts` after movement create/edit.
Integration state tracked on `movements` (`pdf_status`, `synced_to_sheet`, `notification_status`).

## Database schema

Migrations live in `supabase/migrations/`. Key tables:

| Table                | Description                           |
| -------------------- | ------------------------------------- |
| `users`              | App users with role                   |
| `movements`          | Income/expense records                |
| `movement_audit_log` | Audit trail for every movement change |
| `system_audit_log`   | System-wide audit events              |
| `folio_counter`      | Sequential folio singleton            |
| `intentions`         | Fund request intentions by ministry   |
| `budgets`            | Budget allocations by ministry        |
| `budget_periods`     | Budget periods                        |
| `ministries`         | Church ministries                     |
| `settlements`        | Post-transfer expense settlements     |

Always use `pnpm supabase migration new <name>` to create migrations.
Always run `pnpm types:generate` after schema changes.
