# Flow diagrams

Excalidraw flowcharts for key app flows. Open at [excalidraw.com](https://excalidraw.com) (drag file onto canvas) or with the VS Code Excalidraw extension.

- `01-file-uploading.excalidraw` — upload from form to Supabase Storage, retrieval via signed URL through `/api/attachments/[bucket]/[...path]`.
- `02-account-creation.excalidraw` — ADMIN invite → Resend email → `/activate` → `PENDING_ACTIVATION` to `ACTIVE`.
- `03-requests-flow.excalidraw` — full budget intentions workflow: submit → review → transfer → settlement → settlement review → auto-created movement.
- `04-password-recovery.excalidraw` — forgot-password → recovery link → `/activate` (`PENDING_RESET` to `ACTIVE`), no-enumeration behavior on unknown emails.
- `05-email-send-receive.excalidraw` — outbound notifications via Resend/React Email, plus inbound alias forwarding via the Resend inbound webhook (`inbound_email_routes`).

Diagrams reflect the code as of this branch; see `docs/flows.md` and `docs/email.md` for the prose version.
