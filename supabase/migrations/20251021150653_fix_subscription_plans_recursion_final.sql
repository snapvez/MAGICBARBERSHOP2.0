/*
  # Fix Infinite Recursion in Subscription Plans Policies

  ## Problem
  When querying subscription_plans, PostgreSQL evaluates ALL policies,
  including the admin policy which checks admin_users table.
  This causes infinite recursion because admin_users policies also
  check the admin_users table.

  ## Solution
  1. Separate public access from admin access with distinct policies
  2. Use a SECURITY DEFINER function for admin checks to break recursion
  3. Ensure public SELECT policy doesn't trigger admin checks

  ## Security
  - Anonymous and authenticated users can view active plans (no admin check needed)
  - Admins can manage plans (using safe SECURITY DEFINER function)
*/

-- Create a safe function to check admin status that won't cause recursion
CREATE OR REPLACE FUNCTION check_is_admin()
RETURNS boolean AS $$
BEGIN
  -- This function uses SECURITY DEFINER to bypass RLS on admin_users
  -- Breaking the recursion loop
  RETURN EXISTS (
    SELECT 1 FROM admin_users
    WHERE auth_user_id = auth.uid() 
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Drop existing problematic policies on subscription_plans
DROP POLICY IF EXISTS "Public can view active subscription plans" ON subscription_plans;
DROP POLICY IF EXISTS "Admins can manage subscription plans" ON subscription_plans;
DROP POLICY IF EXISTS "Anyone can view active subscription plans" ON subscription_plans;

-- Create new public policy that doesn't check admin status at all
CREATE POLICY "Anyone can view active plans"
  ON subscription_plans
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

-- Create admin management policy using the SECURITY DEFINER function
CREATE POLICY "Admins manage plans"
  ON subscription_plans
  FOR ALL
  TO authenticated
  USING (check_is_admin())
  WITH CHECK (check_is_admin());

-- Do the same for client_subscriptions to prevent similar issues
DROP POLICY IF EXISTS "Admins can view all subscriptions" ON client_subscriptions;
DROP POLICY IF EXISTS "Admins can update all subscriptions" ON client_subscriptions;

CREATE POLICY "Admins view all subscriptions"
  ON client_subscriptions
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = client_id OR check_is_admin()
  );

CREATE POLICY "Admins update all subscriptions"
  ON client_subscriptions
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = client_id OR check_is_admin()
  )
  WITH CHECK (
    auth.uid() = client_id OR check_is_admin()
  );
