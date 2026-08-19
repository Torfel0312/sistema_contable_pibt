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
