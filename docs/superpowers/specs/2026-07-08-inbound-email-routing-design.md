# Inbound email routing — design

## Problem

`pibtalcahuano.com` has Resend receiving enabled (confirmed via `resend emails receiving list` — inbound test round-trip works). Right now, any email that lands at e.g. `tesoreria@pibtalcahuano.com` just sits in Resend with no consumer — no webhook, no forwarding, nothing in this codebase touches inbound mail at all.

We want an admin-configurable mapping: a mailbox local-part (e.g. `tesoreria`) → a list of platform users, so that when an external email arrives at that address, Resend forwards the original message to each mapped user's real email inbox. Configuration lives on `/settings`, next to the existing (outbound-only) `tesoreria_notification_email` / `voucher_email` fields.

This is a new, independent concern from those two existing fields — they control where the *app* sends its own generated notifications; this feature controls where *external, human-sent* email gets forwarded. Both can reference the same address (e.g. `tesoreria@pibtalcahuano.com`) without being coupled in the data model.

## Non-goals

- No in-app inbox / stored message history. Forwarding is fire-and-forget; Resend's dashboard (`resend emails receiving list`) remains the source of truth for raw inbound history if anyone needs to look something up manually.
- No per-user opt-out or notification preferences beyond "is this user in the mapping."
- No retry/dead-letter queue for failed forwards — logged and dropped (see Error handling).
- Not touching the two existing outbound settings fields (`tesoreria_notification_email`, `voucher_email`) or their behavior.

## Data model

New table, migration via `pnpm supabase migration new inbound_email_routes`:

```sql
CREATE TABLE inbound_email_routes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  local_part  TEXT NOT NULL,           -- e.g. "tesoreria" (no "@domain" — domain is implicit/fixed)
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_by  UUID REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (local_part, user_id)
);
```

- Many rows per `local_part` (multiple recipients per mailbox).
- Many rows per `user_id` (one user can receive multiple mailboxes).
- `local_part` stored lowercase, validated `^[a-z0-9._-]+$` at the Zod layer.
- RLS: mirror `app_settings` — `select` for authenticated, `insert`/`delete` gated to roles holding `MANAGE_SETTINGS` (reuse existing permission, no new permission constant), plus the standard `service_role_bypass` policy so the webhook's admin-client reads work.

## Service layer

`services/email/inbound-routes.service.ts`:

- `list(db)` — returns rows grouped by `local_part`, each with joined `{ user_id, full_name, email }`, for the settings UI.
- `create(db, { local_part, user_id }, actorId)` — insert, audit log via `auditService.logSystem({ entity: "INBOUND_EMAIL_ROUTE", action: "ROUTE_CREATED", ... })` (same pattern as `settingsService.update`).
- `remove(db, id, actorId)` — delete, audit log `ROUTE_DELETED`.
- `findByLocalPart(adminDb, localPart)` — used only by the webhook handler (admin client, bypasses RLS), returns matched users' emails.

## Validator

`lib/validators/inbound-email-route.ts`:

```ts
export const createInboundEmailRouteSchema = z.object({
  local_part: z.string().min(1).max(64).regex(/^[a-z0-9._-]+$/),
  user_id: z.string().uuid()
})
```

## API routes

- `app/api/inbound-email-routes/route.ts` — `GET` (list, gated `MANAGE_SETTINGS`), `POST` (create, validated, gated `MANAGE_SETTINGS`).
- `app/api/inbound-email-routes/[id]/route.ts` — `DELETE` (gated `MANAGE_SETTINGS`).

Same shape as `app/api/settings/route.ts` and `app/api/ministries/[id]/assignments/route.ts` (closest existing precedent for "pick a user from a list and persist an association").

## Webhook receiver

`app/api/webhooks/resend-inbound/route.ts` — new, no precedent in this codebase.

- `POST`, **no session auth** (external caller from Resend). Verifies the Svix signature (`svix-id`, `svix-timestamp`, `svix-signature` headers) against `RESEND_WEBHOOK_SECRET` using `resend.webhooks.verify(...)` if the SDK exposes it, otherwise the `svix` npm package directly — confirm exact API at implementation time via context7 docs for the installed `resend` version (6.12.2).
- On `email.received`:
  1. Extract `data.to` (array of recipient addresses).
  2. For each address at our domain, derive `local_part` (`tesoreria@pibtalcahuano.com` → `tesoreria`).
  3. `inboundRoutesService.findByLocalPart(adminDb, localPart)` → list of user emails.
  4. If non-empty: call Resend's receiving-forward endpoint once with all matched emails as `to` (mirrors CLI's `resend emails receiving forward <id> --to email1 email2 --from ...`), using `FROM_EMAIL` (same constant already used in `services/email/resend.service.ts`).
  5. If empty: log (`console.warn`) — unmatched, no forward. Still recoverable via `resend emails receiving list` / Resend dashboard.
- Always return `200` quickly, even on internal errors, logging server-side — Resend retries on non-2xx and we don't want retry storms for a fire-and-forget forward.
- Other event types: ignore, ack `200`.

## Auth / credentials

- `RESEND_API_KEY` — already rotated to `full_access` by the user directly in the Resend dashboard (token value unchanged: `re_hG4vEMdZ...`). No Vercel env change needed for this. Existing `services/email/*.service.ts` continue using it unchanged for outbound.
- `RESEND_WEBHOOK_SECRET` — new env var, obtained when the webhook subscription is created (see Ops step below). Required for signature verification in the new route.

## One-time ops step (outside app code, done via CLI)

```
resend webhooks create --endpoint https://tesoreria.pibtalcahuano.com/api/webhooks/resend-inbound --events email.received
```

Returned signing secret → set as `RESEND_WEBHOOK_SECRET` in Vercel production env → redeploy. This registers Resend's *account-level* webhook subscription once; it is not something the UI manages. The UI only ever edits the `inbound_email_routes` table (the app-side mailbox→user mapping), never the Resend webhook subscription itself.

## UI

New component `components/settings/inbound-email-routes-section.tsx`, rendered inside `settings-client.tsx` below the existing two email fields (matches the screenshot's layout — same card style).

- Server-fetches `users` list (active only) and current routes, same pattern as `ministry-detail-client.tsx` receiving `users` as a prop.
- Grouped by `local_part`: each group shows `{local_part}@pibtalcahuano.com` as a heading, a chip per assigned user (`full_name <email>` + remove ×), and an inline add-picker (`NativeSelect` of active users not already in that group) + add button.
- A separate small form to start a brand-new `local_part` group: text input (lowercase, validated client-side matching the Zod regex) + `NativeSelect` of users + add button — creates the first route row for that mailbox.
- Add/remove call the new API routes directly (`fetch`), then re-fetch / `router.refresh()` to reflect the change — same UX pattern as the rest of the settings page (toast on success/error via `sonner`).

## Error handling

- Webhook signature invalid → `401`, log, no forward, no DB writes.
- Malformed payload / missing `to` → `200` (ack) + log warning, skip.
- No route configured for the local-part → `200` (ack) + log info, skip.
- Resend forward call fails (rate limit, API error) → log error, still return `200` to the inbound webhook trigger to avoid retry storms. Forwarding failures are not retried in this iteration.
- Duplicate `(local_part, user_id)` on create → unique violation → `409`, surfaced as a toast in the UI ("este usuario ya recibe correos de este buzón" or similar).
- Removing the last user from a `local_part` group is allowed — the group simply disappears from the list (no orphan-prevention needed; an unmapped mailbox just falls back to "no forward, log only").

## Testing

- Unit test: local-part extraction + route matching (pure function), Jest.
- Manual verification (same technique already used to confirm domain-level send/receive): `resend emails send --from hola@pibtalcahuano.com --to tesoreria@pibtalcahuano.com --subject ... --text ...`, then confirm the mapped user(s) receive the forwarded copy in their real inbox, and check Vercel function logs for the webhook route to confirm the match/forward path executed.
- No automated test for Svix signature verification itself (needs the real secret) — rely on the manual end-to-end check above plus Resend's dashboard webhook delivery log (shows response status per attempt).

## Open items resolved during brainstorming (for reference)

- Scope: real inbound emails, not app-generated outbound notifications. ✅
- Delivery method: forward raw email via Resend's forward API, not an in-app inbox. ✅
- Mailbox scope: open-ended list, not limited to the 2 existing settings fields. ✅
- Cardinality: many users per mailbox (list), not one. ✅
- API key: existing `RESEND_API_KEY` upgraded to `full_access` in place (done by user in Resend dashboard) rather than a separate dedicated key. ✅
