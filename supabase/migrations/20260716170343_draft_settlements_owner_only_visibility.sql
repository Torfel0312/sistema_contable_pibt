-- Per docs/plans/05-rendiciones-de-ministerio.md, DRAFT settlements are a minister's
-- own scratch space until submitted — tesorería and ministry-mates should not see them.
-- expense_settlements_select never enforced this: ADMIN/FINANCE/BURSAR and same-ministry
-- users could see every settlement regardless of status, including drafts.

DROP POLICY IF EXISTS "expense_settlements_select" ON expense_settlements;
CREATE POLICY "expense_settlements_select" ON expense_settlements
  FOR SELECT TO authenticated
  USING (
    submitted_by = auth.uid()
    OR (
      status != 'DRAFT'
      AND (
        get_my_role() IN ('ADMIN', 'FINANCE', 'BURSAR')
        OR intention_id IN (
          SELECT id FROM budget_intentions
          WHERE ministry_id IN (SELECT get_my_active_ministries())
        )
      )
    )
  );
