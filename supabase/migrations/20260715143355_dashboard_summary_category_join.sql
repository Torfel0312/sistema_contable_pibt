-- get_dashboard_summary's categoryBreakdown grouped by the raw
-- movements.category text column, which no longer exists (replaced by
-- category_id). Join movement_categories and group by its name instead.
-- Signature, return shape, and all other behavior are unchanged, so
-- existing grants (see 20260501000003_revoke_security_definer_grants.sql)
-- carry over automatically under CREATE OR REPLACE.

CREATE OR REPLACE FUNCTION get_dashboard_summary(
  p_from DATE DEFAULT NULL,
  p_to   DATE DEFAULT NULL
)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  v_total_income   NUMERIC;
  v_total_expense  NUMERIC;
  v_count          BIGINT;
  v_series         JSONB;
  v_categories     JSONB;
BEGIN
  SELECT
    COALESCE(SUM(CASE WHEN movement_type = 'INCOME' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN movement_type = 'EXPENSE' THEN amount ELSE 0 END), 0),
    COUNT(*)
  INTO v_total_income, v_total_expense, v_count
  FROM movements
  WHERE status = 'ACTIVE'
    AND (p_from IS NULL OR movement_date >= p_from)
    AND (p_to   IS NULL OR movement_date <= p_to);

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object('month', month_key, 'income', income, 'expense', expense)
      ORDER BY month_trunc
    ),
    '[]'::jsonb
  )
  INTO v_series
  FROM (
    SELECT
      DATE_TRUNC('month', movement_date)                     AS month_trunc,
      to_char(DATE_TRUNC('month', movement_date), 'YYYY-MM') AS month_key,
      COALESCE(SUM(CASE WHEN movement_type = 'INCOME' THEN amount ELSE 0 END), 0) AS income,
      COALESCE(SUM(CASE WHEN movement_type = 'EXPENSE' THEN amount ELSE 0 END), 0) AS expense
    FROM movements
    WHERE status = 'ACTIVE'
      AND (p_from IS NULL OR movement_date >= p_from)
      AND (p_to   IS NULL OR movement_date <= p_to)
    GROUP BY DATE_TRUNC('month', movement_date)
  ) AS monthly;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object('category', category, 'total', total)
      ORDER BY total DESC
    ),
    '[]'::jsonb
  )
  INTO v_categories
  FROM (
    SELECT movement_categories.name AS category, SUM(movements.amount) AS total
    FROM movements
    JOIN movement_categories ON movement_categories.id = movements.category_id
    WHERE movements.status = 'ACTIVE'
      AND (p_from IS NULL OR movements.movement_date >= p_from)
      AND (p_to   IS NULL OR movements.movement_date <= p_to)
    GROUP BY movement_categories.name
    ORDER BY total DESC
    LIMIT 8
  ) AS cats;

  RETURN jsonb_build_object(
    'totalIncome',       v_total_income,
    'totalExpense',      v_total_expense,
    'movementCount',     v_count,
    'series',            v_series,
    'categoryBreakdown', v_categories
  );
END;
$$;
