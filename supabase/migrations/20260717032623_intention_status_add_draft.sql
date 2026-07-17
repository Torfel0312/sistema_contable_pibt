-- Minister can save a fund request as a draft before sending it to review.
-- Enum values must be added one per migration (Postgres forbids using a
-- value added by ALTER TYPE ... ADD VALUE in the same transaction it was
-- added in) — same constraint that split settlement_status growth across
-- 4 migrations.
ALTER TYPE intention_status ADD VALUE 'DRAFT';
