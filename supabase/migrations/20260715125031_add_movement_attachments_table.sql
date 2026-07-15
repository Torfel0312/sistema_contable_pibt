-- Replace the single movements.attachment_url column with a movement_attachments
-- table supporting multiple attachments per movement. Files live in Google Drive
-- (not Supabase Storage) — drive_file_id/drive_view_link are the Drive API's
-- file id and shareable view link.
--
-- Note: supabase/migrations/20260501000001_private_storage_buckets.sql created a
-- Supabase Storage bucket (movement-attachments) tied to the old attachment_url
-- column. Dropping that column orphans the bucket/policies; the bucket itself is
-- left alone here (out of scope for this migration).

CREATE TABLE movement_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  movement_id UUID NOT NULL REFERENCES movements(id),
  drive_file_id TEXT NOT NULL,
  drive_view_link TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  created_by_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_movement_attachments_movement ON movement_attachments(movement_id);

ALTER TABLE movement_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "movement_attachments_select" ON movement_attachments FOR SELECT TO authenticated USING (true);
CREATE POLICY "movement_attachments_insert" ON movement_attachments FOR INSERT TO authenticated WITH CHECK (get_my_role() IN ('ADMIN', 'BURSAR'));
CREATE POLICY "movement_attachments_delete" ON movement_attachments FOR DELETE TO authenticated USING (get_my_role() IN ('ADMIN', 'BURSAR'));

ALTER TABLE movements DROP COLUMN attachment_url;
