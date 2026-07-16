-- Lets tesorería send a settlement back to the minister with comments
-- instead of rejecting it outright.
ALTER TYPE settlement_status ADD VALUE 'RETURNED_FOR_CORRECTION';
