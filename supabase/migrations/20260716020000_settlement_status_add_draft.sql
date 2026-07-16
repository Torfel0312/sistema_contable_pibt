-- Etapa 5: rendiciones de ministerio can now be saved as a draft before being
-- sent to review. Enum values must be added one per migration (Postgres
-- forbids using a value added by ALTER TYPE ... ADD VALUE in the same
-- transaction it was added in).
ALTER TYPE settlement_status ADD VALUE 'DRAFT';
