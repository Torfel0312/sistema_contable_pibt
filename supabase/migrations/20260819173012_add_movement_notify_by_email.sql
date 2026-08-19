-- The internal notification email on every manual movement create/edit was
-- unconditional (no way to opt out) and CC'd whoever created it on their own
-- data entry — noisy for a treasurer logging routine expenses. Make it an
-- explicit per-movement choice instead (form defaults it to checked for
-- INCOME, unchecked for EXPENSE, but the user can always override).
ALTER TABLE movements ADD COLUMN notify_by_email BOOLEAN NOT NULL DEFAULT true;

-- Distinguishes "user opted out" / "no recipient configured" from "SENT"/"ERROR"
-- in the audit trail (movements are never deleted, so this stays queryable).
ALTER TYPE notification_status ADD VALUE 'SKIPPED';
