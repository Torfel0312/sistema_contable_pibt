# Flow diagrams

Mermaid flowcharts for key app flows. Diagram labels are in Spanish (matching the app's UI
language); render inline on GitHub, or preview locally with any Mermaid-compatible Markdown
viewer.

- [`01-file-uploading.md`](01-file-uploading.md) — upload from form to Supabase Storage, retrieval via signed URL through `/api/attachments/[bucket]/[...path]`.
- [`02-account-creation.md`](02-account-creation.md) — ADMIN invite → Resend email → `/activate` → `PENDING_ACTIVATION` to `ACTIVE`.
- [`03-requests-flow.md`](03-requests-flow.md) — full budget intentions workflow: submit → review → transfer → settlement → settlement review → auto-created movement.
- [`04-password-recovery.md`](04-password-recovery.md) — forgot-password → recovery link → `/activate` (`PENDING_RESET` to `ACTIVE`), no-enumeration behavior on unknown emails.
- [`05-email-send-receive.md`](05-email-send-receive.md) — outbound notifications via Resend/React Email, plus inbound alias forwarding via the Resend inbound webhook (`inbound_email_routes`).
- [`06-roles-and-permissions.md`](06-roles-and-permissions.md) — the four roles, the full permission matrix, how `getCurrentUser()` resolves and caches a user's effective permissions, and how an ADMIN edits the matrix live from `/settings/permissions`.
- [`07-login-and-impersonation.md`](07-login-and-impersonation.md) — login via `signInWithPassword` + route protection in `proxy.ts`, and the full ADMIN impersonation lifecycle (start/expire/auto-terminate, `MANAGE_USERS` blocked while impersonating).

Diagrams reflect the code as of this branch; see `docs/flows.md`, `docs/roles.md`, and
`docs/architecture.md` for the prose version.
