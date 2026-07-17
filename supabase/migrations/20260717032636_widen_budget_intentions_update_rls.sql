-- budget_intentions_update only allowed ADMIN/BURSAR to UPDATE (see
-- 20260716010000_fix_bursar_review_rls.sql) — the owning minister could not
-- update their own row at all, which blocks submit()/cancel(). Mirrors
-- expense_settlements_update (20260716020004_settlement_attachments_and_closure.sql):
-- the minister who owns the row must be able to submit()/cancel() it
-- themselves; the service layer enforces which transitions are legal for
-- which role — this policy only gates row ownership.
DROP POLICY IF EXISTS "budget_intentions_update" ON budget_intentions;
CREATE POLICY "budget_intentions_update" ON budget_intentions
  FOR UPDATE TO authenticated
  USING (get_my_role() IN ('ADMIN', 'BURSAR') OR requested_by = auth.uid())
  WITH CHECK (get_my_role() IN ('ADMIN', 'BURSAR') OR requested_by = auth.uid());
