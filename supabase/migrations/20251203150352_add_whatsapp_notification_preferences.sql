/*
  # Add WhatsApp Notification Preferences

  1. Changes
    - Add `notification_preference` column to `profiles` table (options: 'sms', 'whatsapp', 'both')
    - Add `notification_preference` column to `guests` table
    - Add `whatsapp_number` column to both tables for separate WhatsApp numbers if needed
    - Add `admin_notification_channel` to `system_settings` table for admin notifications
    - Update RLS policies to allow users to update their own notification preferences
    
  2. Security
    - Users can only update their own notification preferences
    - Guests preferences are managed by the system
    - Admin settings are restricted to admin users
*/

-- Add notification preference to profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'notification_preference'
  ) THEN
    ALTER TABLE profiles ADD COLUMN notification_preference text DEFAULT 'sms' CHECK (notification_preference IN ('sms', 'whatsapp', 'both'));
  END IF;
END $$;

-- Add WhatsApp number field to profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'whatsapp_number'
  ) THEN
    ALTER TABLE profiles ADD COLUMN whatsapp_number text;
  END IF;
END $$;

-- Add notification preference to guests table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'guests' AND column_name = 'notification_preference'
  ) THEN
    ALTER TABLE guests ADD COLUMN notification_preference text DEFAULT 'whatsapp' CHECK (notification_preference IN ('sms', 'whatsapp', 'both'));
  END IF;
END $$;

-- Add WhatsApp number field to guests
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'guests' AND column_name = 'whatsapp_number'
  ) THEN
    ALTER TABLE guests ADD COLUMN whatsapp_number text;
  END IF;
END $$;

-- Add admin notification channel to system_settings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'system_settings' AND column_name = 'admin_notification_channel'
  ) THEN
    ALTER TABLE system_settings ADD COLUMN admin_notification_channel text DEFAULT 'both' CHECK (admin_notification_channel IN ('sms', 'whatsapp', 'both'));
  END IF;
END $$;

-- Add admin WhatsApp number to system_settings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'system_settings' AND column_name = 'admin_whatsapp_number'
  ) THEN
    ALTER TABLE system_settings ADD COLUMN admin_whatsapp_number text;
  END IF;
END $$;

-- Update RLS policy for profiles to allow users to update their notification preferences
DROP POLICY IF EXISTS "Users can update own notification preferences" ON profiles;
CREATE POLICY "Users can update own notification preferences"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Add comment explaining the notification preference options
COMMENT ON COLUMN profiles.notification_preference IS 'User notification channel preference: sms (text message), whatsapp (WhatsApp message), or both';
COMMENT ON COLUMN guests.notification_preference IS 'Guest notification channel preference: sms (text message), whatsapp (WhatsApp message), or both';
COMMENT ON COLUMN system_settings.admin_notification_channel IS 'Admin notification channel preference: sms (text message), whatsapp (WhatsApp message), or both';