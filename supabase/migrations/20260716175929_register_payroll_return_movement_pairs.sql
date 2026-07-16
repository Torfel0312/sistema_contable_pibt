-- register_payroll() returned only the payroll_records id, forcing the caller to
-- re-fetch payroll_movements ordered by created_at to reconstruct which movement
-- corresponds to which input line (for attaching receipts + audit logging). Every
-- row inserted in one call shares the same transaction-scoped now(), so that ORDER
-- BY had no real tiebreaker and could misattach a line's attachment/audit entry to
-- the wrong movement. Returning the (kind, movement_id) pairs directly, in the exact
-- order they were created, removes the guesswork entirely.

DROP FUNCTION IF EXISTS register_payroll(DATE, TEXT, UUID, UUID, JSONB);

CREATE OR REPLACE FUNCTION register_payroll(
  p_period DATE,
  p_liquidacion_reference TEXT,
  p_category_id UUID,
  p_created_by_id UUID,
  p_lines JSONB
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_record_id UUID;
  v_movement_id UUID;
  v_folio INTEGER;
  v_line JSONB;
  v_movements JSONB := '[]'::jsonb;
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

    v_movements := v_movements || jsonb_build_object('movement_id', v_movement_id, 'kind', v_line->>'kind');
  END LOOP;

  RETURN jsonb_build_object('record_id', v_record_id, 'movements', v_movements);
END;
$$;

REVOKE EXECUTE ON FUNCTION register_payroll(DATE, TEXT, UUID, UUID, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION register_payroll(DATE, TEXT, UUID, UUID, JSONB) TO service_role;
