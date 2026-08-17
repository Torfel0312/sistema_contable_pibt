# Local Setup Guide

## Prerequisites

- Node.js 22 LTS
- pnpm (`npm install -g pnpm`)
- Docker Desktop (required by Supabase local stack)

Verify:

```bash
node -v
pnpm -v
docker -v
```

## 1. Install dependencies

```bash
pnpm install
```

## 2. Start local Supabase

```bash
pnpm supabase start
```

This starts a local PostgreSQL instance, GoTrue (auth), and the Supabase Studio UI.
Note the output — you'll need the project URL and keys.

## 3. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in `.env.local` with values from `pnpm supabase status`:

```env
NEXT_PUBLIC_SITE_URL="http://localhost:3000"
NEXT_PUBLIC_SUPABASE_URL="http://127.0.0.1:54321"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="<anon key from supabase status>"
SUPABASE_SECRET_KEY="<service_role key from supabase status>"
```

For email (optional locally):

```env
RESEND_API_KEY="re_..."
NOTIFICATION_EMAIL="your@email.com"
```

## 4. Apply migrations and generate types

```bash
pnpm supabase db reset      # Wipes local DB, re-applies all migrations
pnpm types:generate         # Regenerates types/database.types.ts from schema
```

## 5. Create the initial admin user

Run from Supabase Studio SQL editor (`http://localhost:54323`):

```sql
SELECT create_initial_admin(
  'admin@example.com',
  'YourSecurePassword123!',
  'Admin Name'
);
```

This RPC is the only supported way to bootstrap the first ADMIN account.
Subsequent users are created through the Users management page.

## 6. Start the dev server

```bash
pnpm dev
```

Open `http://localhost:3000`.

## Useful commands

```bash
pnpm supabase stop              # Stop local Supabase
pnpm supabase status            # Show local URLs and keys
pnpm supabase migration new <name>   # Create a new migration file
pnpm types:generate             # Regenerate DB types
pnpm run ci                     # Run lint + typecheck (CI equivalent)
```

## Common issues

### Port 3000 already in use

```bash
lsof -ti:3000 | xargs kill -9
pnpm dev
```

### Supabase container not starting

Make sure Docker Desktop is running, then:

```bash
pnpm supabase stop
pnpm supabase start
```

### Type errors after schema changes

Always regenerate types after any migration:

```bash
pnpm types:generate
```

`types/database.types.ts` is auto-generated — never edit it manually.

## Google Drive attachments (optional locally, required for the `/requests` transfer flow)

File attachments (movements, requests, settlements, payroll) upload to Google Drive via the
Drive API v3 using a service account. `services/google/drive.service.ts` uses
`GOOGLE_DRIVE_CLIENT_EMAIL` + `GOOGLE_DRIVE_PRIVATE_KEY` to authenticate as that service account,
and uploads into the folder given by `GOOGLE_DRIVE_FOLDER_ID`. This is optional for most local
development, but since [`09-pendientes.md`](./plans/09-pendientes.md) comprobantes are now
mandatory when a BURSAR registers a transfer for a request, that specific flow needs it configured
(otherwise the upload fails with "No se pudo subir el archivo a Google Drive").

### One-time setup (Google Cloud Console)

1. **Create or pick a Google Cloud project** at [console.cloud.google.com](https://console.cloud.google.com).
2. **Enable the Google Drive API** for that project: APIs & Services → Library → search "Google Drive API" → Enable.
3. **Create a service account**: IAM & Admin → Service Accounts → Create Service Account. Any name/description works (e.g. `holly-money-attachments`). No project-level IAM role is needed — access is granted later at the folder level in Drive itself, not via GCP IAM.
4. **Create a JSON key** for that service account: open it → Keys tab → Add Key → Create new key → JSON. This downloads a file with `client_email` and `private_key` fields — those map directly to `GOOGLE_DRIVE_CLIENT_EMAIL` and `GOOGLE_DRIVE_PRIVATE_KEY`.
5. **Create the destination folder in Drive** (or pick an existing one) and **share it with the service account's `client_email`**, with Editor access — same as sharing a folder with any other person, paste the `...@...gserviceaccount.com` address in the share dialog. `GOOGLE_DRIVE_FOLDER_ID` is the id from the folder's URL (`https://drive.google.com/drive/folders/<this part>`).
   - **Important if the Drive isn't on a Google Workspace domain (i.e. a personal @gmail.com account owns the folder):** service accounts have 0 bytes of personal storage quota, so uploads can fail with a storage-quota error even though the account has Editor access. If that happens, the folder needs to live inside a **Shared Drive** (Workspace only) instead of a personal My Drive folder — uploads then count against the Shared Drive's quota, not the service account's.
6. **Set the three env vars** wherever the app runs:
   - Locally: add `GOOGLE_DRIVE_FOLDER_ID`, `GOOGLE_DRIVE_CLIENT_EMAIL`, `GOOGLE_DRIVE_PRIVATE_KEY` to `.env.local` (see `.env.example`). Paste `private_key` from the JSON key as-is — it contains literal `\n` sequences, which `getDriveClient()` un-escapes before use, so don't manually convert them to real newlines.
   - Production: set the same three as environment variables on whatever's hosting the app's build/runtime (ask if unsure which host is in use — not documented elsewhere in this repo).
