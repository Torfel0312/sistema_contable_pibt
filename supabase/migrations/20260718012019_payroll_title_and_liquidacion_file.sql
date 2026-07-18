-- payroll_movements.kind was already deliberately free TEXT (see comment in
-- 20260716172924_payroll_and_severance_reserve.sql) — renaming it to `title`
-- now that the UI drops the fixed SALARY/CONTRIBUTIONS/OTHER dropdown in favor
-- of a genuinely freeform label per transfer (e.g. "Sueldo pastor").
ALTER TABLE payroll_movements RENAME COLUMN kind TO title;

-- Liquidación reference was a free-text field; it becomes an actual uploaded
-- file (same driveFileId/driveViewLink/... shape as movement_attachments),
-- attached to the payroll record itself rather than to any single transfer.
ALTER TABLE payroll_records DROP COLUMN liquidacion_reference;
ALTER TABLE payroll_records
  ADD COLUMN liquidacion_drive_file_id TEXT,
  ADD COLUMN liquidacion_drive_view_link TEXT,
  ADD COLUMN liquidacion_file_name TEXT,
  ADD COLUMN liquidacion_mime_type TEXT,
  ADD COLUMN liquidacion_size_bytes INTEGER;

-- register_payroll() no longer takes a liquidacion reference param (the file
-- is attached via a follow-up UPDATE from the service, same pattern as
-- movement attachments) and inserts `title` instead of `kind` per line.
-- Signature changes, so the old overload must be dropped explicitly.
DROP FUNCTION IF EXISTS register_payroll(DATE, TEXT, UUID, UUID, JSONB);

CREATE OR REPLACE FUNCTION register_payroll(
  p_period DATE,
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
  INSERT INTO payroll_records (period, created_by_id)
  VALUES (date_trunc('month', p_period)::date, p_created_by_id)
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

    INSERT INTO payroll_movements (payroll_record_id, movement_id, title)
    VALUES (v_record_id, v_movement_id, v_line->>'title');

    v_movements := v_movements || jsonb_build_object('movement_id', v_movement_id, 'title', v_line->>'title');
  END LOOP;

  RETURN jsonb_build_object('record_id', v_record_id, 'movements', v_movements);
END;
$$;

REVOKE EXECUTE ON FUNCTION register_payroll(DATE, UUID, UUID, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION register_payroll(DATE, UUID, UUID, JSONB) TO service_role;
