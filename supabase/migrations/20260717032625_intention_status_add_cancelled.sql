-- Minister-initiated cancellation, only reachable from DRAFT or PENDING
-- (never once APPROVED or REJECTED — enforced in intentionsService.cancel()).
ALTER TYPE intention_status ADD VALUE 'CANCELLED';
