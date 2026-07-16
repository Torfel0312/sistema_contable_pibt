-- Etapa 7 — remanente por ministerio. Ver docs/plans/07-remanente-por-ministerio.md.
-- remanente = monto transferido - SUM(rendiciones APROBADAS), por solicitud, con
-- corte "hasta la fecha" (p_as_of), no un rango con inicio y fin (confirmado).
--
-- Dos filtros deliberados, explicados en el plan:
--   - funding_method = 'TRANSFER': el remanente solo tiene sentido en el camino de
--     transferencia anticipada (Etapa 4) — en REIMBURSEMENT no hay dinero retenido
--     por el ministerio de por medio.
--   - status = 'APPROVED' como lista-blanca explícita, no lista-negra (!= 'REJECTED').
--     Esto es lo que mantiene esta etapa independiente del enum de estados que la
--     Etapa 5 hizo crecer (DRAFT/RETURNED_FOR_CORRECTION nunca cuentan como "rendido").
--
-- Mismo patrón que get_dashboard_summary: SECURITY DEFINER, solo invocable por
-- service_role (llamado siempre vía el cliente admin desde la capa de servicio).
CREATE OR REPLACE FUNCTION get_ministry_leftover_summary(
  p_ministry_id UUID DEFAULT NULL,
  p_as_of DATE DEFAULT CURRENT_DATE
)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb)
  INTO v_result
  FROM (
    SELECT
      m.id AS ministry_id,
      m.name AS ministry_name,
      bi.id AS intention_id,
      bi.purpose,
      it.amount AS transferred_amount,
      COALESCE(s.settled_amount, 0) AS settled_amount,
      it.amount - COALESCE(s.settled_amount, 0) AS leftover
    FROM budget_intentions bi
    JOIN ministries m ON m.id = bi.ministry_id
    JOIN intention_transfers it ON it.intention_id = bi.id
    LEFT JOIN (
      SELECT intention_id, SUM(amount) AS settled_amount
      FROM expense_settlements
      WHERE status = 'APPROVED' AND expense_date <= p_as_of
      GROUP BY intention_id
    ) s ON s.intention_id = bi.id
    WHERE bi.funding_method = 'TRANSFER'
      AND it.transfer_date <= p_as_of
      AND (p_ministry_id IS NULL OR bi.ministry_id = p_ministry_id)
    ORDER BY m.name, bi.created_at
  ) t;

  RETURN v_result;
END;
$$;

REVOKE EXECUTE ON FUNCTION get_ministry_leftover_summary(UUID, DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_ministry_leftover_summary(UUID, DATE) TO service_role;
