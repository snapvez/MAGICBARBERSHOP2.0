/*
  # Add Barber Services, Profile Photo and Tax ID

  1. New Tables
    - `barber_services` - Many-to-many relationship between barbers and services
      - `id` (uuid, primary key)
      - `barber_id` (uuid, foreign key to barbers)
      - `service_id` (uuid, foreign key to services)
      - `created_at` (timestamp)
  
  2. Changes to Existing Tables
    - Add `profile_photo_url` to `barbers` table for barber profile pictures
    - Add `tax_id` (NIF) to `profiles` table for client tax identification
  
  3. Storage
    - Create storage bucket `barber-photos` for barber profile pictures
    - Enable public access for profile photos
  
  4. Security
    - Enable RLS on `barber_services` table
    - Only admins can manage barber services
    - Public can view barber services
    - Barber photos are publicly accessible
    - Users can only update their own tax_id
*/

-- Add profile photo URL to barbers table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'barbers' AND column_name = 'profile_photo_url'
  ) THEN
    ALTER TABLE barbers ADD COLUMN profile_photo_url text;
  END IF;
END $$;

-- Add tax_id (NIF) to profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'tax_id'
  ) THEN
    ALTER TABLE profiles ADD COLUMN tax_id text;
  END IF;
END $$;

-- Add constraint to validate Portuguese NIF format (9 digits)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'profiles' AND constraint_name = 'profiles_tax_id_check'
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_tax_id_check 
      CHECK (tax_id IS NULL OR tax_id ~ '^[0-9]{9}$');
  END IF;
END $$;

-- Create barber_services junction table
CREATE TABLE IF NOT EXISTS barber_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barber_id uuid NOT NULL REFERENCES barbers(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(barber_id, service_id)
);

-- Enable RLS on barber_services
ALTER TABLE barber_services ENABLE ROW LEVEL SECURITY;

-- Public can view barber services (needed for booking)
DROP POLICY IF EXISTS "Anyone can view barber services" ON barber_services;
CREATE POLICY "Anyone can view barber services"
  ON barber_services
  FOR SELECT
  TO public
  USING (true);

-- Only admins can insert barber services
DROP POLICY IF EXISTS "Admins can insert barber services" ON barber_services;
CREATE POLICY "Admins can insert barber services"
  ON barber_services
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.auth_user_id = auth.uid()
    )
  );

-- Only admins can delete barber services
DROP POLICY IF EXISTS "Admins can delete barber services" ON barber_services;
CREATE POLICY "Admins can delete barber services"
  ON barber_services
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.auth_user_id = auth.uid()
    )
  );

-- Create storage bucket for barber photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('barber-photos', 'barber-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public to read barber photos
DROP POLICY IF EXISTS "Public can view barber photos" ON storage.objects;
CREATE POLICY "Public can view barber photos"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'barber-photos');

-- Allow admins to upload barber photos
DROP POLICY IF EXISTS "Admins can upload barber photos" ON storage.objects;
CREATE POLICY "Admins can upload barber photos"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'barber-photos' AND
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.auth_user_id = auth.uid()
    )
  );

-- Allow admins to update barber photos
DROP POLICY IF EXISTS "Admins can update barber photos" ON storage.objects;
CREATE POLICY "Admins can update barber photos"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'barber-photos' AND
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.auth_user_id = auth.uid()
    )
  );

-- Allow admins to delete barber photos
DROP POLICY IF EXISTS "Admins can delete barber photos" ON storage.objects;
CREATE POLICY "Admins can delete barber photos"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'barber-photos' AND
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.auth_user_id = auth.uid()
    )
  );

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_barber_services_barber_id ON barber_services(barber_id);
CREATE INDEX IF NOT EXISTS idx_barber_services_service_id ON barber_services(service_id);
CREATE INDEX IF NOT EXISTS idx_profiles_tax_id ON profiles(tax_id);

-- Add comments
COMMENT ON COLUMN barbers.profile_photo_url IS 'URL to barber profile photo stored in Supabase Storage';
COMMENT ON COLUMN profiles.tax_id IS 'Portuguese Tax ID (NIF) - 9 digits';
COMMENT ON TABLE barber_services IS 'Junction table linking barbers to services they can perform';