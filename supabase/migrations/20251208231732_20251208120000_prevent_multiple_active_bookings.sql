/*
  # Prevent Multiple Active Bookings per Client

  1. Changes
    - Update client booking validation to prevent ANY active appointment
    - Client can only book if they have NO pending or confirmed appointments
    - Client can only book again after their previous appointment ends (date/time passes)
    - Also blocks completed/cancelled appointments that are in the future

  2. Logic
    - Check for appointments with status IN ('pending', 'confirmed')
    - Check if appointment_date + end_time is in the future
    - If any exists, block new booking

  3. Security
    - Prevents clients from accumulating multiple bookings
    - Ensures fair booking system
    - Database-level enforcement
*/

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS check_pending_appointments_trigger ON appointments;
DROP FUNCTION IF EXISTS check_client_pending_appointments();

-- Enhanced function to check if client has any active appointments
CREATE OR REPLACE FUNCTION check_client_active_appointments()
RETURNS TRIGGER AS $$
DECLARE
  active_appointment_id uuid;
  active_appointment_date date;
  active_appointment_time time;
BEGIN
  -- Check if client (authenticated user) already has an active appointment
  IF NEW.client_id IS NOT NULL THEN
    SELECT id, appointment_date, end_time 
    INTO active_appointment_id, active_appointment_date, active_appointment_time
    FROM appointments 
    WHERE client_id = NEW.client_id 
    AND status IN ('pending', 'confirmed')
    AND (
      -- Appointment is in the future
      appointment_date > CURRENT_DATE
      OR (appointment_date = CURRENT_DATE AND end_time > CURRENT_TIME)
    )
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    LIMIT 1;

    IF active_appointment_id IS NOT NULL THEN
      RAISE EXCEPTION 'Já tens uma marcação ativa. Só podes fazer nova marcação depois da anterior terminar.';
    END IF;
  END IF;

  -- Check if guest already has an active appointment
  IF NEW.guest_id IS NOT NULL THEN
    SELECT id, appointment_date, end_time 
    INTO active_appointment_id, active_appointment_date, active_appointment_time
    FROM appointments 
    WHERE guest_id = NEW.guest_id 
    AND status IN ('pending', 'confirmed')
    AND (
      -- Appointment is in the future
      appointment_date > CURRENT_DATE
      OR (appointment_date = CURRENT_DATE AND end_time > CURRENT_TIME)
    )
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    LIMIT 1;

    IF active_appointment_id IS NOT NULL THEN
      RAISE EXCEPTION 'Já tens uma marcação ativa. Só podes fazer nova marcação depois da anterior terminar.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to check active appointments before insert
CREATE TRIGGER check_active_appointments_trigger
  BEFORE INSERT ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION check_client_active_appointments();

-- Add helpful comment
COMMENT ON FUNCTION check_client_active_appointments() IS 'Prevents clients from booking multiple appointments. Clients must wait until their current appointment ends before booking again.';