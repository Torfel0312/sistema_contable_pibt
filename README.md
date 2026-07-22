# Sistema Contable PIBT

Accounting and fund management system for **Primera Iglesia Bautista de Talcahuano**.

## Stack

| Layer         | Technology                            |
| ------------- | ------------------------------------- |
| Framework     | Next.js 16 (App Router)               |
| Language      | TypeScript (strict)                   |
| Styles        | Tailwind CSS v4                       |
| Database      | Supabase (PostgreSQL + Auth)          |
| DB client     | `@supabase/ssr` + native client       |
| Forms         | React Hook Form + Zod                 |
| Charts        | Recharts                              |
| UI components | Base UI                               |
| Email         | [Resend](https://resend.com)          |
| Attachments   | Google Drive API v3 (service account) |

## Modules

| Module              | Description                                                                            |
| ------------------- | -------------------------------------------------------------------------------------- |
| **Dashboard**       | KPIs, income/expense chart, monthly summary                                            |
| **Movements**       | Income and expense records with attachments and full audit trail                       |
| **Requests**        | Ministry fund request workflow (intentions), treasury approval, transfer, settlement    |
| **Ministries**      | Ministry and member administration                                                     |
| **Payroll**         | Monthly payroll (remuneraciones) and severance reserve tracking (ADMIN only)           |
| **Users**           | Account management (ADMIN only)                                                        |
| **Audit**           | System-wide change and event history                                                   |

## Roles

Four roles, permission-based (not hardcoded) via the `role_permissions` table — see
`lib/permissions/rbac.ts` for the full permission list.

| Role       | Description                                                |
| ---------- | ----------------------------------------------------------- |
| `ADMIN`    | Full access, user and configuration management              |
| `BURSAR`   | Tesorero — reviews/approves requests, registers movements   |
| `FINANCE`  | Comisión de finanzas — same workflow access as BURSAR       |
| `MINISTER` | Submit fund requests and settlements for their ministry      |

## Local setup

Requirements: Node.js 22 LTS, pnpm, Docker (for local Supabase).

```bash
# 1. Install dependencies
pnpm install

# 2. Start local Supabase
pnpm supabase start

# 3. Copy environment variables
cp .env.example .env.local
# Edit .env.local with values from `pnpm supabase status`

# 4. Apply migrations and regenerate types
pnpm supabase db reset
pnpm types:generate

# 5. Start dev server
pnpm dev
```

Open `http://localhost:3000`.

## Commands

```bash
pnpm dev              # Development server
pnpm build            # Production build
pnpm typecheck        # Type checking
pnpm lint             # Lint (zero warnings enforced)
pnpm lint:fix         # Auto-fix lint issues
pnpm run ci           # lint + typecheck (same as CI)
pnpm test             # Tests (jest)
pnpm supabase <cmd>   # Supabase CLI
pnpm types:generate   # Regenerate DB types from schema
```

Always use `pnpm`. Never `npm` or `yarn`.

## Environment variables

See `.env.example`. Critical ones:

```env
NEXT_PUBLIC_SITE_URL=                   # Base URL (used in email links)
NEXT_PUBLIC_SUPABASE_URL=               # Local or production Supabase URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=                    # Server-side only, never expose to client

RESEND_API_KEY=                         # API key from resend.com
NOTIFICATION_EMAIL=                     # Movement notification recipient
RESEND_WEBHOOK_SECRET=                  # Verifies the inbound-email webhook
CRON_SECRET=                            # Shared secret for the reminders cron endpoint

GOOGLE_DRIVE_FOLDER_ID=                 # Drive folder for uploaded attachments (optional)
GOOGLE_DRIVE_CLIENT_EMAIL=              # Service account email (optional)
GOOGLE_DRIVE_PRIVATE_KEY=               # Service account private key (optional)
```

## Documentation

| Document                                     | Description                                 |
| --------------------------------------------- | ------------------------------------------- |
| [docs/setup.md](docs/setup.md)                | Detailed local setup guide                  |
| [docs/architecture.md](docs/architecture.md)  | System architecture                         |
| [docs/email.md](docs/email.md)                | Email integration with Resend               |
| [docs/flows.md](docs/flows.md)                | Flow diagrams (Fund Request and Settlement) |

## CI/CD

`.github/workflows/ci.yml` runs on every push and PR:

1. `pnpm lint` + `pnpm typecheck` (must pass)
2. `pnpm test` (allowed to fail while test suite is being built)
3. `supabase db push` (on pushes to `main` only; requires GitHub secrets)
