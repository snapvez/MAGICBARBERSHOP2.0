/*
  # Add Admin Roles and Barber Link System

  1. Changes to admin_users table
    - Add `role` column (super_admin or barber)
    - Add `barber_id` column to link admin to specific barber
    - Super admins see everything, barbers see only their data

  2. Security
    - Update RLS policies to respect role permissions
    - Barbers can only see their own appointments and subscriptions
    - Super admins have full access

  3. Notes
    - Existing admins will default to 'super_admin' role
    - Barber role admins must have a valid barber_id
*/

-- Add role and barber_id columns to admin_users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'admin_users' AND column_name = 'role'
  ) THEN
    ALTER TABLE admin_users ADD COLUMN role text DEFAULT 'super_admin' CHECK (role IN ('super_admin', 'barber'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'admin_users' AND column_name = 'barber_id'
  ) THEN
    ALTER TABLE admin_users ADD COLUMN barber_id uuid REFERENCES barbers(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_admin_users_barber_id ON admin_users(barber_id);
CREATE INDEX IF NOT EXISTS idx_admin_users_role ON admin_users(role);

-- Update existing admins to super_admin (if not already set)
UPDATE admin_users SET role = 'super_admin' WHERE role IS NULL;

-- Add constraint: barbers must have a barber_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'admin_users_barber_role_requires_barber_id'
  ) THEN
    ALTER TABLE admin_users 
    ADD CONSTRAINT admin_users_barber_role_requires_barber_id 
    CHECK (role != 'barber' OR barber_id IS NOT NULL);
  END IF;
END $$;

-- Function to check if user is super admin
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM admin_users
    WHERE auth_user_id = auth.uid()
    AND role = 'super_admin'
  );
$$;

-- Function to get barber_id for current admin (if barber role)
CREATE OR REPLACE FUNCTION get_admin_barber_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT barber_id FROM admin_users
  WHERE auth_user_id = auth.uid()
  AND role = 'barber'
  LIMIT 1;
$$;

-- Update appointments RLS for barber admins
DROP POLICY IF EXISTS "Admins can manage all appointments" ON appointments;
DROP POLICY IF EXISTS "Super admins can manage all appointments" ON appointments;
DROP POLICY IF EXISTS "Barber admins can manage their appointments" ON appointments;

CREATE POLICY "Super admins can manage all appointments"
  ON appointments
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE auth_user_id = auth.uid()
      AND role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE auth_user_id = auth.uid()
      AND role = 'super_admin'
    )
  );

CREATE POLICY "Barber admins can manage their appointments"
  ON appointments
  FOR ALL
  TO authenticated
  USING (
    barber_id = get_admin_barber_id()
  )
  WITH CHECK (
    barber_id = get_admin_barber_id()
  );

-- Update client_subscriptions RLS for barber admins
DROP POLICY IF EXISTS "Admins can manage all subscriptions" ON client_subscriptions;
DROP POLICY IF EXISTS "Super admins can manage all subscriptions" ON client_subscriptions;
DROP POLICY IF EXISTS "Barber admins can manage their subscriptions" ON client_subscriptions;

CREATE POLICY "Super admins can manage all subscriptions"
  ON client_subscriptions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE auth_user_id = auth.uid()
      AND role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE auth_user_id = auth.uid()
      AND role = 'super_admin'
    )
  );

CREATE POLICY "Barber admins can manage their subscriptions"
  ON client_subscriptions
  FOR ALL
  TO authenticated
  USING (
    barber_id = get_admin_barber_id()
  )
  WITH CHECK (
    barber_id = get_admin_barber_id()
  );

-- Update manual_commission_entries RLS (only super admins can see)
DROP POLICY IF EXISTS "Admins can view all manual commissions" ON manual_commission_entries;
DROP POLICY IF EXISTS "Admins can manage manual commissions" ON manual_commission_entries;

CREATE POLICY "Super admins can view all manual commissions"
  ON manual_commission_entries
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE auth_user_id = auth.uid()
      AND role = 'super_admin'
    )
  );

CREATE POLICY "Super admins can manage manual commissions"
  ON manual_commission_entries
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE auth_user_id = auth.uid()
      AND role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE auth_user_id = auth.uid()
      AND role = 'super_admin'
    )
  );

-- Update commission_settings RLS (only super admins)
DROP POLICY IF EXISTS "Admins can view commission settings" ON commission_settings;
DROP POLICY IF EXISTS "Admins can manage commission settings" ON commission_settings;

CREATE POLICY "Super admins can view commission settings"
  ON commission_settings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE auth_user_id = auth.uid()
      AND role = 'super_admin'
    )
  );

CREATE POLICY "Super admins can manage commission settings"
  ON commission_settings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE auth_user_id = auth.uid()
      AND role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE auth_user_id = auth.uid()
      AND role = 'super_admin'
    )
  );

-- Update subscription_payments RLS (only super admins)
DROP POLICY IF EXISTS "Admins can view all subscription payments" ON subscription_payments;
DROP POLICY IF EXISTS "Admins can manage subscription payments" ON subscription_payments;
DROP POLICY IF EXISTS "Super admins can view all subscription payments" ON subscription_payments;
DROP POLICY IF EXISTS "Super admins can manage subscription payments" ON subscription_payments;

CREATE POLICY "Super admins can view all subscription payments"
  ON subscription_payments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE auth_user_id = auth.uid()
      AND role = 'super_admin'
    )
  );

CREATE POLICY "Super admins can manage subscription payments"
  ON subscription_payments
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE auth_user_id = auth.uid()
      AND role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE auth_user_id = auth.uid()
      AND role = 'super_admin'
    )
  );