/*
  # Add Manual Commission Entries System

  1. New Tables
    - `manual_commission_entries`
      - `id` (uuid, primary key)
      - `barber_id` (uuid, foreign key to barbers)
      - `date` (date) - Date of the work
      - `minutes` (integer) - Minutes worked
      - `description` (text) - Description of the work
      - `amount` (decimal) - Commission amount in euros
      - `created_by` (uuid) - Admin who created the entry
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `commission_settings`
      - `id` (uuid, primary key)
      - `price_per_minute` (decimal) - Price per minute in euros
      - `updated_at` (timestamptz)
      - `updated_by` (uuid) - Admin who updated
  
  2. Security
    - Enable RLS on both tables
    - Only admins can read/write these tables
*/

-- Create manual commission entries table
CREATE TABLE IF NOT EXISTS manual_commission_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barber_id uuid REFERENCES barbers(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  minutes integer NOT NULL DEFAULT 0,
  description text DEFAULT '',
  amount decimal(10,2) NOT NULL DEFAULT 0,
  created_by uuid REFERENCES admin_users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create commission settings table
CREATE TABLE IF NOT EXISTS commission_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  price_per_minute decimal(10,2) NOT NULL DEFAULT 3.87,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES admin_users(id)
);

-- Insert default settings if not exists
INSERT INTO commission_settings (price_per_minute)
SELECT 3.87
WHERE NOT EXISTS (SELECT 1 FROM commission_settings LIMIT 1);

-- Enable RLS
ALTER TABLE manual_commission_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_settings ENABLE ROW LEVEL SECURITY;

-- Policies for manual_commission_entries
CREATE POLICY "Admins can view manual commission entries"
  ON manual_commission_entries
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can insert manual commission entries"
  ON manual_commission_entries
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can update manual commission entries"
  ON manual_commission_entries
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

CREATE POLICY "Admins can delete manual commission entries"
  ON manual_commission_entries
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.auth_user_id = auth.uid()
    )
  );

-- Policies for commission_settings
CREATE POLICY "Admins can view commission settings"
  ON commission_settings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can update commission settings"
  ON commission_settings
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

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_manual_commission_entries_barber_date 
  ON manual_commission_entries(barber_id, date);

CREATE INDEX IF NOT EXISTS idx_manual_commission_entries_date 
  ON manual_commission_entries(date);