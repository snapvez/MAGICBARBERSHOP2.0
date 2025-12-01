/*
  # Fix RLS for barber_commissions_by_month view

  Views in PostgreSQL need explicit RLS policies or they won't return data even if underlying tables have policies.

  Solution: Grant SELECT permissions to authenticated users with admin privileges on the view.
*/

-- The view barber_commissions_by_month is already created
-- We just need to ensure authenticated admins can query it

-- Grant SELECT on the view to authenticated role
GRANT SELECT ON barber_commissions_by_month TO authenticated;

-- Also grant SELECT on the underlying tables if not already granted
GRANT SELECT ON barber_points TO authenticated;
GRANT SELECT ON subscription_revenue_pool TO authenticated;
GRANT SELECT ON barbers TO authenticated;
