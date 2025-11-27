/*
  # Fix Infinite Recursion in Admin Users Policies

  ## Problem
  The admin_users table policies use the is_admin() function, which queries
  the admin_users table, creating infinite recursion.

  ## Solution
  1. Drop problematic policies on admin_users
  2. Recreate policies that don't cause recursion
  3. Allow admins to view admin_users by directly checking the table
     without calling is_admin() function

  ## Security
  - Admins can view admin_users (checked directly, no recursion)
  - Super admins can manage admin_users (checked directly, no recursion)
  - All other tables continue to use is_admin() function safely
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Admins can view all admin users" ON admin_users;
DROP POLICY IF EXISTS "Super admins can manage admin users" ON admin_users;

-- Create non-recursive policy for viewing admin users
-- This checks the table directly WITHOUT using is_admin() to avoid recursion
CREATE POLICY "Authenticated admins can view admin users"
  ON admin_users 
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users au
      WHERE au.auth_user_id = auth.uid() 
      AND au.is_active = true
    )
  );

-- Create non-recursive policy for managing admin users
-- Only super admins can insert/update/delete
CREATE POLICY "Super admins can manage admin users"
  ON admin_users 
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users au
      WHERE au.auth_user_id = auth.uid() 
      AND au.role = 'super_admin' 
      AND au.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users au
      WHERE au.auth_user_id = auth.uid() 
      AND au.role = 'super_admin' 
      AND au.is_active = true
    )
  );
