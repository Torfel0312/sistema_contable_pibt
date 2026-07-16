-- Blocks the minister from editing/cancelling a settlement once tesorería
-- has picked it up to evaluate (startReview()).
ALTER TYPE settlement_status ADD VALUE 'IN_REVIEW';
