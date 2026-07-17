-- Add VIEW_DASHBOARD permission, gating access to the general dashboard.
-- The dashboard page had no permission check at all, so any authenticated
-- user — including MINISTER — could reach it and see org-wide financial
-- KPIs (saldo, ingresos, egresos). Seed it enabled for the roles that
-- already see finance data elsewhere; MINISTER is intentionally excluded
-- but remains toggleable from the permissions matrix.

INSERT INTO role_permissions (role, permission, enabled) VALUES
  ('ADMIN', 'VIEW_DASHBOARD', true),
  ('BURSAR', 'VIEW_DASHBOARD', true),
  ('FINANCE', 'VIEW_DASHBOARD', true);
