-- Replace the free-text movements.category column with a category_id FK
-- into the new movement_categories catalog, plus an optional subcategory_id.
--
-- No production data exists yet, so no real backfill effort is required.
-- As a cheap safety net for local/dev databases that may already have rows,
-- backfill category_id by matching the old free-text category against the
-- newly seeded catalog on (movement_type, lower(name)). Any row whose text
-- doesn't match a seeded category is intentionally left with a NULL
-- category_id here — we do not invent categories for it — and the
-- subsequent SET NOT NULL will fail loudly if that happens, surfacing the
-- mismatch instead of silently dropping data.

ALTER TABLE movements ADD COLUMN category_id UUID REFERENCES movement_categories(id);

UPDATE movements
SET category_id = movement_categories.id
FROM movement_categories
WHERE movements.movement_type = movement_categories.movement_type
  AND lower(movements.category) = lower(movement_categories.name)
  AND movement_categories.is_active;

ALTER TABLE movements ALTER COLUMN category_id SET NOT NULL;
ALTER TABLE movements DROP COLUMN category;

ALTER TABLE movements ADD COLUMN subcategory_id UUID REFERENCES movement_subcategories(id);

CREATE INDEX idx_movements_category ON movements(category_id);
