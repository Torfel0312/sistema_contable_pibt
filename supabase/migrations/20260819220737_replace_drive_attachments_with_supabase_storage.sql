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
-- storage.objects/buckets have a protect_delete trigger guarding against
-- direct DELETEs; this session flag is the documented escape hatch for
-- migrations that intentionally clean up storage rows.
SET LOCAL storage.allow_delete_query = 'true';
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
