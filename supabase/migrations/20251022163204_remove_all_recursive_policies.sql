/*
  # Remove All Recursive Policies from admin_users

  1. Changes
    - Drop ALL policies on admin_users table
    - Create ONLY non-recursive policy for viewing own record
    - No management policies to avoid recursion

  2. Security
    - Users can view their own admin record
    - Management must be done via service role or SQL
*/

-- Drop ALL existing policies
DROP POLICY IF EXISTS "Users can view own admin record" ON admin_users;
DROP POLICY IF EXISTS "Super admins manage all" ON admin_users;

-- Create simple non-recursive policy
CREATE POLICY "View own admin record"
  ON admin_users
  FOR SELECT
  TO authenticated
  USING (auth_user_id = auth.uid());