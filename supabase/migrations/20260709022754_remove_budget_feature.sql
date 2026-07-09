-- ============================================================
-- REMOVE BUDGET FEATURE
-- Budgets (periods, ministry allocations) are dropped entirely.
-- The requests/intentions workflow (budget_intentions,
-- intention_transfers, expense_settlements, request_comments)
-- stays — it only loses the period/allocation coupling.
-- ============================================================

-- ── Drop RPC that computed budget summaries ────────────────────
DROP FUNCTION IF EXISTS get_ministry_budget_summary(UUID, UUID);

-- ── budget_periods / ministry_budgets RLS policies ─────────────
DROP POLICY IF EXISTS "budget_periods_select" ON budget_periods;
DROP POLICY IF EXISTS "budget_periods_insert" ON budget_periods;
DROP POLICY IF EXISTS "budget_periods_update" ON budget_periods;
DROP POLICY IF EXISTS "ministry_budgets_select" ON ministry_budgets;
DROP POLICY IF EXISTS "ministry_budgets_insert" ON ministry_budgets;
DROP POLICY IF EXISTS "ministry_budgets_update" ON ministry_budgets;
DROP POLICY IF EXISTS "service_role_bypass" ON budget_periods;
DROP POLICY IF EXISTS "service_role_bypass" ON ministry_budgets;

-- ── budget_intentions loses its period/over-budget coupling ────
ALTER TABLE budget_intentions DROP COLUMN IF EXISTS period_id;
ALTER TABLE budget_intentions DROP COLUMN IF EXISTS is_over_budget;

-- ── Drop the budget tables ──────────────────────────────────────
DROP TABLE IF EXISTS ministry_budgets;
DROP TABLE IF EXISTS budget_periods;

-- ── Drop now-unused enums ───────────────────────────────────────
DROP TYPE IF EXISTS ministry_budget_status;
DROP TYPE IF EXISTS budget_period_status;

-- ── app_settings: drop budget period start month ───────────────
DELETE FROM app_settings WHERE key = 'budget_period_start_month';

-- ── role_permissions: drop MANAGE_BUDGETS grants ───────────────
DELETE FROM role_permissions WHERE permission = 'MANAGE_BUDGETS';
