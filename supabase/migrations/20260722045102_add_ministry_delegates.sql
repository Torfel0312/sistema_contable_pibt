-- Delegates: a minister can assign delegate(s) who act on their behalf for the
-- ministry, with the same permissions as MINISTER (CREATE_REQUEST,
-- CREATE_SETTLEMENT, VIEW_WORKFLOW — seeded below). Unlike ministry_assignments,
-- there's no history/soft-unassign here: removing a delegate is a hard delete
-- (matches the "Quitar delegado" UI, which has no undo). One ministry per
-- delegate (user_id UNIQUE) — a person delegates for a single ministry.
CREATE TABLE ministry_delegates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ministry_id UUID NOT NULL REFERENCES ministries(id),
  user_id     UUID NOT NULL UNIQUE REFERENCES users(id),
  assigned_by UUID NOT NULL REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ministry_delegates_ministry_idx ON ministry_delegates (ministry_id);

ALTER TABLE ministry_delegates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_bypass" ON ministry_delegates USING (auth.role() = 'service_role');

-- Extend the existing "which ministries can I act in" helper to include ministries
-- I'm a delegate for, so budget_intentions/expense_settlements visibility and
-- creation scoping (which already key off this function) cover delegates for free.
CREATE OR REPLACE FUNCTION get_my_active_ministries()
RETURNS SETOF UUID LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT ministry_id FROM ministry_assignments WHERE user_id = auth.uid() AND unassigned_at IS NULL
  UNION
  SELECT ministry_id FROM ministry_delegates WHERE user_id = auth.uid()
$$;

-- Separate, narrower helper for "ministries I am THE MINISTER of" — used to gate
-- who may manage delegates (ADMIN/BURSAR, or the assigned minister themself; a
-- delegate must not be able to add/remove other delegates).
CREATE OR REPLACE FUNCTION get_my_ministries_as_minister()
RETURNS SETOF UUID LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT ministry_id FROM ministry_assignments WHERE user_id = auth.uid() AND unassigned_at IS NULL
$$;

CREATE POLICY "ministry_delegates_select" ON ministry_delegates
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "ministry_delegates_insert" ON ministry_delegates
  FOR INSERT TO authenticated
  WITH CHECK (
    get_my_role() IN ('ADMIN', 'BURSAR')
    OR ministry_id IN (SELECT get_my_ministries_as_minister())
  );

CREATE POLICY "ministry_delegates_delete" ON ministry_delegates
  FOR DELETE TO authenticated
  USING (
    get_my_role() IN ('ADMIN', 'BURSAR')
    OR ministry_id IN (SELECT get_my_ministries_as_minister())
  );

-- DELEGATE gets identical permissions to MINISTER (CREATE_REQUEST, CREATE_SETTLEMENT,
-- VIEW_WORKFLOW) — see role_permissions rows for MINISTER seeded in
-- 20260429151749_add_role_permissions_table.sql / 20260717030809_split_submit_intentions_permission.sql.
INSERT INTO role_permissions (role, permission, enabled) VALUES
  ('DELEGATE', 'CREATE_REQUEST', true),
  ('DELEGATE', 'CREATE_SETTLEMENT', true),
  ('DELEGATE', 'VIEW_WORKFLOW', true);

-- budget_intentions_insert / expense_settlements_insert (20260501000002_workflow_authenticated_rls.sql)
-- literal-check get_my_role() = 'MINISTER' rather than going through
-- get_my_active_ministries(), so DELEGATE needs to be added explicitly here too.
DROP POLICY IF EXISTS "budget_intentions_insert" ON budget_intentions;
CREATE POLICY "budget_intentions_insert" ON budget_intentions
  FOR INSERT TO authenticated
  WITH CHECK (
    get_my_role() = 'ADMIN'
    OR (get_my_role() IN ('MINISTER', 'DELEGATE') AND requested_by = auth.uid())
  );

DROP POLICY IF EXISTS "expense_settlements_insert" ON expense_settlements;
CREATE POLICY "expense_settlements_insert" ON expense_settlements
  FOR INSERT TO authenticated
  WITH CHECK (
    get_my_role() = 'ADMIN'
    OR (get_my_role() IN ('MINISTER', 'DELEGATE') AND submitted_by = auth.uid())
  );
