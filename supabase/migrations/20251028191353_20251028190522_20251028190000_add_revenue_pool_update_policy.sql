/*
  # Add distribution percentage to revenue pool

  Allows admin to control what percentage of the fund is distributed to barbers.
  The rest is reserved/blocked.

  Example: If distribution_percentage = 70, only 70% of total_revenue is distributed.
*/

-- Add distribution_percentage column
ALTER TABLE subscription_revenue_pool 
ADD COLUMN IF NOT EXISTS distribution_percentage decimal(5,2) DEFAULT 100.00 NOT NULL;

COMMENT ON COLUMN subscription_revenue_pool.distribution_percentage IS 'Percentage of fund to distribute (e.g., 70.00 = 70%)';

-- Update the view to use distribution_percentage
CREATE OR REPLACE VIEW barber_commissions_by_month AS
SELECT
  bp.month,
  bp.barber_id,
  b.name as barber_name,
  SUM(bp.points_earned) as total_points,
  COUNT(bp.id) as total_services,
  SUM(bp.service_duration_minutes) as total_minutes,
  -- Calcular percentagem de pontos do barbeiro em relação ao total do mês
  ROUND(
    (SUM(bp.points_earned)::decimal / NULLIF(month_totals.total_month_points, 0) * 100),
    2
  ) as points_percentage,
  -- Calcular comissão baseada na percentagem E distribution_percentage
  ROUND(
    (SUM(bp.points_earned)::decimal / NULLIF(month_totals.total_month_points, 0)) *
    COALESCE(srp.total_revenue, 0) *
    (COALESCE(srp.distribution_percentage, 100) / 100),
    2
  ) as commission_amount,
  COALESCE(srp.total_revenue, 0) as monthly_revenue_pool,
  COALESCE(srp.distribution_percentage, 100) as distribution_percentage
FROM barber_points bp
JOIN barbers b ON bp.barber_id = b.id
LEFT JOIN subscription_revenue_pool srp ON srp.month = bp.month
CROSS JOIN LATERAL (
  SELECT SUM(points_earned) as total_month_points
  FROM barber_points
  WHERE month = bp.month
) month_totals
GROUP BY bp.month, bp.barber_id, b.name, month_totals.total_month_points, srp.total_revenue, srp.distribution_percentage
ORDER BY bp.month DESC, total_points DESC;

COMMENT ON VIEW barber_commissions_by_month IS 'Calcula comissões proporcionais baseadas nos pontos e percentagem de distribuição';
