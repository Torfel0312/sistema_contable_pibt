# Flow diagrams

Mermaid flowcharts for key app flows. Render inline on GitHub, or preview locally with any Mermaid-compatible Markdown viewer.

- [`01-file-uploading.md`](01-file-uploading.md) — upload from form to Supabase Storage, retrieval via signed URL through `/api/attachments/[bucket]/[...path]`.
- [`02-account-creation.md`](02-account-creation.md) — ADMIN invite → Resend email → `/activate` → `PENDING_ACTIVATION` to `ACTIVE`.
- [`03-requests-flow.md`](03-requests-flow.md) — full budget intentions workflow: submit → review → transfer → settlement → settlement review → auto-created movement.
- [`04-password-recovery.md`](04-password-recovery.md) — forgot-password → recovery link → `/activate` (`PENDING_RESET` to `ACTIVE`), no-enumeration behavior on unknown emails.
- [`05-email-send-receive.md`](05-email-send-receive.md) — outbound notifications via Resend/React Email, plus inbound alias forwarding via the Resend inbound webhook (`inbound_email_routes`).

Diagrams reflect the code as of this branch; see `docs/flows.md` and `docs/email.md` for the prose version.
