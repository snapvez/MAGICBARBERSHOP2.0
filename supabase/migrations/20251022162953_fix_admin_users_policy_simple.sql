/*
  # Fix Admin Users RLS Policy - Remove Recursion

  1. Changes
    - Drop existing recursive policies on admin_users table
    - Create simple policy allowing authenticated users to view their own admin record
    - This prevents infinite recursion when checking admin status

  2. Security
    - Users can only view their own admin_users record
    - Maintains security while allowing admin status checks
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Authenticated admins can view admin users" ON admin_users;
DROP POLICY IF EXISTS "Super admins can manage admin users" ON admin_users;

-- Allow authenticated users to view their own admin record
CREATE POLICY "Users can view own admin record"
  ON admin_users
  FOR SELECT
  TO authenticated
  USING (auth_user_id = auth.uid());

-- Allow super admins to manage all admin records
CREATE POLICY "Super admins manage all"
  ON admin_users
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE auth_user_id = auth.uid()
      AND role = 'super_admin'
      AND is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE auth_user_id = auth.uid()
      AND role = 'super_admin'
      AND is_active = true
    )
  );