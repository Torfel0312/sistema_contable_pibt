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

# E2E tests (Playwright, local only — see e2e/README.md)
pnpm test:e2e

# Supabase local stack (CLI is a devDependency)
pnpm supabase <sub command>      # e.g. pnpm supabase status, pnpm supabase db reset

# Regenerate DB types from local Supabase
pnpm types:generate

# React Email dev server (emails/ directory, port 3001)
pnpm email:dev
```

Always use `pnpm`, never `npm`.

`pnpm run ci` runs lint + typecheck. There are no mandatory automated tests yet — jest is configured with `--passWithNoTests`. `pnpm test:e2e` runs the Playwright suite (`e2e/`) against a locally running `pnpm dev` + seeded local Supabase — it is **not** run in CI, is not a regression gate, and doubles as a design-reference screenshot generator (`docs/screenshots/`, committed to the repo). See `e2e/README.md` for setup.

## Architecture

**Stack:** Next.js 16 App Router · TypeScript strict · Tailwind CSS v4 · Supabase (Postgres + Auth) · `@supabase/ssr` · React Hook Form + Zod · Recharts · shadcn-style components on Base UI · Resend (email)

**Layer separation:**

- `app/` — Route handlers and page components. `(dashboard)` route group pages: `dashboard`, `movements` (+ `new`, `[id]`, `[id]/edit`), `ministries` (+ `[id]`), `requests` (+ `[id]`, intentions/approval workflow), `users`, `audit`, `settings`, `profile`, `voucher-book` (quick income/expense entry form, not linked in sidebar).
- `app/actions/` — Server actions (auth, movements, users, ministries, requests, ministry-settlements, settings, permissions, theme).
- `app/api/` — API routes (movements, users, ministries, requests, ministry-settlements, notifications, reminders, settings, auth, attachments, dashboard).
- `components/` — UI (`components/ui/`) and domain components (`components/movements/`, `components/dashboard/`, `components/intentions/`, etc.)
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
API route or server action → reads Supabase session → validates with Zod schema from `lib/validators/` → calls service → service uses Supabase server client → service calls `auditService` for audit log → movement mutations then call `processMovementIntegrations` (email notification via Resend).

**Auth:**
Supabase Auth with email/password (`signInWithPassword`). No public sign-up — accounts are created by an ADMIN via the users management page; the invited user receives an email (Resend) and activates via `/activate`. Password reset via `/api/auth/forgot-password`. Session is read server-side via `createServerClient()` from `lib/supabase/server.ts`.

**Ministries:**
`ministries` + `ministry_assignments` tables; a MINISTER user is assigned to a ministry via `ministry_assignments` (FK to `users`) — there is no free-text minister field. Managed at `/ministries`. Used by the requests workflow.

**Requests workflow:**
`budget_intentions`, `intention_transfers`, `expense_settlements`, `request_comments` tables. Ministers submit spending intentions (amount + description); BURSAR reviews (approve/reject), registers the transfer once approved, and ministers later settle the expense with proof. FINANCE has read-only visibility into the same workflow (no `REVIEW_INTENTIONS` permission — cannot approve/reject or register transfers). Per-ministry budget allocation was removed (no `budget_periods`/`ministry_budgets` coupling) — budgets are tracked outside the platform for now. Services: `services/intentions/`, `services/settlements/`. Pages: `app/(dashboard)/requests/page.tsx` (+ `[id]`).

**Google integrations:**
File attachments (movements, intentions, settlements, payroll liquidaciones) upload to a single private Supabase Storage bucket (`attachments`) via `services/storage/attachment-storage.service.ts`, using the service-role admin client — no Storage RLS policies, authorization is the same `can()` permission checks the server actions already run. Images are compressed client-side (`browser-image-compression`, in `hooks/use-attachment-upload.ts`) before upload. Downloads go through `app/api/attachments/[bucket]/[...path]/route.ts`, which mints a short-lived signed URL per request. The earlier Google Apps Script webhook pipeline (PDF generation + Sheets sync) and the later Google Drive API attachment pipeline have both been removed. `services/google/movement-postprocess.ts` now only sends an email notification via Resend after a movement is created/edited, tracked on `movements.notification_status`/`notification_error`. Email notifications go through Resend (`services/email/`), with React Email templates in `emails/`.

**Database schema:**
Migrations live in `supabase/migrations/`. Key tables: `users`, `role_permissions`, `movements`, `movement_audit_log`, `system_audit_log`, `ministries`, `ministry_assignments`, `budget_intentions`, `intention_transfers`, `expense_settlements`, `request_comments`, `app_settings`. All tables have RLS enabled. Run `pnpm supabase db reset` to wipe and re-apply from scratch locally.

Always use `pnpm supabase migration new ...` for new migrations

Always make sure that types are up to date with `pnpm types:generate`

## Key conventions

- Anytime you start a branch or worktree, fetch latest main changes to avoid conflicts
- Always use playwright-cli for browser navigation, install it if needed
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
- `RESEND_API_KEY` — transactional email via Resend (sender address is DB-backed via `app_settings.notifications_from_email`, not an env var)
- `NOTIFICATION_EMAIL` — recipient for movement notifications; if unset, email sending is skipped
- `RESEND_WEBHOOK_SECRET` — verifies signatures on the inbound-email webhook
- `CRON_SECRET` — shared secret required by the reminders cron endpoint

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
