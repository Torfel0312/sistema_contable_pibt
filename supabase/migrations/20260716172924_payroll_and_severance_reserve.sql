-- Etapa 6 — remuneraciones del pastor. Ver docs/plans/06-remuneraciones-pastor.md.
-- Un registro mensual (payroll_records) puede generar N movimientos (sueldo,
-- imposiciones, otros pagos relacionados) via payroll_movements, en vez de columnas
-- fijas para 2 transferencias — el cliente confirmó que no siempre son exactamente 2.

CREATE TABLE payroll_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period DATE NOT NULL,
  liquidacion_reference TEXT,
  created_by_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT payroll_records_period_is_month_start CHECK (EXTRACT(DAY FROM period) = 1)
);
CREATE UNIQUE INDEX payroll_records_period_key ON payroll_records (period);

-- kind is deliberately free TEXT (not an enum), matching the plan's own examples
-- ('SALARY', 'CONTRIBUTIONS', 'OTHER') and this codebase's existing convention for
-- similar free-text classifiers (movement_audit_log.action, system_audit_log.action) —
-- validated at the Zod boundary in lib/validators/payroll.ts, not in the DB.
CREATE TABLE payroll_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_record_id UUID NOT NULL REFERENCES payroll_records(id),
  movement_id UUID NOT NULL REFERENCES movements(id),
  kind TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX payroll_movements_record_idx ON payroll_movements (payroll_record_id);
CREATE INDEX payroll_movements_movement_idx ON payroll_movements (movement_id);

-- Append-only ledger — same philosophy as movement_audit_log: never edit
-- destructively, only add and derive. Current balance = SUM(amount_delta).
CREATE TABLE severance_reserve_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  amount_delta NUMERIC(12, 2) NOT NULL,
  note TEXT NOT NULL,
  created_by_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE payroll_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE severance_reserve_adjustments ENABLE ROW LEVEL SECURITY;

-- Payroll is an ADMIN-only feature (MANAGE_PAYROLL seeded for ADMIN only, below).
-- All writes to payroll_records/payroll_movements go through the register_payroll()
-- RPC (SECURITY DEFINER, service_role-only EXECUTE) for atomicity across N movement
-- inserts — no direct INSERT/UPDATE policy is exposed on either table.
CREATE POLICY "payroll_records_select" ON payroll_records
  FOR SELECT TO authenticated
  USING (get_my_role() = 'ADMIN');

CREATE POLICY "payroll_movements_select" ON payroll_movements
  FOR SELECT TO authenticated
  USING (get_my_role() = 'ADMIN');

-- Unlike payroll_records, this is a single-row insert with no cross-table
-- atomicity concern, so it goes through the regular authenticated client directly.
CREATE POLICY "severance_reserve_adjustments_select" ON severance_reserve_adjustments
  FOR SELECT TO authenticated
  USING (get_my_role() = 'ADMIN');
CREATE POLICY "severance_reserve_adjustments_insert" ON severance_reserve_adjustments
  FOR INSERT TO authenticated
  WITH CHECK (get_my_role() = 'ADMIN');

CREATE OR REPLACE FUNCTION register_payroll(
  p_period DATE,
  p_liquidacion_reference TEXT,
  p_category_id UUID,
  p_created_by_id UUID,
  p_lines JSONB
)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_record_id UUID;
  v_movement_id UUID;
  v_folio INTEGER;
  v_line JSONB;
BEGIN
  INSERT INTO payroll_records (period, liquidacion_reference, created_by_id)
  VALUES (date_trunc('month', p_period)::date, p_liquidacion_reference, p_created_by_id)
  RETURNING id INTO v_record_id;

  FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines)
  LOOP
    UPDATE folio_counter
      SET last_folio = last_folio + 1, updated_at = now()
      WHERE id = 'main'
      RETURNING last_folio INTO v_folio;

    INSERT INTO movements (
      folio, movement_date, movement_type, amount, category_id,
      delivered_by, created_by_id, notes
    ) VALUES (
      v_folio,
      (v_line->>'movement_date')::date,
      'EXPENSE',
      (v_line->>'amount')::numeric,
      p_category_id,
      v_line->>'delivered_by',
      p_created_by_id,
      v_line->>'notes'
    )
    RETURNING id INTO v_movement_id;

    INSERT INTO payroll_movements (payroll_record_id, movement_id, kind)
    VALUES (v_record_id, v_movement_id, v_line->>'kind');
  END LOOP;

  RETURN v_record_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION register_payroll(DATE, TEXT, UUID, UUID, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION register_payroll(DATE, TEXT, UUID, UUID, JSONB) TO service_role;

INSERT INTO role_permissions (role, permission, enabled) VALUES
  ('ADMIN', 'MANAGE_PAYROLL', true);
