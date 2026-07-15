-- Drop the old Google Apps Script / Sheets pipeline columns from movements.
-- notification_status/notification_sent_at/notification_error are untouched:
-- those belong to the email notification pipeline, which is not being removed.

ALTER TABLE movements DROP COLUMN pdf_url;
ALTER TABLE movements DROP COLUMN drive_file_id;
ALTER TABLE movements DROP COLUMN pdf_status;
ALTER TABLE movements DROP COLUMN pdf_error;
ALTER TABLE movements DROP COLUMN synced_to_sheet;
ALTER TABLE movements DROP COLUMN sync_error;

-- pdf_status enum type was used only by the column just dropped above.
DROP TYPE pdf_status;
