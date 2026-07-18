-- ============================================================
-- ADMIN IMPERSONATION
-- Tracks "act as" sessions started by an ADMIN. Service-role only;
-- app-level authorization is enforced in lib/supabase/server.ts.
-- ============================================================

CREATE TABLE impersonation_sessions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  impersonator_id  UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  target_user_id   UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  started_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at       TIMESTAMPTZ NOT NULL,
  ended_at         TIMESTAMPTZ,
  ended_reason     TEXT,
  CHECK (impersonator_id <> target_user_id)
);

CREATE INDEX idx_impersonation_active
  ON impersonation_sessions(impersonator_id)
  WHERE ended_at IS NULL;

-- RLS: service-role only (bypasses RLS); no policies for anon/authenticated.
ALTER TABLE impersonation_sessions ENABLE ROW LEVEL SECURITY;

ALTER TABLE movement_audit_log ADD COLUMN impersonator_id UUID REFERENCES users(id);
ALTER TABLE system_audit_log  ADD COLUMN impersonator_id UUID REFERENCES users(id);
