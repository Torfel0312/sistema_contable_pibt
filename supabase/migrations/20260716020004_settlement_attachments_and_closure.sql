-- Etapa 5: multi-attachment settlements (replacing the single attachment_url),
-- a closing-proof attachment set at the intention level (one closing transfer
-- can cover several settlements), and a cheap "is this request's settlement
-- flow fully closed" flag. Same Drive-backed pattern as movement_attachments
-- (Etapa 1) — no Supabase Storage bucket, no backfill (no real data to
-- preserve on attachment_url).

ALTER TABLE budget_intentions ADD COLUMN settlement_closed_at TIMESTAMPTZ;

CREATE TABLE settlement_attachments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  settlement_id    UUID NOT NULL REFERENCES expense_settlements(id),
  drive_file_id    TEXT NOT NULL,
  drive_view_link  TEXT NOT NULL,
  file_name        TEXT NOT NULL,
  mime_type        TEXT NOT NULL,
  size_bytes       INTEGER NOT NULL,
  created_by_id    UUID NOT NULL REFERENCES users(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_settlement_attachments_settlement ON settlement_attachments(settlement_id);

CREATE TABLE intention_attachments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intention_id     UUID NOT NULL REFERENCES budget_intentions(id),
  drive_file_id    TEXT NOT NULL,
  drive_view_link  TEXT NOT NULL,
  file_name        TEXT NOT NULL,
  mime_type        TEXT NOT NULL,
  size_bytes       INTEGER NOT NULL,
  created_by_id    UUID NOT NULL REFERENCES users(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_intention_attachments_intention ON intention_attachments(intention_id);

ALTER TABLE expense_settlements DROP COLUMN attachment_url;

-- ── RLS ───────────────────────────────────────────────────────
ALTER TABLE settlement_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE intention_attachments  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_bypass" ON settlement_attachments USING (auth.role() = 'service_role');
CREATE POLICY "service_role_bypass" ON intention_attachments  USING (auth.role() = 'service_role');

-- settlement_attachments: visible to whoever can see the parent settlement
-- (delegates to expense_settlements_select via the subquery running under
-- that table's own RLS); insertable by tesorería or the minister who owns
-- the settlement; only that same minister can remove one, and only while
-- the settlement hasn't been picked up for review yet.
CREATE POLICY "settlement_attachments_select" ON settlement_attachments
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM expense_settlements es WHERE es.id = settlement_attachments.settlement_id));

CREATE POLICY "settlement_attachments_insert" ON settlement_attachments
  FOR INSERT TO authenticated
  WITH CHECK (
    get_my_role() IN ('ADMIN', 'BURSAR')
    OR EXISTS (
      SELECT 1 FROM expense_settlements es
      WHERE es.id = settlement_attachments.settlement_id AND es.submitted_by = auth.uid()
    )
  );

CREATE POLICY "settlement_attachments_delete" ON settlement_attachments
  FOR DELETE TO authenticated
  USING (
    get_my_role() IN ('ADMIN', 'BURSAR')
    OR EXISTS (
      SELECT 1 FROM expense_settlements es
      WHERE es.id = settlement_attachments.settlement_id
        AND es.submitted_by = auth.uid()
        AND es.status IN ('DRAFT', 'PENDING', 'RETURNED_FOR_CORRECTION')
    )
  );

-- intention_attachments: closing proof, tesorería-only to attach, visible to
-- whoever can see the parent intention. No delete policy — closing proof is
-- immutable, same "no deletions" convention as the rest of the app.
CREATE POLICY "intention_attachments_select" ON intention_attachments
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM budget_intentions bi WHERE bi.id = intention_attachments.intention_id));

CREATE POLICY "intention_attachments_insert" ON intention_attachments
  FOR INSERT TO authenticated
  WITH CHECK (get_my_role() IN ('ADMIN', 'BURSAR'));

-- expense_settlements_update: the minister who owns a settlement must be able
-- to submit() (DRAFT -> PENDING) and cancel() it themselves; tesorería's
-- startReview()/review() transitions are still covered by the existing
-- ADMIN/BURSAR clause. The service layer enforces which transitions are
-- actually legal for which role — this policy only gates row ownership.
DROP POLICY IF EXISTS "expense_settlements_update" ON expense_settlements;
CREATE POLICY "expense_settlements_update" ON expense_settlements
  FOR UPDATE TO authenticated
  USING (get_my_role() IN ('ADMIN', 'BURSAR') OR submitted_by = auth.uid())
  WITH CHECK (get_my_role() IN ('ADMIN', 'BURSAR') OR submitted_by = auth.uid());
