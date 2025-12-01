/*
  # Fix Subscription Plans Public Access
  
  1. Changes
    - Allow anonymous users to view active subscription plans
    - Keep admin-only policies for create/update/delete
  
  2. Security
    - Public can only see active plans
    - Only admins can manage plans
*/

-- Drop the old restrictive policies
DROP POLICY IF EXISTS "View plans: active ones or admins see all" ON subscription_plans;
DROP POLICY IF EXISTS "subscription_plans_select_policy" ON subscription_plans;

-- Create new public read policy for active plans
CREATE POLICY "Anyone can view active plans"
  ON subscription_plans
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

-- Admins can view all plans (including inactive)
CREATE POLICY "Admins can view all plans"
  ON subscription_plans
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.auth_user_id = auth.uid()
    )
  );
