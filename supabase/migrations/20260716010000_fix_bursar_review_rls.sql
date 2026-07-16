-- budget_intentions_update / expense_settlements_update only allowed ADMIN/FINANCE,
-- but role_permissions has only ever granted REVIEW_INTENTIONS to ADMIN + BURSAR
-- (never FINANCE). Since intentionsService.review()/settlementsService.review() write
-- through the regular session-bound client (not the admin client), a BURSAR approving
-- or rejecting a request/settlement is silently blocked at the RLS layer: the UPDATE
-- matches zero rows and the app's .single() call then throws.

DROP POLICY IF EXISTS "budget_intentions_update" ON budget_intentions;
CREATE POLICY "budget_intentions_update" ON budget_intentions
  FOR UPDATE TO authenticated
  USING (get_my_role() IN ('ADMIN', 'BURSAR'))
  WITH CHECK (get_my_role() IN ('ADMIN', 'BURSAR'));

DROP POLICY IF EXISTS "expense_settlements_update" ON expense_settlements;
CREATE POLICY "expense_settlements_update" ON expense_settlements
  FOR UPDATE TO authenticated
  USING (get_my_role() IN ('ADMIN', 'BURSAR'))
  WITH CHECK (get_my_role() IN ('ADMIN', 'BURSAR'));
