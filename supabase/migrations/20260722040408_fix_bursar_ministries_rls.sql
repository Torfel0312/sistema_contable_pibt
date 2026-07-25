-- BURSAR already holds MANAGE_MINISTRIES (see 20260429151749_add_role_permissions_table.sql)
-- and the /ministries UI shows create/edit/assign/unassign actions to them accordingly, but
-- the underlying RLS policies from 20260501000002_workflow_authenticated_rls.sql were
-- hardcoded to get_my_role() = 'ADMIN'. A BURSAR clicking any of those actions is silently
-- blocked at the RLS layer ("new row violates row-level security policy") — reproduced by
-- editing a ministry as BURSAR, which 500s. Same class of bug as
-- 20260716010000_fix_bursar_review_rls.sql / 20260716164535_fix_bursar_transfer_rls.sql.
-- ministries_select / ministry_assignments_select are already USING (true) and need no change.

DROP POLICY IF EXISTS "ministries_insert" ON ministries;
CREATE POLICY "ministries_insert" ON ministries
  FOR INSERT TO authenticated
  WITH CHECK (get_my_role() IN ('ADMIN', 'BURSAR'));

DROP POLICY IF EXISTS "ministries_update" ON ministries;
CREATE POLICY "ministries_update" ON ministries
  FOR UPDATE TO authenticated
  USING (get_my_role() IN ('ADMIN', 'BURSAR'))
  WITH CHECK (get_my_role() IN ('ADMIN', 'BURSAR'));

DROP POLICY IF EXISTS "ministry_assignments_insert" ON ministry_assignments;
CREATE POLICY "ministry_assignments_insert" ON ministry_assignments
  FOR INSERT TO authenticated
  WITH CHECK (get_my_role() IN ('ADMIN', 'BURSAR'));

DROP POLICY IF EXISTS "ministry_assignments_update" ON ministry_assignments;
CREATE POLICY "ministry_assignments_update" ON ministry_assignments
  FOR UPDATE TO authenticated
  USING (get_my_role() IN ('ADMIN', 'BURSAR'))
  WITH CHECK (get_my_role() IN ('ADMIN', 'BURSAR'));

DROP POLICY IF EXISTS "ministry_assignments_delete" ON ministry_assignments;
CREATE POLICY "ministry_assignments_delete" ON ministry_assignments
  FOR DELETE TO authenticated
  USING (get_my_role() IN ('ADMIN', 'BURSAR'));
