/*
  # Add UPDATE policy for subscription_revenue_pool

  Admins need to be able to update the revenue pool to manually adjust monthly funds.
*/

-- Add UPDATE policy for subscription_revenue_pool
CREATE POLICY "Admins can update revenue pool"
  ON subscription_revenue_pool
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.auth_user_id = auth.uid()
    )
  );

-- Add INSERT policy for subscription_revenue_pool
CREATE POLICY "Admins can insert revenue pool"
  ON subscription_revenue_pool
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.auth_user_id = auth.uid()
    )
  );
