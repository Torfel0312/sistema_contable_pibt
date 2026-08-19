# Replace Google Drive attachments with Supabase Storage

## Problem

Every place in the app that attaches a file — movement receipts, settlement
proof, intention attachments, payroll `liquidación` files — currently uploads
to Google Drive via `services/google/drive.service.ts` (`googleapis`, a
service-account JWT, `GOOGLE_DRIVE_*` env vars). This is still fully wired up
and live, despite the intent to remove it: `drive_file_id`/`drive_view_link`
columns exist on `movement_attachments`, `settlement_attachments`,
`intention_attachments`, and `payroll`, and four service files import
`uploadFileToDrive`/`deleteFileFromDrive`.

There is also dead scaffolding for a different, unfinished migration:
`lib/storage/attachments.ts` + `app/api/attachments/[bucket]/[...path]/route.ts`
implement a private-bucket + signed-URL pattern against Supabase Storage, but
nothing calls it — only its own unit test references it.

This spec replaces Google Drive with Supabase Storage across all four
attachment surfaces, finishing and wiring up the existing dead scaffold
instead of adding a new external vendor.

## Backend decision

Considered Supabase Storage vs. Vercel Blob (a Blob store had already been
provisioned for this). Free-tier storage is roughly equal between the two
(~1GB), so the deciding factors were:

- Supabase Storage keeps the app on one vendor (already used for DB + Auth)
  instead of introducing a second SDK and a second set of secrets.
- It finishes real, already-written code (`lib/storage/attachments.ts`, the
  signed-URL route) instead of discarding it.
- It keeps authorization on the same model as the rest of the app (see
  below) rather than introducing a second authorization surface.

The previously-provisioned Vercel Blob store (`holly-molly-files`,
`store_xD72XkqgoMB08h88`) was empty and has been deleted.

## Architecture & access model

- One private Supabase Storage bucket, `attachments`. Paths are prefixed by
  entity: `movements/<id>/<uuid>-<filename>`, `settlements/...`,
  `intentions/...`, `payroll/...`. A single bucket is simpler to provision
  and manage than one per entity type, and no entity needs storage-level
  isolation from another.
- **No Storage RLS policies.** All reads and writes go through server code
  using the existing service-role admin client (`lib/supabase/admin.ts`) —
  the same pattern already used for audit inserts. Authorization stays
  exactly where it already lives: the `can()` permission checks in server
  actions. This avoids a second, parallel authorization surface in Storage
  RLS.
- Downloads/viewing reuse the existing (currently dead) signed-URL route,
  `app/api/attachments/[bucket]/[...path]/route.ts` — it already does the
  right thing (auth check → `createSignedUrl` → redirect). It only needs
  `ATTACHMENT_BUCKETS` in `lib/storage/attachments.ts` updated to
  `["attachments"]`.
- New service `services/storage/attachment-storage.service.ts` wraps
  `upload`/`remove` on the admin client's `.storage.from("attachments")`,
  replacing `services/google/drive.service.ts` (deleted, along with the
  `googleapis` dependency and `GOOGLE_DRIVE_*` env vars).

## Storage-quota strategy (free tier)

Supabase free tier is a hard 1GB storage cap, no overage available without
upgrading to Pro. Movements are append-only (no deletions, per the project's
"no deletions" rule), so storage only grows — uncompressed phone photos
(3–6MB each) would fill 1GB in a few hundred uploads.

- **Client-side image compression** before upload, using
  `browser-image-compression` (canvas-based, runs in a Web Worker so it
  doesn't block the UI). Applied only to image mime types; PDFs pass through
  unchanged (compressing PDFs client-side is a much harder problem, and
  receipt/bank PDFs are usually already small).
- Target: `maxSizeMB: 0.6`, `maxWidthOrHeight: 1600`. Receipts/comprobantes
  don't need more resolution than that to stay legible. A typical 3–6MB
  phone photo compresses to roughly 150–400KB, taking free-tier capacity
  from ~150–300 uncompressed photos to roughly ~3,000 compressed ones.
- Lower `MAX_ATTACHMENT_SIZE_BYTES` (`lib/constants/attachments.ts`) from
  30MB to 10MB, so one oversized upload (e.g. an uncompressed PDF or a
  compression fallback) can't eat a large fraction of the quota in one file.
  Enforced both client-side (existing check) and server-side (existing
  check in the upload action), unchanged in shape.
- No quota-monitoring feature is being built — out of scope. A storage-full
  upload surfaces as a normal upload error (see Error handling below).

## Vouchers are unaffected

Checked `services/vouchers/voucher.service.ts`: the emailed "comprobante" is
a PDF rendered on the fly from the movement's data (`@react-pdf/renderer`)
and attached to the Resend email as an in-memory buffer. It never reads from
`movement_attachments`/Storage — the uploaded receipt photos and the emailed
voucher PDF are two separate things. `services/google/movement-postprocess.ts`
(the notification email pipeline) doesn't attach stored files either. Making
the bucket private has no effect on either email flow.

## Schema changes

One new migration (clean cutover — no production attachment data exists yet,
per project decision — so no backfill):

- `movement_attachments`: drop `drive_file_id`, `drive_view_link` → add
  `storage_path TEXT NOT NULL`
- `settlement_attachments`, `intention_attachments`: same swap
- `payroll`: drop `liquidacion_drive_file_id`, `liquidacion_drive_view_link`
  → add `liquidacion_storage_path TEXT`
- Create the `attachments` private Storage bucket (no RLS policies, per
  above)

Regenerate `types/database.types.ts` with `pnpm types:generate` after the
migration.

## Data flow

**Upload** (shared by every entity type that attaches files):

1. Client selects a file → `hooks/use-attachment-upload.ts` compresses it if
   it's an image → `FormData` → shared server action. The action is renamed
   from `uploadMovementAttachment` (misleadingly movements-specific, even
   though settlements/intentions/payroll already reuse it) to
   `uploadAttachment`, and moved out of `app/actions/movements.ts` into a
   new `app/actions/attachments.ts`, since it's genuinely a shared,
   entity-agnostic action. `canUploadDriveAttachment` becomes
   `canUploadAttachment` — same permission union
   (`CREATE_MOVEMENT | CREATE_REQUEST | CREATE_SETTLEMENT | REVIEW_INTENTIONS`).
2. The action validates permission + the new 10MB size cap, then calls
   `attachmentStorageService.upload(path, buffer, contentType)`.
3. Returns `{ path, fileName, mimeType, sizeBytes }` to the client
   (replacing `driveFileId`/`driveViewLink`).
4. On entity save, `storage_path` is persisted to the entity's row — same
   as today, just a renamed field.

**Read/display**: `attachmentHref("attachments", path)` (existing helper,
just needs its bucket list updated) builds
`/api/attachments/attachments/<path>`, which the existing signed-URL route
resolves via `createSignedUrl`. No new code — this part of the scaffold just
gets turned on.

**Delete**: `deleteUnattachedDriveAttachment` becomes
`deleteUnattachedAttachment` (cleans up a file uploaded but never attached
to a saved entity). The two `*-attachments.service.ts` `remove()` methods
swap `deleteFileFromDrive` for `attachmentStorageService.remove(path)` —
same non-fatal-on-error pattern as today (a storage-side failure never
blocks removing the DB row).

## Error handling

- Upload failures return `{ error }` to the client (no throw) — same shape
  as today.
- Unattached-file cleanup and persisted-attachment removal keep the
  existing "non-fatal, log and continue" pattern.
- Compression failure (e.g. corrupt/unsupported image) is non-fatal: fall
  back to uploading the original file rather than blocking the user.
- A storage-full (1GB cap) upload surfaces as a normal upload error through
  the existing catch → generic Spanish error message. No dedicated
  quota-monitoring feature.

## File inventory

**New:**
- `services/storage/attachment-storage.service.ts`
- `app/actions/attachments.ts`
- Image compression helper wired into `hooks/use-attachment-upload.ts`
- One new Supabase migration (schema column swap + bucket creation)

**Modified:**
- `lib/storage/attachments.ts` (bucket list → `["attachments"]`)
- `lib/storage/__tests__/attachments.test.ts` (real bucket name)
- `components/ui/attachment-input.tsx`, `components/intentions/intention-detail-client.tsx`,
  `components/payroll/payroll-client.tsx`, `components/payroll/payroll-detail-client.tsx`
- `services/movements/movement-attachments.service.ts`,
  `services/settlements/settlement-attachments.service.ts`
- `services/payroll/payroll.service.ts`
- `lib/validators/movement.ts` (field rename)
- `lib/constants/attachments.ts` (`MAX_ATTACHMENT_SIZE_BYTES` 30MB → 10MB)
- `app/actions/movements.ts`, `app/actions/ministry-settlements.ts`
  (remove Drive imports, delegate to `app/actions/attachments.ts`)
- `types/database.types.ts` (regenerated)
- `package.json` (−`googleapis`, +`browser-image-compression`)
- `.env.example`, `CLAUDE.md` (remove `GOOGLE_DRIVE_*`, update architecture
  section)

**Deleted:**
- `services/google/drive.service.ts`

## Testing

- Update `lib/storage/__tests__/attachments.test.ts` for the real bucket
  name.
- Add a small unit test for `attachment-storage.service.ts` (mocked admin
  client).
- Rely on existing `e2e/01-movements.spec.ts`, `e2e/05-requests.spec.ts`,
  `e2e/06-payroll.spec.ts` for end-to-end coverage — they exercise the same
  `AttachmentInput`/hook UI, so they should keep passing unmodified once
  local Supabase has the bucket (created automatically by the new migration
  on `pnpm supabase db reset`).
- Manual verification via `pnpm dev`: upload a photo on a movement, confirm
  it's compressed before upload, confirm it displays/downloads via the
  signed-URL route.

## Out of scope

- Backfilling or migrating any existing Drive-hosted files (none exist in
  production).
- Storage RLS policies.
- Storage-quota monitoring/alerting.
- PDF compression.
- Changes to voucher email generation (confirmed unaffected).
