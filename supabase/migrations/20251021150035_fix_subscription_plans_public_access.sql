/*
  # Fix Subscription Plans Public Access

  1. Changes
    - Allow anonymous users to view active subscription plans
    - Keep existing authenticated user policy
    - This enables the subscription page to show plans even when not logged in

  2. Security
    - Users can only view active plans (is_active = true)
    - Insert/Update/Delete still requires admin permissions
*/

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Anyone can view active subscription plans" ON subscription_plans;

-- Create new policy that allows public access to view active plans
CREATE POLICY "Public can view active subscription plans"
  ON subscription_plans
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);
