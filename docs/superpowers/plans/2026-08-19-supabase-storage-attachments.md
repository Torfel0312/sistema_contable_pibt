# Supabase Storage Attachments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the still-live Google Drive attachment pipeline (movements, settlements, intentions, payroll liquidaciones) with Supabase Storage.

**Architecture:** One private Supabase Storage bucket (`attachments`), written/read only through the existing service-role admin client from server code (no Storage RLS — authorization stays in the `can()` checks server actions already do). A new shared `services/storage/attachment-storage.service.ts` replaces `services/google/drive.service.ts`; DB rows swap their two Drive columns (`drive_file_id`/`drive_view_link`) for a single `storage_path` column. Images are compressed client-side before upload to protect the free-tier 1GB quota.

**Tech Stack:** Next.js 16 App Router, TypeScript, Supabase Storage (`@supabase/supabase-js` admin client), `browser-image-compression` (new dependency), Zod, React Hook Form, Jest.

**Spec:** `docs/superpowers/specs/2026-08-19-supabase-storage-attachments-design.md`

## Global Constraints

- Always use `pnpm`, never `npm`/`yarn`.
- Never wipe the local dev DB with `pnpm supabase db reset` — apply new migrations with `pnpm supabase migration up` instead.
- Clean cutover: no backfill of existing Drive attachment data (none exists in production).
- No Storage RLS policies — the `attachments` bucket is accessed only via the service-role admin client.
- `MAX_ATTACHMENT_SIZE_BYTES` drops from 30MB to 10MB.
- Image compression target: `maxSizeMB: 0.6`, `maxWidthOrHeight: 1600`, via `browser-image-compression`. PDFs are never compressed.
- Code style: no semicolons, double quotes, `printWidth` 100, trailing commas off (per `.prettierrc`) — run `pnpm lint:fix`/`pnpm prettier` if unsure.
- Regenerate `types/database.types.ts` with `pnpm types:generate` after any schema change.
- Every task ends with `pnpm typecheck` and `pnpm lint` passing (both are part of `pnpm run ci`).

---

## Task 1: Database migration — schema swap + attachments bucket

**Files:**
- Create: `supabase/migrations/<timestamp>_replace_drive_attachments_with_supabase_storage.sql`
- Modify: `types/database.types.ts` (regenerated, not hand-edited)

**Interfaces:**
- Produces: `movement_attachments.storage_path`, `settlement_attachments.storage_path`, `intention_attachments.storage_path` (all `TEXT NOT NULL`), `payroll_records.liquidacion_storage_path` (`TEXT`, nullable) — every later task's DB writes/reads target these columns. Bucket id `attachments` (private) — every later task's storage calls target this bucket.

- [ ] **Step 1: Generate the migration file**

Run: `pnpm supabase migration new replace_drive_attachments_with_supabase_storage`

This creates `supabase/migrations/<timestamp>_replace_drive_attachments_with_supabase_storage.sql`. Note the exact generated filename for the next step.

- [ ] **Step 2: Write the migration**

Replace the generated file's contents with:

```sql
-- Replace Google Drive-backed attachments (movement_attachments,
-- settlement_attachments, intention_attachments, payroll_records) with
-- Supabase Storage. Clean cutover — no production attachment data exists yet,
-- so no backfill.

-- movement_attachments, settlement_attachments, intention_attachments: swap
-- the two Drive columns for a single Storage object path.
ALTER TABLE movement_attachments
  DROP COLUMN drive_file_id,
  DROP COLUMN drive_view_link,
  ADD COLUMN storage_path TEXT NOT NULL;

ALTER TABLE settlement_attachments
  DROP COLUMN drive_file_id,
  DROP COLUMN drive_view_link,
  ADD COLUMN storage_path TEXT NOT NULL;

ALTER TABLE intention_attachments
  DROP COLUMN drive_file_id,
  DROP COLUMN drive_view_link,
  ADD COLUMN storage_path TEXT NOT NULL;

-- payroll_records.liquidacion_*: same swap, nullable (a payroll record can
-- exist before its liquidación file is attached, same as before).
ALTER TABLE payroll_records
  DROP COLUMN liquidacion_drive_file_id,
  DROP COLUMN liquidacion_drive_view_link,
  ADD COLUMN liquidacion_storage_path TEXT;

-- Clean up the orphaned pre-Drive `movement-attachments` Storage bucket (from
-- 20260421170837_add_movement_attachment.sql / 20260501000001_private_storage_buckets.sql)
-- — nothing has written to it since movements.attachment_url was dropped.
DROP POLICY IF EXISTS "authenticated users can upload movement attachments" ON storage.objects;
DROP POLICY IF EXISTS "authenticated users can read movement attachments" ON storage.objects;
DELETE FROM storage.objects WHERE bucket_id = 'movement-attachments';
DELETE FROM storage.buckets WHERE id = 'movement-attachments';

-- Create the unified private bucket every attachment type now uploads to.
-- No RLS policies: all reads/writes go through the service-role admin client
-- from server code that already checks permissions via can() (same pattern as
-- audit log inserts) — storage.objects' default RLS (enabled, no policies for
-- this bucket) denies all access to non-service-role callers.
INSERT INTO storage.buckets (id, name, public)
VALUES ('attachments', 'attachments', false)
ON CONFLICT (id) DO NOTHING;
```

- [ ] **Step 3: Apply the migration locally**

Run: `pnpm supabase migration up`

Expected: the new migration applies cleanly with no errors (do **not** run `pnpm supabase db reset` — that wipes local dev data).

- [ ] **Step 4: Regenerate types**

Run: `pnpm types:generate`

Expected: `types/database.types.ts` changes — `grep -n "storage_path" types/database.types.ts` shows the new columns on `movement_attachments`, `settlement_attachments`, `intention_attachments`, and `liquidacion_storage_path` on `payroll_records`; `grep -n "drive_file_id\|drive_view_link" types/database.types.ts` returns nothing.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/ types/database.types.ts
git commit -m "feat(db): swap Drive attachment columns for Supabase Storage paths"
```

---

## Task 2: Shared attachment validator + size cap

**Files:**
- Modify: `lib/validators/movement.ts:3-9`
- Modify: `lib/constants/attachments.ts:2`

**Interfaces:**
- Consumes: nothing new.
- Produces: `AttachmentInput = { path: string; fileName: string; mimeType: string; sizeBytes: number }` (exported type, replaces the old `driveFileId`/`driveViewLink` shape) — every later task that builds or reads an attachment payload (server actions, services, UI mapping blocks) uses this shape. `MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024`.

`attachmentInputSchema` here is re-exported and consumed by `lib/validators/settlement.ts`, `lib/validators/intention.ts`, and `lib/validators/payroll.ts` (all already `import { attachmentInputSchema } from "@/lib/validators/movement"`) — this one change cascades correctly to all four entity types with no further validator edits needed.

- [ ] **Step 1: Update the attachment schema**

In `lib/validators/movement.ts`, replace:

```ts
export const attachmentInputSchema = z.object({
  driveFileId: z.string().min(1),
  driveViewLink: z.string().min(1),
  fileName: z.string().min(1),
  mimeType: z.string().min(1),
  sizeBytes: z.number().int().positive()
})
```

with:

```ts
export const attachmentInputSchema = z.object({
  path: z.string().min(1),
  fileName: z.string().min(1),
  mimeType: z.string().min(1),
  sizeBytes: z.number().int().positive()
})
```

- [ ] **Step 2: Lower the size cap**

In `lib/constants/attachments.ts`, replace:

```ts
export const MAX_ATTACHMENT_SIZE_BYTES = 30 * 1024 * 1024 // 30MB
```

with:

```ts
export const MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024 // 10MB
```

- [ ] **Step 3: Verify**

Run: `pnpm typecheck`

Expected: errors appear at every call site still using `driveFileId`/`driveViewLink` (movements.ts, hooks, components, services) — this is expected at this point in the plan; each will be fixed in its own task. Confirm the errors are only in the files this plan's later tasks touch (`app/actions/movements.ts`, `hooks/use-attachment-upload.ts`, `hooks/use-movement-form.ts`, `components/movements/movement-form-fields.tsx`, `app/(dashboard)/movements/[id]/page.tsx`, `components/intentions/intention-detail-client.tsx`, `components/payroll/payroll-client.tsx`, `components/payroll/payroll-detail-client.tsx`, `services/movements/movements.service.ts`, `services/settlements/settlements.service.ts`, `services/payroll/payroll.service.ts`, `services/movements/movement-attachments.service.ts`, `services/settlements/settlement-attachments.service.ts`).

- [ ] **Step 4: Commit**

```bash
git add lib/validators/movement.ts lib/constants/attachments.ts
git commit -m "feat: rename attachment schema fields from Drive shape to storage path"
```

---

## Task 3: Attachment storage service

**Files:**
- Create: `services/storage/attachment-storage.service.ts`
- Test: `services/storage/__tests__/attachment-storage.service.test.ts`

**Interfaces:**
- Consumes: `createSupabaseAdminClient()` from `@/lib/supabase/admin`.
- Produces: `attachmentStorageService.upload(input: { fileName: string; mimeType: string; buffer: Buffer }): Promise<string>` (returns the storage path), `attachmentStorageService.remove(path: string): Promise<void>` — Task 5 (`app/actions/attachments.ts`) and Task 6 (`movement-attachments.service.ts`, `settlement-attachments.service.ts`) call these.

Note: unlike the spec's illustrative `movements/<id>/...` path example, the actual path has no entity prefix — the shared upload action has no entity id (the movement/settlement/etc. doesn't exist yet when a file is picked) and no entity-type parameter (it's one generic action for every entity type, same as today's `uploadMovementAttachment`). The path is a flat `<uuid>-<sanitized-filename>`; the entity association lives only in the DB row's foreign key, exactly as it does today with `drive_file_id`.

- [ ] **Step 1: Write the failing test**

Create `services/storage/__tests__/attachment-storage.service.test.ts`:

```ts
import { attachmentStorageService } from "@/services/storage/attachment-storage.service"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"

jest.mock("@/lib/supabase/admin")

const mockedCreateAdminClient = createSupabaseAdminClient as jest.Mock

function mockStorage(overrides: { uploadError?: unknown; removeError?: unknown } = {}) {
  const upload = jest.fn().mockResolvedValue({ error: overrides.uploadError ?? null })
  const remove = jest.fn().mockResolvedValue({ error: overrides.removeError ?? null })
  mockedCreateAdminClient.mockReturnValue({
    storage: { from: jest.fn().mockReturnValue({ upload, remove }) }
  })
  return { upload, remove }
}

describe("attachmentStorageService.upload", () => {
  afterEach(() => jest.clearAllMocks())

  it("uploads to the attachments bucket with a random-prefixed path", async () => {
    const { upload } = mockStorage()
    const path = await attachmentStorageService.upload({
      fileName: "recibo azul.png",
      mimeType: "image/png",
      buffer: Buffer.from("fake")
    })

    expect(path).toMatch(/^[0-9a-f-]{36}-recibo-azul\.png$/)
    expect(upload).toHaveBeenCalledWith(path, expect.any(Buffer), {
      contentType: "image/png",
      upsert: false
    })
  })

  it("throws when the upload fails", async () => {
    mockStorage({ uploadError: new Error("boom") })
    await expect(
      attachmentStorageService.upload({
        fileName: "a.pdf",
        mimeType: "application/pdf",
        buffer: Buffer.from("x")
      })
    ).rejects.toThrow("boom")
  })
})

describe("attachmentStorageService.remove", () => {
  afterEach(() => jest.clearAllMocks())

  it("removes the given path from the attachments bucket", async () => {
    const { remove } = mockStorage()
    await attachmentStorageService.remove("abc-file.pdf")
    expect(remove).toHaveBeenCalledWith(["abc-file.pdf"])
  })

  it("throws when the remove fails", async () => {
    mockStorage({ removeError: new Error("nope") })
    await expect(attachmentStorageService.remove("abc.pdf")).rejects.toThrow("nope")
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test services/storage/__tests__/attachment-storage.service.test.ts`
Expected: FAIL with "Cannot find module '@/services/storage/attachment-storage.service'"

- [ ] **Step 3: Write the implementation**

Create `services/storage/attachment-storage.service.ts`:

```ts
import { randomUUID } from "node:crypto"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"

const BUCKET = "attachments"

function buildPath(fileName: string): string {
  const sanitized = fileName.replace(/[^a-zA-Z0-9.\-_]+/g, "-")
  return `${randomUUID()}-${sanitized}`
}

export const attachmentStorageService = {
  async upload(input: { fileName: string; mimeType: string; buffer: Buffer }): Promise<string> {
    const path = buildPath(input.fileName)
    const admin = createSupabaseAdminClient()
    const { error } = await admin.storage.from(BUCKET).upload(path, input.buffer, {
      contentType: input.mimeType,
      upsert: false
    })
    if (error) throw error
    return path
  },

  async remove(path: string): Promise<void> {
    const admin = createSupabaseAdminClient()
    const { error } = await admin.storage.from(BUCKET).remove([path])
    if (error) throw error
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test services/storage/__tests__/attachment-storage.service.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add services/storage/attachment-storage.service.ts services/storage/__tests__/attachment-storage.service.test.ts
git commit -m "feat(storage): add Supabase Storage attachment upload/remove service"
```

---

## Task 4: Turn on the signed-URL read path

**Files:**
- Modify: `lib/storage/attachments.ts:5`
- Modify: `lib/storage/__tests__/attachments.test.ts`

**Interfaces:**
- Produces: `attachmentHref("attachments", path: string | null | undefined): string | null` — Task 8, 9, and 10 (UI display code) call this to build download/view links. `ATTACHMENT_BUCKETS = ["attachments"]`.

No changes needed to `app/api/attachments/[bucket]/[...path]/route.ts` — it already resolves any bucket in `ATTACHMENT_BUCKETS` via `createSignedUrl`, which is correct as-is.

- [ ] **Step 1: Update the bucket constant**

In `lib/storage/attachments.ts`, replace:

```ts
export const ATTACHMENT_BUCKETS = ["movement-attachments"] as const
```

with:

```ts
export const ATTACHMENT_BUCKETS = ["attachments"] as const
```

- [ ] **Step 2: Update the test to match**

In `lib/storage/__tests__/attachments.test.ts`, replace every occurrence of `"movement-attachments"` with `"attachments"` (both as the bucket argument and in the expected `/api/attachments/...` URLs), e.g. the first block becomes:

```ts
describe("attachmentHref", () => {
  it("returns null for null/undefined/empty path", () => {
    expect(attachmentHref("attachments", null)).toBeNull()
    expect(attachmentHref("attachments", undefined)).toBeNull()
    expect(attachmentHref("attachments", "")).toBeNull()
  })

  it("builds redirect URL from a flat path", () => {
    expect(attachmentHref("attachments", "abc-123.pdf")).toBe(
      "/api/attachments/attachments/abc-123.pdf"
    )
  })

  it("preserves nested path segments", () => {
    expect(attachmentHref("attachments", "2026/05/abc.pdf")).toBe(
      "/api/attachments/attachments/2026/05/abc.pdf"
    )
  })

  it("encodes special characters per segment", () => {
    expect(attachmentHref("attachments", "fold er/file name.pdf")).toBe(
      "/api/attachments/attachments/fold%20er/file%20name.pdf"
    )
  })

  it("strips leading and duplicated slashes", () => {
    expect(attachmentHref("attachments", "/leading/slash.pdf")).toBe(
      "/api/attachments/attachments/leading/slash.pdf"
    )
    expect(attachmentHref("attachments", "a//b.pdf")).toBe(
      "/api/attachments/attachments/a/b.pdf"
    )
  })

  it("returns null when path collapses to empty after filtering", () => {
    expect(attachmentHref("attachments", "/")).toBeNull()
    expect(attachmentHref("attachments", "//")).toBeNull()
  })
})

describe("isAttachmentBucket", () => {
  it("accepts only the whitelisted buckets", () => {
    expect(isAttachmentBucket("attachments")).toBe(true)
    expect(isAttachmentBucket("avatars")).toBe(false)
    expect(isAttachmentBucket("")).toBe(false)
  })

  it("matches the exported tuple exactly", () => {
    expect([...ATTACHMENT_BUCKETS].sort()).toEqual(["attachments"].sort())
  })
})
```

- [ ] **Step 3: Run the test**

Run: `pnpm test lib/storage/__tests__/attachments.test.ts`
Expected: PASS (8 tests)

- [ ] **Step 4: Commit**

```bash
git add lib/storage/attachments.ts lib/storage/__tests__/attachments.test.ts
git commit -m "feat(storage): point attachment bucket allowlist at the new attachments bucket"
```

---

## Task 5: Shared upload/delete server actions

**Files:**
- Create: `app/actions/attachments.ts`
- Modify: `app/actions/movements.ts:1-19,100-177` (remove the Drive-based upload/delete actions and import)

**Interfaces:**
- Consumes: `attachmentStorageService.upload`/`.remove` (Task 3), `MAX_ATTACHMENT_SIZE_BYTES` (Task 2), `getCurrentUser` from `@/lib/supabase/server`, `PERMISSIONS`/`can` from `@/lib/permissions/rbac`.
- Produces: `uploadAttachment(formData: FormData): Promise<{ path: string; fileName: string; mimeType: string; sizeBytes: number } | { error: string }>`, `deleteUnattachedAttachment(path: string): Promise<void>` — Task 7 (`hooks/use-attachment-upload.ts`) imports both from `@/app/actions/attachments`.

- [ ] **Step 1: Create the shared actions file**

Create `app/actions/attachments.ts`:

```ts
"use server"

import { getCurrentUser } from "@/lib/supabase/server"
import { PERMISSIONS, can } from "@/lib/permissions/rbac"
import { attachmentStorageService } from "@/services/storage/attachment-storage.service"
import { MAX_ATTACHMENT_SIZE_BYTES } from "@/lib/constants/attachments"

// This action just uploads a file to Supabase Storage and hands back its
// path — it doesn't touch any entity-specific table, so it's shared by every
// entity that attaches files (movements, transfer registration, ministry
// settlements, payroll liquidaciones). Anyone who can create a movement,
// submit a request, review one, or register payroll can use it.
function canUploadAttachment(permissions: Set<string> | undefined): boolean {
  return (
    can(permissions, PERMISSIONS.CREATE_MOVEMENT) ||
    can(permissions, PERMISSIONS.CREATE_REQUEST) ||
    can(permissions, PERMISSIONS.CREATE_SETTLEMENT) ||
    can(permissions, PERMISSIONS.REVIEW_INTENTIONS)
  )
}

export async function uploadAttachment(
  formData: FormData
): Promise<
  | {
      path: string
      fileName: string
      mimeType: string
      sizeBytes: number
    }
  | { error: string }
> {
  const user = await getCurrentUser()
  if (!user || !canUploadAttachment(user.permissions)) {
    return { error: "Sin permisos para adjuntar archivos" }
  }

  const file = formData.get("file")
  if (!(file instanceof File)) {
    return { error: "Archivo no válido" }
  }

  if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
    return { error: "El archivo supera el tamaño máximo permitido (10MB)" }
  }

  const buffer = Buffer.from(await file.arrayBuffer())

  try {
    const path = await attachmentStorageService.upload({
      fileName: file.name,
      mimeType: file.type,
      buffer
    })

    return {
      path,
      fileName: file.name,
      mimeType: file.type,
      sizeBytes: file.size
    }
  } catch (error) {
    console.error("attachmentStorageService.upload failed", error)
    return { error: "No se pudo subir el archivo" }
  }
}

// Cleans up a storage object for an attachment that was uploaded but never
// persisted to an entity (e.g. the user clicked "remove" before submitting
// the form). There is no DB row to touch here — persisted attachments must
// go through their entity's own remove() (e.g. movementAttachmentsService.remove),
// which handles the DB row + storage deletion together.
export async function deleteUnattachedAttachment(path: string): Promise<void> {
  const user = await getCurrentUser()
  if (!user || !canUploadAttachment(user.permissions)) {
    throw new Error("Sin permisos para eliminar adjuntos")
  }

  try {
    await attachmentStorageService.remove(path)
  } catch (error) {
    console.error("deleteUnattachedAttachment failed", { path, error })
  }
}
```

- [ ] **Step 2: Strip the Drive-based actions out of `app/actions/movements.ts`**

Remove the Drive import (line 11):

```ts
import { uploadFileToDrive, deleteFileFromDrive } from "@/services/google/drive.service"
```

Remove the whole block from the `canUploadDriveAttachment` comment/function through the end of `deleteUnattachedDriveAttachment` (originally lines 100–177 — the comment, `canUploadDriveAttachment`, `uploadMovementAttachment`, and `deleteUnattachedDriveAttachment`). After removal, `app/actions/movements.ts` should go directly from `regeneratePdf` to `removeMovementAttachment`:

```ts
export async function regeneratePdf(id: string) {
  const user = await getCurrentUser()
  if (!user || !can(user.permissions, PERMISSIONS.CREATE_MOVEMENT)) {
    throw new Error("Sin permisos")
  }

  await processMovementIntegrations(id, user.id)
  revalidatePath(`/movements/${id}`)
}

export async function removeMovementAttachment(attachmentId: string): Promise<void> {
  const user = await getCurrentUser()
  if (!user || !can(user.permissions, PERMISSIONS.CREATE_MOVEMENT)) {
    throw new Error("Sin permisos para eliminar adjuntos")
  }

  const db = await createSupabaseServerClient()
  await movementAttachmentsService.remove(db, attachmentId, user.id)
}
```

- [ ] **Step 3: Verify**

Run: `pnpm typecheck`
Expected: no errors in `app/actions/movements.ts` or `app/actions/attachments.ts`. Errors may remain in `hooks/use-attachment-upload.ts` (fixed in Task 7) since it still imports the now-removed `uploadMovementAttachment`/`deleteUnattachedDriveAttachment`.

- [ ] **Step 4: Commit**

```bash
git add app/actions/attachments.ts app/actions/movements.ts
git commit -m "feat: move shared attachment upload/delete actions off Drive onto Supabase Storage"
```

---

## Task 6: Persist storage_path across services

**Files:**
- Modify: `services/movements/movements.service.ts:23-58`
- Modify: `services/settlements/settlements.service.ts:20-59`
- Modify: `services/payroll/payroll.service.ts:76-86`
- Modify: `services/movements/movement-attachments.service.ts`
- Modify: `services/settlements/settlement-attachments.service.ts`

**Interfaces:**
- Consumes: `attachmentStorageService.remove` (Task 3), `AttachmentInput` (Task 2, now `{ path, fileName, mimeType, sizeBytes }`).
- Produces: unchanged public signatures (`insertMovementAttachments`, `movementAttachmentsService.remove`, `settlementAttachmentsService.remove`, `settlementsService.create`, `payrollService.create`) — only their internal column mapping changes, so no other file needs to change because of this task.

- [ ] **Step 1: `movements.service.ts` — insert `storage_path`**

In `services/movements/movements.service.ts`, inside `insertMovementAttachments`, replace:

```ts
  const { error } = await db.from("movement_attachments").insert(
    attachments.map((attachment) => ({
      movement_id: movementId,
      drive_file_id: attachment.driveFileId,
      drive_view_link: attachment.driveViewLink,
      file_name: attachment.fileName,
      mime_type: attachment.mimeType,
      size_bytes: attachment.sizeBytes,
      created_by_id: userId
    }))
  )
```

with:

```ts
  const { error } = await db.from("movement_attachments").insert(
    attachments.map((attachment) => ({
      movement_id: movementId,
      storage_path: attachment.path,
      file_name: attachment.fileName,
      mime_type: attachment.mimeType,
      size_bytes: attachment.sizeBytes,
      created_by_id: userId
    }))
  )
```

- [ ] **Step 2: `settlements.service.ts` — insert `storage_path` (both helpers)**

In `services/settlements/settlements.service.ts`, in `insertSettlementAttachments`, replace:

```ts
  const { error } = await db.from("settlement_attachments").insert(
    attachments.map((attachment) => ({
      settlement_id: settlementId,
      drive_file_id: attachment.driveFileId,
      drive_view_link: attachment.driveViewLink,
      file_name: attachment.fileName,
      mime_type: attachment.mimeType,
      size_bytes: attachment.sizeBytes,
      created_by_id: userId
    }))
  )
```

with:

```ts
  const { error } = await db.from("settlement_attachments").insert(
    attachments.map((attachment) => ({
      settlement_id: settlementId,
      storage_path: attachment.path,
      file_name: attachment.fileName,
      mime_type: attachment.mimeType,
      size_bytes: attachment.sizeBytes,
      created_by_id: userId
    }))
  )
```

And in `insertIntentionAttachments`, replace:

```ts
  const { error } = await db.from("intention_attachments").insert(
    attachments.map((attachment) => ({
      intention_id: intentionId,
      drive_file_id: attachment.driveFileId,
      drive_view_link: attachment.driveViewLink,
      file_name: attachment.fileName,
      mime_type: attachment.mimeType,
      size_bytes: attachment.sizeBytes,
      created_by_id: userId
    }))
  )
```

with:

```ts
  const { error } = await db.from("intention_attachments").insert(
    attachments.map((attachment) => ({
      intention_id: intentionId,
      storage_path: attachment.path,
      file_name: attachment.fileName,
      mime_type: attachment.mimeType,
      size_bytes: attachment.sizeBytes,
      created_by_id: userId
    }))
  )
```

- [ ] **Step 3: `payroll.service.ts` — liquidación storage path**

In `services/payroll/payroll.service.ts`, replace:

```ts
      .update({
        liquidacion_drive_file_id: input.liquidacion.driveFileId,
        liquidacion_drive_view_link: input.liquidacion.driveViewLink,
        liquidacion_file_name: input.liquidacion.fileName,
        liquidacion_mime_type: input.liquidacion.mimeType,
        liquidacion_size_bytes: input.liquidacion.sizeBytes
      })
```

with:

```ts
      .update({
        liquidacion_storage_path: input.liquidacion.path,
        liquidacion_file_name: input.liquidacion.fileName,
        liquidacion_mime_type: input.liquidacion.mimeType,
        liquidacion_size_bytes: input.liquidacion.sizeBytes
      })
```

- [ ] **Step 4: `movement-attachments.service.ts` — delete via storage service**

Replace the full contents of `services/movements/movement-attachments.service.ts` with:

```ts
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database.types"
import { auditService } from "@/services/audit/audit.service"
import { attachmentStorageService } from "@/services/storage/attachment-storage.service"

type DB = SupabaseClient<Database>

export const movementAttachmentsService = {
  async remove(db: DB, attachmentId: string, userId: string): Promise<void> {
    const { data: attachment, error: fetchError } = await db
      .from("movement_attachments")
      .select("id, movement_id, storage_path, file_name")
      .eq("id", attachmentId)
      .single()

    if (fetchError) throw fetchError
    if (!attachment) throw new Error("Adjunto no encontrado")

    try {
      await attachmentStorageService.remove(attachment.storage_path)
    } catch (error) {
      // Non-fatal: don't let a storage-side failure block removing the reference —
      // the goal is removing it from the movement regardless of storage state.
      console.warn("attachmentStorageService.remove failed", { attachmentId, error })
    }

    // movement_attachments RLS already allows ADMIN/BURSAR to delete directly —
    // same roles CREATE_MOVEMENT is gated on, so the caller's own authenticated
    // client is sufficient here, no admin bypass needed.
    const { error: deleteError } = await db.from("movement_attachments").delete().eq("id", attachmentId)

    if (deleteError) throw deleteError

    await auditService.logMovement({
      movement_id: attachment.movement_id,
      user_id: userId,
      action: "Adjunto eliminado",
      note: attachment.file_name
    })
  }
}
```

- [ ] **Step 5: `settlement-attachments.service.ts` — delete via storage service**

Replace the full contents of `services/settlements/settlement-attachments.service.ts` with:

```ts
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database.types"
import { auditService } from "@/services/audit/audit.service"
import { attachmentStorageService } from "@/services/storage/attachment-storage.service"

type DB = SupabaseClient<Database>

export const settlementAttachmentsService = {
  async remove(db: DB, attachmentId: string, userId: string): Promise<void> {
    const { data: attachment, error: fetchError } = await db
      .from("settlement_attachments")
      .select("id, settlement_id, storage_path, file_name")
      .eq("id", attachmentId)
      .single()

    if (fetchError) throw fetchError
    if (!attachment) throw new Error("Adjunto no encontrado")

    try {
      await attachmentStorageService.remove(attachment.storage_path)
    } catch (error) {
      // Non-fatal: don't let a storage-side failure block removing the reference —
      // the goal is removing it from the settlement regardless of storage state.
      console.warn("attachmentStorageService.remove failed", { attachmentId, error })
    }

    // settlement_attachments_delete RLS already scopes this to ADMIN/BURSAR or the
    // owning minister while the settlement is still editable — the caller's own
    // authenticated client is sufficient here, no admin bypass needed. A blocked
    // delete (e.g. settlement already IN_REVIEW) surfaces as zero rows affected.
    const { error: deleteError, count } = await db
      .from("settlement_attachments")
      .delete({ count: "exact" })
      .eq("id", attachmentId)

    if (deleteError) throw deleteError
    if (!count) {
      throw new Error("No se puede eliminar este adjunto en el estado actual de la rendición")
    }

    await auditService.logSystem({
      entity: "EXPENSE_SETTLEMENT",
      action: "SETTLEMENT_ATTACHMENT_REMOVED",
      user_id: userId,
      entity_id: attachment.settlement_id,
      new_value: { file_name: attachment.file_name }
    })
  }
}
```

- [ ] **Step 6: Verify**

Run: `pnpm typecheck`
Expected: no errors in any of the five files touched in this task.

- [ ] **Step 7: Commit**

```bash
git add services/movements/movements.service.ts services/settlements/settlements.service.ts services/payroll/payroll.service.ts services/movements/movement-attachments.service.ts services/settlements/settlement-attachments.service.ts
git commit -m "feat: persist storage_path and delete via Supabase Storage instead of Drive"
```

---

## Task 7: Client upload hook with image compression

**Files:**
- Modify: `hooks/use-attachment-upload.ts`
- Modify: `package.json` (new dependency)

**Interfaces:**
- Consumes: `uploadAttachment`, `deleteUnattachedAttachment` (Task 5), `MAX_ATTACHMENTS_PER_ENTITY`, `MAX_ATTACHMENT_SIZE_BYTES` (Task 2), `imageCompression` from `browser-image-compression`.
- Produces: `PendingAttachment = { id: string; fileName: string; mimeType: string; sizeBytes: number; path: string; previewUrl?: string }`, `useAttachmentUpload(existingCount?: number): { items: PendingAttachment[]; isUploading: boolean; error: string | null; addFiles: (files: FileList | File[]) => Promise<void>; remove: (id: string) => void }` — Tasks 8, 9, 10 (all UI consumers) read `item.path` off this hook's `items`.

- [ ] **Step 1: Install the compression library**

Run: `pnpm add browser-image-compression`

- [ ] **Step 2: Rewrite the hook**

Replace the full contents of `hooks/use-attachment-upload.ts` with:

```ts
"use client"

import { useCallback, useState } from "react"
import imageCompression from "browser-image-compression"
import { uploadAttachment, deleteUnattachedAttachment } from "@/app/actions/attachments"
import { MAX_ATTACHMENTS_PER_ENTITY, MAX_ATTACHMENT_SIZE_BYTES } from "@/lib/constants/attachments"

export type PendingAttachment = {
  id: string // local uuid for React key/removal, not a DB id
  fileName: string
  mimeType: string
  sizeBytes: number
  path: string
  previewUrl?: string // for images, via URL.createObjectURL — only used client-side, never sent to server
}

const COMPRESSION_OPTIONS = {
  maxSizeMB: 0.6,
  maxWidthOrHeight: 1600,
  useWebWorker: true
}

// Receipts/comprobantes don't need more than this to stay legible, and this
// app's movements are never deleted — every uploaded photo stays in Supabase
// Storage forever, so keeping images small matters for the free-tier 1GB quota.
async function compressIfImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file
  try {
    return await imageCompression(file, COMPRESSION_OPTIONS)
  } catch (error) {
    console.warn("Image compression failed, uploading original file", {
      fileName: file.name,
      error
    })
    return file
  }
}

// existingCount is the number of attachments already persisted on the movement
// (edit mode) — the cap must apply to existing + new combined, not just new ones.
export function useAttachmentUpload(existingCount: number = 0) {
  const [items, setItems] = useState<PendingAttachment[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const addFiles = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files)
      if (!list.length) return

      setError(null)
      setIsUploading(true)

      try {
        const currentCount = existingCount + items.length
        const accepted: File[] = []
        for (const file of list) {
          if (currentCount + accepted.length >= MAX_ATTACHMENTS_PER_ENTITY) {
            setError(`Solo se permiten hasta ${MAX_ATTACHMENTS_PER_ENTITY} adjuntos por movimiento`)
            break
          }
          const processed = await compressIfImage(file)
          if (processed.size > MAX_ATTACHMENT_SIZE_BYTES) {
            setError(`"${file.name}" supera el tamaño máximo permitido (10MB)`)
            continue
          }
          accepted.push(processed)
        }

        if (!accepted.length) return

        for (const file of accepted) {
          const formData = new FormData()
          formData.set("file", file)

          const result = await uploadAttachment(formData)

          if ("error" in result) {
            setError(result.error)
            continue
          }

          const previewUrl = file.type.startsWith("image/")
            ? URL.createObjectURL(file)
            : undefined

          setItems((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              fileName: result.fileName,
              mimeType: result.mimeType,
              sizeBytes: result.sizeBytes,
              path: result.path,
              previewUrl
            }
          ])
        }
      } finally {
        setIsUploading(false)
      }
    },
    [items.length, existingCount]
  )

  const remove = useCallback((id: string) => {
    setItems((prev) => {
      const target = prev.find((item) => item.id === id)
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl)
      if (target) {
        // This item was never persisted to an entity (only local-only pending
        // attachments live in this hook's state) — clean up the now-unreferenced
        // storage object. Fire-and-forget: don't block the UI on it, just log failures.
        deleteUnattachedAttachment(target.path).catch((error: unknown) => {
          console.warn("deleteUnattachedAttachment failed", {
            path: target.path,
            error
          })
        })
      }
      return prev.filter((item) => item.id !== id)
    })
  }, [])

  return { items, isUploading, error, addFiles, remove }
}
```

- [ ] **Step 3: Verify**

Run: `pnpm typecheck`
Expected: no errors in `hooks/use-attachment-upload.ts`. Errors remain in the six UI files fixed in Tasks 8–10.

- [ ] **Step 4: Commit**

```bash
git add hooks/use-attachment-upload.ts package.json pnpm-lock.yaml
git commit -m "feat: compress images client-side before upload, switch hook to Supabase Storage"
```

---

## Task 8: Movements UI — form + detail page

**Files:**
- Modify: `hooks/use-movement-form.ts:14-19,206-212`
- Modify: `components/movements/movement-form-fields.tsx:1-12,229-236`
- Modify: `app/(dashboard)/movements/[id]/page.tsx:1-13,64-69,264-266`

**Interfaces:**
- Consumes: `attachmentHref` (Task 4), `AttachmentInput`/`PendingAttachment.path` (Tasks 2, 7).

- [ ] **Step 1: `use-movement-form.ts` — existing-attachment type + submit mapping**

Replace:

```ts
export type ExistingAttachment = {
  id: string
  file_name: string
  mime_type: string
  drive_view_link: string
}
```

with:

```ts
export type ExistingAttachment = {
  id: string
  file_name: string
  mime_type: string
  storage_path: string
}
```

Replace:

```ts
    const attachments = attachmentUpload.items.map((item) => ({
      driveFileId: item.driveFileId,
      driveViewLink: item.driveViewLink,
      fileName: item.fileName,
      mimeType: item.mimeType,
      sizeBytes: item.sizeBytes
    }))
```

with:

```ts
    const attachments = attachmentUpload.items.map((item) => ({
      path: item.path,
      fileName: item.fileName,
      mimeType: item.mimeType,
      sizeBytes: item.sizeBytes
    }))
```

- [ ] **Step 2: `movement-form-fields.tsx` — import + href**

Add the import (alongside the other `@/lib` imports near the top):

```ts
import { attachmentHref } from "@/lib/storage/attachments"
```

Replace:

```tsx
                <a
                  href={att.drive_view_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-w-0 flex-1 truncate text-xs font-bold text-primary hover:underline"
                >
                  {att.file_name}
                </a>
```

with:

```tsx
                <a
                  href={attachmentHref("attachments", att.storage_path) ?? "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-w-0 flex-1 truncate text-xs font-bold text-primary hover:underline"
                >
                  {att.file_name}
                </a>
```

- [ ] **Step 3: Movement detail page — import, type, href**

Add the import (alongside the other `@/lib` imports):

```ts
import { attachmentHref } from "@/lib/storage/attachments"
```

Replace:

```ts
  const attachments = (row.movement_attachments ?? []) as Array<{
    id: string
    file_name: string
    mime_type: string
    drive_view_link: string
  }>
```

with:

```ts
  const attachments = (row.movement_attachments ?? []) as Array<{
    id: string
    file_name: string
    mime_type: string
    storage_path: string
  }>
```

Replace:

```tsx
                  render={
                    <Link href={att.drive_view_link} target="_blank" rel="noopener noreferrer" />
                  }
```

with:

```tsx
                  render={
                    <Link
                      href={attachmentHref("attachments", att.storage_path) ?? "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                    />
                  }
```

- [ ] **Step 4: Verify**

Run: `pnpm typecheck`
Expected: no errors in these three files.

- [ ] **Step 5: Commit**

```bash
git add hooks/use-movement-form.ts components/movements/movement-form-fields.tsx "app/(dashboard)/movements/[id]/page.tsx"
git commit -m "feat: switch movement attachment UI to storage_path + signed-URL links"
```

---

## Task 9: Intentions UI (request detail page)

**Files:**
- Modify: `components/intentions/intention-detail-client.tsx:34-44,233-238,321-326,353-358,470-475,985,1178`

**Interfaces:**
- Consumes: `attachmentHref` (Task 4), `PendingAttachment.path` (Task 7).

- [ ] **Step 1: Add the import**

In the import block (near the other `@/lib` imports, e.g. next to the `formatDate, formatDateTime, formatCLP, avatarColorFor, initialsFor` import), add:

```ts
import { attachmentHref } from "@/lib/storage/attachments"
```

- [ ] **Step 2: Fix the four attachment-mapping blocks**

Each of these four blocks (in the `useEffect` syncing `transferForm`'s `attachments` field, in `handleRegisterTransfer`, in `handleSubmitSettlement`, and in `handleCloseIntention`) has this exact shape — replace each occurrence of:

```ts
        driveFileId: item.driveFileId,
        driveViewLink: item.driveViewLink,
        fileName: item.fileName,
        mimeType: item.mimeType,
        sizeBytes: item.sizeBytes
```

with:

```ts
        path: item.path,
        fileName: item.fileName,
        mimeType: item.mimeType,
        sizeBytes: item.sizeBytes
```

There are 4 occurrences of this pattern in the file (`.map((item) => ({ ... }))` blocks) — replace all 4.

- [ ] **Step 3: Fix the two display hrefs**

Both occurrences of:

```tsx
                              <a
                                href={a.drive_view_link}
                                target="_blank"
                                rel="noreferrer"
                                className="underline"
                              >
```

(one under `settlement_attachments`, one under `intention_attachments`) become:

```tsx
                              <a
                                href={attachmentHref("attachments", a.storage_path) ?? "#"}
                                target="_blank"
                                rel="noreferrer"
                                className="underline"
                              >
```

(Match each occurrence's existing indentation — the settlement-attachments one is indented one level deeper than the intention_attachments one; keep whatever indentation the surrounding block already has, only the `href` line changes.)

- [ ] **Step 4: Verify**

Run: `pnpm typecheck`
Expected: no errors in `components/intentions/intention-detail-client.tsx`.

- [ ] **Step 5: Commit**

```bash
git add components/intentions/intention-detail-client.tsx
git commit -m "feat: switch intention/settlement attachment UI to storage_path + signed-URL links"
```

---

## Task 10: Payroll UI (register dialog + detail page)

**Files:**
- Modify: `components/payroll/payroll-client.tsx:230-244,282-296`
- Modify: `components/payroll/payroll-detail-client.tsx:1-58,203-207`

**Interfaces:**
- Consumes: `attachmentHref` (Task 4), `PendingAttachment.path` (Task 7).

- [ ] **Step 1: `payroll-client.tsx` — two sync blocks**

Replace:

```ts
    form.setValue(
      `lines.${index}.attachments`,
      attachmentUpload.items.map((item) => ({
        driveFileId: item.driveFileId,
        driveViewLink: item.driveViewLink,
        fileName: item.fileName,
        mimeType: item.mimeType,
        sizeBytes: item.sizeBytes
      }))
    )
```

with:

```ts
    form.setValue(
      `lines.${index}.attachments`,
      attachmentUpload.items.map((item) => ({
        path: item.path,
        fileName: item.fileName,
        mimeType: item.mimeType,
        sizeBytes: item.sizeBytes
      }))
    )
```

Replace:

```ts
    form.setValue(
      "liquidacion",
      item
        ? {
            driveFileId: item.driveFileId,
            driveViewLink: item.driveViewLink,
            fileName: item.fileName,
            mimeType: item.mimeType,
            sizeBytes: item.sizeBytes
          }
        : undefined
    )
```

with:

```ts
    form.setValue(
      "liquidacion",
      item
        ? {
            path: item.path,
            fileName: item.fileName,
            mimeType: item.mimeType,
            sizeBytes: item.sizeBytes
          }
        : undefined
    )
```

- [ ] **Step 2: `payroll-detail-client.tsx` — import + attachment normalization + href**

Add the import (alongside the other imports near the top):

```ts
import { attachmentHref } from "@/lib/storage/attachments"
```

Replace:

```ts
  const allAttachments = [
    ...(record.liquidacion_drive_view_link
      ? [
          {
            id: "liquidacion",
            fileName: record.liquidacion_file_name ?? "Liquidación",
            driveViewLink: record.liquidacion_drive_view_link,
            sizeBytes: record.liquidacion_size_bytes,
            mimeType: record.liquidacion_mime_type
          }
        ]
      : []),
    ...lines.flatMap((l) =>
      l.attachments.map((a) => ({
        id: a.id,
        fileName: a.file_name,
        driveViewLink: a.drive_view_link,
        sizeBytes: a.size_bytes,
        mimeType: a.mime_type
      }))
    )
  ]
```

with:

```ts
  const allAttachments = [
    ...(record.liquidacion_storage_path
      ? [
          {
            id: "liquidacion",
            fileName: record.liquidacion_file_name ?? "Liquidación",
            path: record.liquidacion_storage_path,
            sizeBytes: record.liquidacion_size_bytes,
            mimeType: record.liquidacion_mime_type
          }
        ]
      : []),
    ...lines.flatMap((l) =>
      l.attachments.map((a) => ({
        id: a.id,
        fileName: a.file_name,
        path: a.storage_path,
        sizeBytes: a.size_bytes,
        mimeType: a.mime_type
      }))
    )
  ]
```

Replace:

```tsx
                  <a
                    key={a.id}
                    href={a.driveViewLink}
                    target="_blank"
                    rel="noreferrer"
```

with:

```tsx
                  <a
                    key={a.id}
                    href={attachmentHref("attachments", a.path) ?? "#"}
                    target="_blank"
                    rel="noreferrer"
```

- [ ] **Step 3: Verify**

Run: `pnpm typecheck`
Expected: no errors anywhere in the project — this is the last file touching the old Drive field shape (confirm with `grep -rn "driveFileId\|driveViewLink\|drive_file_id\|drive_view_link\|liquidacion_drive" --include="*.ts" --include="*.tsx" . | grep -v node_modules | grep -v .claude/worktrees`, expect no output).

- [ ] **Step 4: Commit**

```bash
git add components/payroll/payroll-client.tsx components/payroll/payroll-detail-client.tsx
git commit -m "feat: switch payroll attachment UI to storage_path + signed-URL links"
```

---

## Task 11: Remove Google Drive integration and stale references

**Files:**
- Delete: `services/google/drive.service.ts`
- Modify: `package.json` (remove `googleapis`)
- Modify: `.env.example:9-13`
- Modify: `CLAUDE.md:76,107`
- Modify: `e2e/README.md:46-51`
- Modify: `e2e/05-requests.spec.ts:136-137`
- Modify: `e2e/06-payroll.spec.ts:57-61`

**Interfaces:** none — this is pure deletion/documentation cleanup, no runtime code depends on it after Tasks 5–10.

- [ ] **Step 1: Delete the Drive service and dependency**

```bash
rm services/google/drive.service.ts
pnpm remove googleapis
```

- [ ] **Step 2: Clean up `.env.example`**

Remove these lines:

```
# Google Drive integration (optional — attachment uploads via Drive API v3)
GOOGLE_DRIVE_FOLDER_ID="<drive_folder_id>"
# Service account credentials used to authenticate with the Drive API (JWT client)
GOOGLE_DRIVE_CLIENT_EMAIL=""
GOOGLE_DRIVE_PRIVATE_KEY=""

```

(including the blank line that follows, so `SUPABASE_SECRET_KEY="sb_secret_..."` is directly followed by the `# Email notifications via Resend` block.)

- [ ] **Step 3: Update `CLAUDE.md`**

Replace the Google integrations paragraph:

```
File attachments (movements, intentions, settlements, payroll liquidaciones) upload directly to Google Drive via the Drive API v3 (`services/google/drive.service.ts`, `googleapis` package, service-account JWT auth — `GOOGLE_DRIVE_CLIENT_EMAIL`/`GOOGLE_DRIVE_PRIVATE_KEY`/`GOOGLE_DRIVE_FOLDER_ID`). The earlier Google Apps Script webhook pipeline (PDF generation + Sheets sync) has been removed. `services/google/movement-postprocess.ts` now only sends an email notification via Resend after a movement is created/edited, tracked on `movements.notification_status`/`notification_error`. Email notifications go through Resend (`services/email/`), with React Email templates in `emails/`.
```

with:

```
File attachments (movements, intentions, settlements, payroll liquidaciones) upload to a single private Supabase Storage bucket (`attachments`) via `services/storage/attachment-storage.service.ts`, using the service-role admin client — no Storage RLS policies, authorization is the same `can()` permission checks the server actions already run. Images are compressed client-side (`browser-image-compression`, in `hooks/use-attachment-upload.ts`) before upload. Downloads go through `app/api/attachments/[bucket]/[...path]/route.ts`, which mints a short-lived signed URL per request. The earlier Google Apps Script webhook pipeline (PDF generation + Sheets sync) and the later Google Drive API attachment pipeline have both been removed. `services/google/movement-postprocess.ts` now only sends an email notification via Resend after a movement is created/edited, tracked on `movements.notification_status`/`notification_error`. Email notifications go through Resend (`services/email/`), with React Email templates in `emails/`.
```

Remove this line from the Environment variables section:

```
- `GOOGLE_DRIVE_FOLDER_ID` / `GOOGLE_DRIVE_CLIENT_EMAIL` / `GOOGLE_DRIVE_PRIVATE_KEY` — Google Drive attachment uploads (optional locally)
```

- [ ] **Step 4: Update e2e docs/comments (no test-logic changes)**

In `e2e/README.md`, replace:

```
- **`05-requests.spec.ts`'s transfer-registration step needs real Google Drive
  credentials.** Registering a transfer now requires at least one comprobante
  (`registerTransferSchema`), and `AttachmentInput` uploads to Drive as soon as
  a file is selected — so `GOOGLE_DRIVE_CLIENT_EMAIL`/`GOOGLE_DRIVE_PRIVATE_KEY`/
  `GOOGLE_DRIVE_FOLDER_ID` must be set in `.env.local`, or that step fails with
  "No se pudo subir el archivo a Google Drive".
```

with:

```
- **`05-requests.spec.ts`'s transfer-registration step uploads a real file.**
  Registering a transfer requires at least one comprobante
  (`registerTransferSchema`), and `AttachmentInput` uploads to Supabase Storage
  as soon as a file is selected. This works against the local Supabase stack
  every other e2e test already depends on — no extra credentials needed.
```

In `e2e/05-requests.spec.ts`, replace:

```ts
    // Comprobante is required (registerTransferSchema.min(1)) — needs GOOGLE_DRIVE_CLIENT_EMAIL/
    // GOOGLE_DRIVE_PRIVATE_KEY configured locally, since AttachmentInput uploads to Drive on select.
```

with:

```ts
    // Comprobante is required (registerTransferSchema.min(1)) — AttachmentInput
    // uploads to Supabase Storage on select, against the local Supabase stack.
```

In `e2e/06-payroll.spec.ts`, replace:

```ts
    // Liquidación is a required upload, but actually completing it needs a real
    // Google Drive service-account key (GOOGLE_APPLICATION_CREDENTIALS) that isn't
    // configured in local/e2e envs — same reason no other spec in this suite
    // exercises a real attachment upload. Cover the validation guard instead of
    // faking a successful upload.
```

with:

```ts
    // Liquidación is a required upload. This test covers the validation guard
    // (no file selected) rather than a real upload — see 05-requests.spec.ts
    // for a spec that exercises a real Supabase Storage upload.
```

- [ ] **Step 5: Verify**

Run: `pnpm run ci` (lint + typecheck)
Expected: PASS.

Run: `grep -rn "GOOGLE_DRIVE\|googleapis\|Google Drive" --include="*.ts" --include="*.tsx" --include="*.md" --include="*.example" . | grep -v node_modules | grep -v .claude/worktrees`
Expected: no output (or, at most, the `services/google/movement-postprocess.ts` filename/directory itself, which is unrelated to Drive and out of scope — confirm nothing else remains).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: remove Google Drive integration and its stale references"
```

---

## Task 12: Final verification

**Files:** none (verification only).

- [ ] **Step 1: Full CI check**

Run: `pnpm run ci`
Expected: lint and typecheck both PASS with zero warnings/errors.

- [ ] **Step 2: Unit tests**

Run: `pnpm test`
Expected: PASS, including the new `services/storage/__tests__/attachment-storage.service.test.ts` and the updated `lib/storage/__tests__/attachments.test.ts`.

- [ ] **Step 3: Manual smoke test**

Run: `pnpm dev` (with local Supabase running — `pnpm supabase status` to confirm).

- Go to `/movements/new`, fill in a movement, attach a photo (`.jpg`/`.png`) and a PDF in step 3, submit.
- Open the created movement's detail page; confirm both attachments are listed and each "Descargar" link opens/downloads the file (this proves the signed-URL route works end to end against the real `attachments` bucket).
- Confirm in the browser's network tab (or by file size) that the uploaded image was compressed — its request payload should be well under the original photo's size.
- Remove an attachment from an in-progress (unsaved) form and confirm no error appears (storage cleanup is fire-and-forget).

- [ ] **Step 4: e2e suite**

Run: `pnpm test:e2e`
Expected: PASS, including `05-requests.spec.ts`'s transfer-registration step (now uploading to Supabase Storage) and `06-payroll.spec.ts`.

- [ ] **Step 5: Report**

No commit for this task — it's verification only. If any step fails, return to the relevant earlier task and fix before considering the migration complete.
