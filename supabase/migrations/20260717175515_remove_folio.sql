-- Folio was a sequential tracking number with no real use for the church's
-- workflow (movements are already tracked by id/date). Dropping it end-to-end:
-- the generated display column, the base column, the atomic-increment RPC,
-- and the singleton counter table it was backed by.

DROP INDEX IF EXISTS idx_movements_folio_display;

ALTER TABLE movements DROP COLUMN folio_display;
ALTER TABLE movements DROP COLUMN folio;

-- register_payroll() inserted movements via a direct folio_counter increment
-- (it doesn't go through the app-level movements service) — recreate it
-- without that step. Only the movements INSERT changes; everything else is
-- identical to the version created in 20260716175929_register_payroll_return_movement_pairs.sql.
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
  v_line JSONB;
  v_movements JSONB := '[]'::jsonb;
BEGIN
  INSERT INTO payroll_records (period, liquidacion_reference, created_by_id)
  VALUES (date_trunc('month', p_period)::date, p_liquidacion_reference, p_created_by_id)
  RETURNING id INTO v_record_id;

  FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines)
  LOOP
    INSERT INTO movements (
      movement_date, movement_type, amount, category_id,
      delivered_by, created_by_id, notes
    ) VALUES (
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

DROP FUNCTION IF EXISTS increment_and_get_folio();
DROP TABLE IF EXISTS folio_counter;
