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

## TypeScript 7 toolchain

The project type-checks with **TypeScript 7** (the native, Go-based compiler): `tsc`/`pnpm typecheck` run the `typescript@7` binary. Parts of the toolchain still need the classic TypeScript 5.x JS compiler API, which typescript@7 no longer ships:

- **typescript-eslint** (type-aware lint rules) — pinned to its own `typescript@5.x` instance via the `readPackage` hook in `.pnpmfile.cjs`. Remove that hook once typescript-eslint supports the TS7 API.
- **Next.js build-time type check** — `next build` can't type-check without the classic package; it detects `@typescript/native-preview` (installed as a marker) and skips gracefully. The type gate is preserved because the `build` script runs `tsc --noEmit` (TS7) before `next build`, and CI runs `pnpm typecheck`.
- **Editor support** — the bundled `tsserver` is gone; use the "TypeScript (Native Preview)" VS Code extension (or an editor with TS7 LSP support) for IntelliSense.

TS7 no longer auto-includes all `@types/*` packages, so `tsconfig.json` lists them explicitly in `compilerOptions.types`. If you add a new `@types/*` dependency whose globals are needed (not imported via modules), add it there.

**Stack:** Next.js 16 App Router · TypeScript strict · Tailwind CSS v4 · Supabase (Postgres + Auth) · `@supabase/ssr` · React Hook Form + Zod · Recharts · shadcn-style components on Base UI · Resend (email)

**Layer separation:**

- `app/` — Route handlers and page components. `(dashboard)` route group pages: `dashboard`, `movements` (+ `new`, `[id]`, `[id]/edit`), `settlements` (Rendición de Boletas), `ministries` (+ `[id]`), `requests` (+ `[id]`, intentions/approval workflow), `users`, `audit`, `settings`, `profile`, `voucher-book` (quick income/expense entry form, not linked in sidebar).
- `app/actions/` — Server actions (auth, movements, invoices, users, ministries, requests, ministry-settlements, settings, permissions, theme).
- `app/api/` — API routes (movements, invoices, users, ministries, requests, ministry-settlements, notifications, reminders, settings, auth, attachments, dashboard).
- `components/` — UI (`components/ui/`) and domain components (`components/movements/`, `components/dashboard/`, `components/settlements/`, `components/intentions/`, etc.)
- `services/` — All business logic. Never call the Supabase client directly from API routes or server actions; use the service layer.
- `lib/supabase/` — Supabase client helpers:
  - `server.ts` — SSR client (reads/writes cookies, used in API routes and Server Components); also exports `getCurrentUser()`
  - `client.ts` — browser client (used in Client Components)
  - `admin.ts` — service role client (bypasses RLS; used only for user management and audit inserts)
- `lib/permissions/rbac.ts` — permission checks: `can(user.permissions, PERMISSIONS.X)`. Permissions are granted per role via the `role_permissions` table.
- `lib/validators/` — Zod schemas shared between API routes and forms
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
`ministries` + `ministry_assignments` tables; a MINISTER user is assigned to a ministry via `ministry_assignments` (FK to `users`) — there is no free-text minister field. Managed at `/ministries`. Used by the requests workflow.

**Requests workflow:**
`budget_intentions`, `intention_transfers`, `expense_settlements`, `request_comments` tables. Ministers submit spending intentions (amount + description); BURSAR/FINANCE review (approve/reject), register the transfer once approved, and ministers later settle the expense with proof. Per-ministry budget allocation was removed (no `budget_periods`/`ministry_budgets` coupling) — budgets are tracked outside the platform for now. Services: `services/intentions/`, `services/settlements/`. Pages: `app/(dashboard)/requests/page.tsx` (+ `[id]`).

**Google integrations:**
Outbound webhooks via Google Apps Script (configured via env vars): PDF generation + Drive storage and Google Sheets sync. Triggered in `services/google/movement-postprocess.ts` after a movement is created/edited. Email notifications go through Resend (`services/email/`), with React Email templates in `emails/`. Integration state tracked on `movements` (`pdf_status`, `synced_to_sheet`, `notification_status`, etc.).

**Database schema:**
Migrations live in `supabase/migrations/`. Key tables: `users`, `role_permissions`, `movements`, `movement_audit_log`, `system_audit_log`, `folio_counter`, `invoices`, `ministries`, `ministry_assignments`, `budget_intentions`, `intention_transfers`, `expense_settlements`, `request_comments`, `app_settings`. All tables have RLS enabled. Run `pnpm supabase db reset` to wipe and re-apply from scratch locally.

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
