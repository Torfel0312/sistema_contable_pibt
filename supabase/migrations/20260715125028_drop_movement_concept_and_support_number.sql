-- Drop unused movements.concept and movements.support_number fields.

ALTER TABLE movements DROP COLUMN concept;
ALTER TABLE movements DROP COLUMN support_number;
