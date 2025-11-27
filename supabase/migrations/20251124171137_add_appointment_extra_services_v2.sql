/*
  # Add Support for Multiple Services per Appointment

  1. New Tables
    - `appointment_services`
      - `id` (uuid, primary key)
      - `appointment_id` (uuid, references appointments)
      - `service_id` (uuid, references services)
      - `price_at_time` (numeric) - Store price at time of service
      - `added_at` (timestamptz) - When the service was added
      - `added_by` (uuid) - Admin who added the service
      - `is_original` (boolean) - True if part of original booking
      
  2. Changes
    - Add `total_price` column to appointments table
    - Create function to calculate appointment total
    
  3. Security
    - Enable RLS on `appointment_services` table
    - Add policies for admins to insert/update/delete services
    - Add policy for clients to view their appointment services
    
  4. Migration Strategy
    - Create new table and relationships
    - Migrate existing appointments (service_id) to appointment_services
    - Keep service_id in appointments for backward compatibility
*/

-- Create appointment_services junction table
CREATE TABLE IF NOT EXISTS appointment_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  price_at_time numeric(10,2) NOT NULL DEFAULT 0,
  added_at timestamptz DEFAULT now(),
  added_by uuid REFERENCES auth.users(id),
  is_original boolean DEFAULT true,
  UNIQUE(appointment_id, service_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_appointment_services_appointment_id ON appointment_services(appointment_id);
CREATE INDEX IF NOT EXISTS idx_appointment_services_service_id ON appointment_services(service_id);
CREATE INDEX IF NOT EXISTS idx_appointment_services_added_at ON appointment_services(added_at);

-- Add total_price column to appointments
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'appointments' AND column_name = 'total_price'
  ) THEN
    ALTER TABLE appointments ADD COLUMN total_price numeric(10,2) DEFAULT 0;
  END IF;
END $$;

-- Enable RLS
ALTER TABLE appointment_services ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can do everything with appointment services
CREATE POLICY "Admins can manage appointment services"
  ON appointment_services
  FOR ALL
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

-- Policy: Clients can view their appointment services
CREATE POLICY "Clients can view own appointment services"
  ON appointment_services
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM appointments
      WHERE appointments.id = appointment_services.appointment_id
      AND appointments.client_id = auth.uid()
    )
  );

-- Policy: Public can view appointment services for guest bookings
CREATE POLICY "Public can view guest appointment services"
  ON appointment_services
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM appointments
      WHERE appointments.id = appointment_services.appointment_id
      AND appointments.guest_id IS NOT NULL
    )
  );

-- Function to calculate and update appointment total price
CREATE OR REPLACE FUNCTION calculate_appointment_total(p_appointment_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total numeric;
BEGIN
  -- Calculate sum of all services for this appointment
  SELECT COALESCE(SUM(price_at_time), 0)
  INTO v_total
  FROM appointment_services
  WHERE appointment_id = p_appointment_id;
  
  -- Update the appointment total
  UPDATE appointments
  SET total_price = v_total
  WHERE id = p_appointment_id;
  
  RETURN v_total;
END;
$$;

-- Trigger to automatically update appointment total when services change
CREATE OR REPLACE FUNCTION update_appointment_total()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Recalculate total for the affected appointment
  IF TG_OP = 'DELETE' THEN
    PERFORM calculate_appointment_total(OLD.appointment_id);
  ELSE
    PERFORM calculate_appointment_total(NEW.appointment_id);
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_update_appointment_total ON appointment_services;
CREATE TRIGGER trigger_update_appointment_total
  AFTER INSERT OR UPDATE OR DELETE ON appointment_services
  FOR EACH ROW
  EXECUTE FUNCTION update_appointment_total();

-- Migrate existing appointment data to appointment_services
INSERT INTO appointment_services (appointment_id, service_id, price_at_time, added_at, is_original)
SELECT 
  a.id,
  a.service_id,
  COALESCE(s.price, 0),
  a.created_at,
  true
FROM appointments a
JOIN services s ON s.id = a.service_id
WHERE a.service_id IS NOT NULL
ON CONFLICT (appointment_id, service_id) DO NOTHING;

-- Update all appointment totals
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT DISTINCT appointment_id FROM appointment_services
  LOOP
    PERFORM calculate_appointment_total(r.appointment_id);
  END LOOP;
END $$;