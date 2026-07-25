-- Ministers can assign delegates who act on their behalf (same permissions as
-- MINISTER). Enum values must be added one per migration (Postgres forbids
-- using a value added by ALTER TYPE ... ADD VALUE in the same transaction it
-- was added in) — see 20260716020000_settlement_status_add_draft.sql.
ALTER TYPE user_role ADD VALUE 'DELEGATE';
