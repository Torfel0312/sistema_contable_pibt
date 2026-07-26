-- Live updates for /requests (list) and /requests/[id] (detail): new requests,
-- status changes, comments, transfers and settlements should show up for other
-- viewers without a manual refresh. Supabase Realtime's postgres_changes only
-- broadcasts changes for tables added to the supabase_realtime publication —
-- none of these were on it before. Realtime re-checks each row against the
-- subscriber's existing SELECT RLS policy before delivering it, so no separate
-- realtime-authorization policy is needed here (unlike Broadcast/Presence).

ALTER PUBLICATION supabase_realtime ADD TABLE budget_intentions;
ALTER PUBLICATION supabase_realtime ADD TABLE request_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE intention_transfers;
ALTER PUBLICATION supabase_realtime ADD TABLE expense_settlements;
