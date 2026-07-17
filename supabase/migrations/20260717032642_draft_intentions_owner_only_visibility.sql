-- Mirrors draft_settlements_owner_only_visibility: DRAFT requests are a
-- minister's own scratch space until submitted — tesorería and
-- ministry-mates should not see them. budget_intentions_select
-- (20260501000002_workflow_authenticated_rls.sql) never enforced this.
DROP POLICY IF EXISTS "budget_intentions_select" ON budget_intentions;
CREATE POLICY "budget_intentions_select" ON budget_intentions
  FOR SELECT TO authenticated
  USING (
    requested_by = auth.uid()
    OR (
      status != 'DRAFT'
      AND (
        get_my_role() IN ('ADMIN', 'FINANCE', 'BURSAR')
        OR ministry_id IN (SELECT get_my_active_ministries())
      )
    )
  );
