CREATE TYPE intention_funding_method AS ENUM ('REIMBURSEMENT', 'TRANSFER');

ALTER TABLE budget_intentions
  ADD COLUMN funding_method intention_funding_method NOT NULL DEFAULT 'TRANSFER';
ALTER TABLE budget_intentions ALTER COLUMN funding_method DROP DEFAULT;

ALTER TABLE intention_transfers
  ADD COLUMN movement_id UUID REFERENCES movements(id);
