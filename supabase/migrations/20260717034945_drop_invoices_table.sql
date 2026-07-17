-- Remove legacy boletas/invoices feature — fully superseded by requests workflow (expense_settlements)
DROP POLICY IF EXISTS "authenticated users can read invoice attachments" ON storage.objects;
DROP POLICY IF EXISTS "authenticated users can upload invoice attachments" ON storage.objects;
DROP POLICY IF EXISTS "invoice attachments are publicly readable" ON storage.objects;

SET LOCAL storage.allow_delete_query = 'true';
DELETE FROM storage.objects WHERE bucket_id = 'invoice-attachments';
DELETE FROM storage.buckets WHERE id = 'invoice-attachments';

DROP TABLE IF EXISTS invoices;
DROP TYPE IF EXISTS invoice_status;
