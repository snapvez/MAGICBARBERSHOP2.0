/*
  # Fix Security and Performance Issues

  ## Changes Made

  1. **Foreign Key Indexes**
     - Add missing indexes on all foreign key columns for better query performance
     - Covers: admin_users, appointments, barber_availability_blocks, barber_points, 
       client_subscriptions, commission_settings, manual_commission_entries, 
       payments, subscription_payments

  2. **RLS Policy Optimization**
     - Replace `auth.uid()` with `(select auth.uid())` in all policies
     - Prevents re-evaluation of auth function for each row
     - Significantly improves performance at scale

  3. **Unused Index Cleanup**
     - Remove unused index `idx_barber_points_appointment`

  4. **Function Security**
     - Set search_path for functions to prevent search_path injection attacks
     - Apply to: get_admin_barber_id, award_barber_points
*/

-- ============================================================================
-- 1. ADD MISSING FOREIGN KEY INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_admin_users_barber_id 
  ON admin_users(barber_id);

CREATE INDEX IF NOT EXISTS idx_appointments_barber_id 
  ON appointments(barber_id);

CREATE INDEX IF NOT EXISTS idx_appointments_guest_id 
  ON appointments(guest_id);

CREATE INDEX IF NOT EXISTS idx_appointments_payment_verified_by 
  ON appointments(payment_verified_by);

CREATE INDEX IF NOT EXISTS idx_appointments_service_id 
  ON appointments(service_id);

CREATE INDEX IF NOT EXISTS idx_barber_availability_blocks_barber_id 
  ON barber_availability_blocks(barber_id);

CREATE INDEX IF NOT EXISTS idx_barber_availability_blocks_created_by 
  ON barber_availability_blocks(created_by);

CREATE INDEX IF NOT EXISTS idx_barber_points_subscription_id 
  ON barber_points(subscription_id);

CREATE INDEX IF NOT EXISTS idx_client_subscriptions_guest_id 
  ON client_subscriptions(guest_id);

CREATE INDEX IF NOT EXISTS idx_client_subscriptions_plan_id 
  ON client_subscriptions(plan_id);

CREATE INDEX IF NOT EXISTS idx_commission_settings_updated_by 
  ON commission_settings(updated_by);

CREATE INDEX IF NOT EXISTS idx_manual_commission_entries_barber_id 
  ON manual_commission_entries(barber_id);

CREATE INDEX IF NOT EXISTS idx_manual_commission_entries_created_by 
  ON manual_commission_entries(created_by);

CREATE INDEX IF NOT EXISTS idx_payments_recorded_by 
  ON payments(recorded_by);

CREATE INDEX IF NOT EXISTS idx_payments_subscription_id 
  ON payments(subscription_id);

CREATE INDEX IF NOT EXISTS idx_subscription_payments_created_by 
  ON subscription_payments(created_by);

-- ============================================================================
-- 2. REMOVE UNUSED INDEX
-- ============================================================================

DROP INDEX IF EXISTS idx_barber_points_appointment;

-- ============================================================================
-- 3. OPTIMIZE RLS POLICIES - subscription_revenue_pool
-- ============================================================================

DROP POLICY IF EXISTS "Admins can view revenue pool" ON subscription_revenue_pool;
DROP POLICY IF EXISTS "Admins can insert revenue pool" ON subscription_revenue_pool;
DROP POLICY IF EXISTS "Admins can update revenue pool" ON subscription_revenue_pool;
DROP POLICY IF EXISTS "Admins can manage revenue pool" ON subscription_revenue_pool;

CREATE POLICY "Admins can view revenue pool"
  ON subscription_revenue_pool FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE auth_user_id = (select auth.uid())
    )
  );

CREATE POLICY "Admins can insert revenue pool"
  ON subscription_revenue_pool FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE auth_user_id = (select auth.uid())
    )
  );

CREATE POLICY "Admins can update revenue pool"
  ON subscription_revenue_pool FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE auth_user_id = (select auth.uid())
    )
  );

-- ============================================================================
-- 4. OPTIMIZE RLS POLICIES - barber_points
-- ============================================================================

DROP POLICY IF EXISTS "Admins can view barber points" ON barber_points;
DROP POLICY IF EXISTS "Admins can insert barber points" ON barber_points;

CREATE POLICY "Admins can view barber points"
  ON barber_points FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE auth_user_id = (select auth.uid())
    )
  );

CREATE POLICY "Admins can insert barber points"
  ON barber_points FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE auth_user_id = (select auth.uid())
    )
  );

-- ============================================================================
-- 5. FIX FUNCTION SEARCH PATHS
-- ============================================================================

CREATE OR REPLACE FUNCTION get_admin_barber_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN (
    SELECT barber_id 
    FROM admin_users 
    WHERE auth_user_id = auth.uid() 
    AND role = 'barber_admin'
    LIMIT 1
  );
END;
$$;

CREATE OR REPLACE FUNCTION award_barber_points()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_service_duration integer;
  v_points integer;
  v_month text;
  v_subscription_id uuid;
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    SELECT duration_minutes INTO v_service_duration
    FROM services
    WHERE id = NEW.service_id;

    v_points := COALESCE(v_service_duration, 0);
    v_month := to_char(NEW.appointment_date, 'YYYY-MM');

    IF NEW.subscription_id IS NOT NULL THEN
      v_subscription_id := NEW.subscription_id;
    ELSE
      v_subscription_id := NULL;
    END IF;

    INSERT INTO barber_points (
      barber_id,
      appointment_id,
      subscription_id,
      month,
      points,
      service_duration_minutes
    ) VALUES (
      NEW.barber_id,
      NEW.id,
      v_subscription_id,
      v_month,
      v_points,
      v_service_duration
    )
    ON CONFLICT (appointment_id) 
    DO UPDATE SET
      points = v_points,
      service_duration_minutes = v_service_duration,
      updated_at = now();
  END IF;

  RETURN NEW;
END;
$$;
