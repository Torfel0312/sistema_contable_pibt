-- description and purpose on budget_intentions served the same goal (both were
-- free-text explanations of the request) — collapse into a single required
-- "purpose" field and drop "description" entirely.

UPDATE budget_intentions SET purpose = description WHERE purpose IS NULL;

ALTER TABLE budget_intentions ALTER COLUMN purpose SET NOT NULL;
ALTER TABLE budget_intentions DROP COLUMN description;
