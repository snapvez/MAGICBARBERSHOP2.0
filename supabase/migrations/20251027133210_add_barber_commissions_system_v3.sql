/*
  # Add Barber Commissions System

  1. Changes to Tables
    - Add commission_percentage column to barbers table
      - Stores the percentage of commission each barber receives (e.g., 28.57 for 28.57%)
      - Default is 50% (50.00)
    
  2. Security
    - Only admins can modify commission percentages
*/

-- Add commission percentage to barbers table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'barbers' AND column_name = 'commission_percentage'
  ) THEN
    ALTER TABLE barbers ADD COLUMN commission_percentage decimal(5,2) DEFAULT 50.00 NOT NULL;
    COMMENT ON COLUMN barbers.commission_percentage IS 'Commission percentage for the barber (e.g., 28.57 for 28.57%)';
  END IF;
END $$;

-- Update barbers RLS to allow admins to update commission percentage
DROP POLICY IF EXISTS "Admins can update barbers" ON barbers;
CREATE POLICY "Admins can update barbers"
  ON barbers
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