-- "Referencia" on the treasury transfer form is redundant with the transfer's
-- attachments (comprobantes), which are now required (see registerTransferSchema
-- in lib/validators/intention.ts). Drop the now-unused column.
ALTER TABLE intention_transfers DROP COLUMN reference;
