-- Drop unused free-text "person" fields on movements; add receipt_email for
-- sending a copy of the movement receipt to an external address.
-- delivered_by stays as-is: it becomes a dual-purpose "delivered by/to" field
-- at the UI layer, no schema change needed for it.

ALTER TABLE movements DROP COLUMN reference_person;
ALTER TABLE movements DROP COLUMN received_by;
ALTER TABLE movements DROP COLUMN beneficiary;
ALTER TABLE movements ADD COLUMN receipt_email TEXT;
