CREATE TABLE inbound_email_routes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  local_part  TEXT NOT NULL CHECK (local_part ~ '^[a-z0-9._-]+$'),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_by  UUID REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (local_part, user_id)
);

CREATE INDEX inbound_email_routes_local_part_idx ON inbound_email_routes (local_part);

ALTER TABLE inbound_email_routes ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- inbound_email_routes — readable by any authenticated user, ADMIN writes
-- (mirrors app_settings: reference/config data, ADMIN only)
-- ============================================================
CREATE POLICY "inbound_email_routes_select" ON inbound_email_routes
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "inbound_email_routes_insert" ON inbound_email_routes
  FOR INSERT TO authenticated
  WITH CHECK (get_my_role() = 'ADMIN');

CREATE POLICY "inbound_email_routes_delete" ON inbound_email_routes
  FOR DELETE TO authenticated
  USING (get_my_role() = 'ADMIN');
