# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
pnpm dev

# Type checking
pnpm typecheck

# Lint (zero warnings enforced)
pnpm lint
pnpm lint:fix

# CI (lint + typecheck)
pnpm run ci

# Tests (jest, passWithNoTests — allowed to fail)
pnpm test

# Supabase local stack (CLI is a devDependency)
pnpm supabase <sub command>      # e.g. pnpm supabase status, pnpm supabase db reset

# Regenerate DB types from local Supabase
pnpm types:generate

# React Email dev server (emails/ directory, port 3001)
pnpm email:dev
```

Always use `pnpm`, never `npm`.

`pnpm run ci` runs lint + typecheck. There are no mandatory automated tests yet — jest is configured with `--passWithNoTests`.

## Feature flags

`lib/feature-flags.ts` exposes `FEATURES`. Currently **disabled**: `budget` (`/budget`) and `requests` (`/requests`, intentions/approval workflow). Disabled features are hidden from the sidebar and their pages redirect to `/dashboard`. The underlying services, API routes, and DB tables remain in place — do not delete them; re-enable by flipping the flag.

## Architecture

**Stack:** Next.js 16 App Router · TypeScript strict · Tailwind CSS v4 · Supabase (Postgres + Auth) · `@supabase/ssr` · React Hook Form + Zod · Recharts · shadcn-style components on Base UI · Resend (email)

**Layer separation:**

- `app/` — Route handlers and page components. `(dashboard)` route group pages: `dashboard`, `movements` (+ `new`, `[id]`, `[id]/edit`), `settlements` (Rendición de Boletas), `ministries` (+ `[id]`), `users`, `audit`, `settings`, `profile`, `voucher-book` (quick income/expense entry form, not linked in sidebar), and the flag-disabled `budget` and `requests`.
- `app/actions/` — Server actions (auth, movements, invoices, users, ministries, budget, requests, settings, permissions, theme).
- `app/api/` — API routes (movements, invoices, users, ministries, budget-periods, budgets, requests, ministry-settlements, notifications, reminders, settings, auth, attachments, dashboard).
- `components/` — UI (`components/ui/`) and domain components (`components/movements/`, `components/dashboard/`, `components/settlements/`, etc.)
- `services/` — All business logic. Never call the Supabase client directly from API routes or server actions; use the service layer.
- `lib/supabase/` — Supabase client helpers:
  - `server.ts` — SSR client (reads/writes cookies, used in API routes and Server Components); also exports `getCurrentUser()`
  - `client.ts` — browser client (used in Client Components)
  - `admin.ts` — service role client (bypasses RLS; used only for user management and audit inserts)
- `lib/permissions/rbac.ts` — permission checks: `can(user.permissions, PERMISSIONS.X)`. Permissions are granted per role via the `role_permissions` table.
- `lib/validators/` — Zod schemas shared between API routes and forms
- `lib/feature-flags.ts` — feature flags (see above)
- `proxy.ts` — route protection (Next.js 16 convention); unauthenticated requests redirect to `/`
- `types/` — Shared TypeScript types; `types/database.types.ts` is auto-generated (do not edit manually)

**Roles:** four roles: `ADMIN`, `BURSAR` (tesorero), `FINANCE` (comisión de finanzas), `MINISTER` (encargado de ministerio). Authorization is permission-based, not role-name-based: check `can(permissions, PERMISSIONS.X)`, never compare role strings in business logic. Sidebar visibility does use role names (`components/dashboard/app-sidebar.tsx`).

**Data flow for mutations:**
API route or server action → reads Supabase session → validates with Zod schema from `lib/validators/` → calls service → service uses Supabase server client → service calls `auditService` for audit log → movement mutations then call `processMovementIntegrations` (PDF/Sheet/email via Google Apps Script webhooks).

**Auth:**
Supabase Auth with email/password (`signInWithPassword`). No public sign-up — accounts are created by an ADMIN via the users management page; the invited user receives an email (Resend) and activates via `/activate`. Password reset via `/api/auth/forgot-password`. Session is read server-side via `createServerClient()` from `lib/supabase/server.ts`.

**Folio system:**
Sequential numeric ID stored in the `folio_counter` table (singleton row `id: 'main'`). Incremented atomically via the `increment_and_get_folio()` Postgres RPC on each movement creation. `folio_display` is a generated column (`lpad(folio::text, 6, '0')`).

**Invoice settlement (Rendición de Boletas):**
`invoices` table stores receipts submitted for monthly settlement. Status enum: `PENDING` | `SETTLED`. No physical deletion. API: `GET /api/invoices`, `POST /api/invoices`, `PATCH /api/invoices/[id]`. Service: `services/invoices/invoices.service.ts`. Validator: `lib/validators/invoice.ts`. Page: `app/(dashboard)/settlements/page.tsx` (route `/settlements`).

**Ministries:**
`ministries` + `ministry_assignments` tables; a MINISTER user is assigned to a ministry. Managed at `/ministries`. Used by the (currently disabled) budget/requests workflow.

**Budget & requests workflow (disabled by feature flag):**
`budget_periods`, `ministry_budgets`, `budget_intentions`, `intention_transfers`, `expense_settlements`, `request_comments` tables. Ministers submit spending intentions against their ministry budget; BURSAR/FINANCE review, transfer funds, and ministers later settle expenses. Services: `services/budget/`, `services/intentions/`, `services/settlements/`. Keep this code compiling but do not surface it in the UI while the flags are off.

**Google integrations:**
Outbound webhooks via Google Apps Script (configured via env vars): PDF generation + Drive storage and Google Sheets sync. Triggered in `services/google/movement-postprocess.ts` after a movement is created/edited. Email notifications go through Resend (`services/email/`), with React Email templates in `emails/`. Integration state tracked on `movements` (`pdf_status`, `synced_to_sheet`, `notification_status`, etc.).

**Database schema:**
Migrations live in `supabase/migrations/`. Key tables: `users`, `role_permissions`, `movements`, `movement_audit_log`, `system_audit_log`, `folio_counter`, `invoices`, `ministries`, `ministry_assignments`, `budget_periods`, `ministry_budgets`, `budget_intentions`, `intention_transfers`, `expense_settlements`, `request_comments`, `app_settings`, `rate_limits`. All tables have RLS enabled. Run `pnpm supabase db reset` to wipe and re-apply from scratch locally.

Always use `pnpm supabase migration new ...` for new migrations

Always make sure that types are up to date with `pnpm types:generate`

## Key conventions

- Always use `pnpm`, never `npm` or `yarn`.
- All Zod schemas live in `lib/validators/` and are shared between API routes and forms.
- UI components in `components/ui/` are shadcn-style built on `@base-ui/react` (not Radix). Don't swap to Radix primitives.
- No deletions: `movements` records are logically cancelled (`status: 'CANCELLED'`) with `cancellation_reason`. Physical deletion is not supported.
- Every mutation on a movement must insert a `movement_audit_log` entry via `auditService`. Use the service role client for audit inserts (bypasses RLS).
- **Language rule:** All code identifiers, DB column names, table names, enum values, file/folder names, API routes, variable names, and service layer are strictly English. Spanish appears only in UI text, Zod validation messages, and toast notifications shown to the user.
- DB field names are English snake_case matching the Postgres schema (e.g. `INCOME` → "Ingreso" in UI, `BURSAR` → "Tesorero" in UI).
- `types/database.types.ts` is generated — never edit it manually. Regenerate with `pnpm types:generate`.
- Code style: `.prettierrc` and `.editorconfig` are present — no semicolons, double quotes, `printWidth` 100, trailing commas off.

## Environment variables

See `.env.example`. Critical ones:

- `NEXT_PUBLIC_SITE_URL` — base URL used in invite/reset email links
- `NEXT_PUBLIC_SUPABASE_URL` — from `pnpm supabase status` → API URL
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — from `pnpm supabase status` → Publishable key
- `SUPABASE_SECRET_KEY` — from `pnpm supabase status` → Secret key (server-side only, never exposed to client)
- `GOOGLE_APPS_SCRIPT_WEBHOOK_URL` / `GOOGLE_APPS_SCRIPT_SECRET` — Google integrations (optional locally)
- `RESEND_API_KEY` / `RESEND_FROM_EMAIL` — transactional email via Resend
- `NOTIFICATION_EMAIL` — recipient for movement notifications; if unset, email sending is skipped

## Git workflow

**Never push directly to `main`.** Always create a feature branch, push it, and open a PR.

```bash
git checkout -b feat/my-feature origin/main
# make changes, commit
git push -u origin feat/my-feature
gh pr create --base main --head feat/my-feature ...
```

## CI pipeline

`.github/workflows/ci.yml` runs on every push and PR:

1. **Lint & Typecheck** — `pnpm lint` + `pnpm typecheck` (must pass)
2. **Tests** — `pnpm test` with `continue-on-error: true` (allowed to fail while test suite is being built)
3. **Supabase Migrations** — `supabase db push` (runs on `main` pushes only; requires `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, `SUPABASE_PROJECT_ID` secrets)
