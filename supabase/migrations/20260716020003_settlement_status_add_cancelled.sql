-- Minister-initiated cancellation, only reachable from DRAFT, PENDING or
-- RETURNED_FOR_CORRECTION (never from IN_REVIEW or a terminal state).
ALTER TYPE settlement_status ADD VALUE 'CANCELLED';
