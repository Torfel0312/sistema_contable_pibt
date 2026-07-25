-- Payroll (remuneraciones) was ADMIN-only (see 20260716172924_payroll_and_severance_reserve.sql).
-- Tesorería (BURSAR) also registers payroll now, so grant MANAGE_PAYROLL and widen the
-- RLS SELECT/INSERT policies that were hardcoded to get_my_role() = 'ADMIN' — otherwise
-- a BURSAR with the permission would still be silently blocked at the RLS layer, same
-- class of bug as 20260716164535_fix_bursar_transfer_rls.sql. register_payroll() itself
-- needs no EXECUTE grant change: payrollService.create() calls it via the service-role
-- admin client, not the authenticated client.

INSERT INTO role_permissions (role, permission, enabled) VALUES
  ('BURSAR', 'MANAGE_PAYROLL', true);

DROP POLICY IF EXISTS "payroll_records_select" ON payroll_records;
CREATE POLICY "payroll_records_select" ON payroll_records
  FOR SELECT TO authenticated
  USING (get_my_role() IN ('ADMIN', 'BURSAR'));

DROP POLICY IF EXISTS "payroll_movements_select" ON payroll_movements;
CREATE POLICY "payroll_movements_select" ON payroll_movements
  FOR SELECT TO authenticated
  USING (get_my_role() IN ('ADMIN', 'BURSAR'));

DROP POLICY IF EXISTS "severance_reserve_adjustments_select" ON severance_reserve_adjustments;
CREATE POLICY "severance_reserve_adjustments_select" ON severance_reserve_adjustments
  FOR SELECT TO authenticated
  USING (get_my_role() IN ('ADMIN', 'BURSAR'));

DROP POLICY IF EXISTS "severance_reserve_adjustments_insert" ON severance_reserve_adjustments;
CREATE POLICY "severance_reserve_adjustments_insert" ON severance_reserve_adjustments
  FOR INSERT TO authenticated
  WITH CHECK (get_my_role() IN ('ADMIN', 'BURSAR'));
