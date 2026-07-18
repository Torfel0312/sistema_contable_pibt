-- Severance reserve entries should be logged month by month (varying amount,
-- not a fixed recurring value) so it's clear which month each entry covers.
-- Backfill existing rows from created_at before making the column required.

ALTER TABLE severance_reserve_adjustments ADD COLUMN period DATE;

UPDATE severance_reserve_adjustments
  SET period = date_trunc('month', created_at)::date
  WHERE period IS NULL;

ALTER TABLE severance_reserve_adjustments ALTER COLUMN period SET NOT NULL;

ALTER TABLE severance_reserve_adjustments
  ADD CONSTRAINT severance_reserve_adjustments_period_is_month_start
  CHECK (EXTRACT(DAY FROM period) = 1);
