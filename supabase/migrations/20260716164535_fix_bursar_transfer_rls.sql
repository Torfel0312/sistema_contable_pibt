-- intention_transfers_insert/update only allowed ADMIN/FINANCE, but registerTransfer()
-- (app/actions/requests.ts) is gated by the REVIEW_INTENTIONS permission, which
-- role_permissions grants to ADMIN + BURSAR only (never FINANCE, see
-- 20260716010000_fix_bursar_review_rls.sql). A BURSAR registering a transfer for a
-- TRANSFER-funded request is silently blocked at the RLS layer with
-- "new row violates row-level security policy for table intention_transfers".

DROP POLICY IF EXISTS "intention_transfers_insert" ON intention_transfers;
CREATE POLICY "intention_transfers_insert" ON intention_transfers
  FOR INSERT TO authenticated
  WITH CHECK (get_my_role() IN ('ADMIN', 'BURSAR'));

DROP POLICY IF EXISTS "intention_transfers_update" ON intention_transfers;
CREATE POLICY "intention_transfers_update" ON intention_transfers
  FOR UPDATE TO authenticated
  USING (get_my_role() IN ('ADMIN', 'BURSAR'))
  WITH CHECK (get_my_role() IN ('ADMIN', 'BURSAR'));
