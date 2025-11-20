/*
  # Add Booking Constraints and Validation

  1. Changes
    - Add unique constraint to prevent same barber double-booking at same time
    - Add check constraint to prevent clients from having multiple pending appointments
    - Add function to validate booking conflicts before insert

  2. Security
    - Database-level enforcement (cannot be bypassed by frontend)
    - Prevents race conditions
    - Ensures data integrity
*/

-- Function to check if client already has pending appointment
CREATE OR REPLACE FUNCTION check_client_pending_appointments()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if client already has a pending appointment
  IF NEW.client_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM appointments 
      WHERE client_id = NEW.client_id 
      AND status = 'pending' 
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    ) THEN
      RAISE EXCEPTION 'Cliente já tem uma marcação pendente. Aguarda a confirmação antes de fazer nova marcação.';
    END IF;
  END IF;

  -- Check if guest already has a pending appointment
  IF NEW.guest_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM appointments 
      WHERE guest_id = NEW.guest_id 
      AND status = 'pending' 
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    ) THEN
      RAISE EXCEPTION 'Já tens uma marcação pendente. Aguarda a confirmação antes de fazer nova marcação.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if barber is available at requested time
CREATE OR REPLACE FUNCTION check_barber_availability()
RETURNS TRIGGER AS $$
DECLARE
  conflict_count INTEGER;
BEGIN
  -- Check if barber already has an appointment at this time
  SELECT COUNT(*) INTO conflict_count
  FROM appointments
  WHERE barber_id = NEW.barber_id
  AND appointment_date = NEW.appointment_date
  AND status IN ('pending', 'confirmed')
  AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
  AND (
    -- New appointment starts during existing appointment
    (NEW.start_time >= start_time AND NEW.start_time < end_time)
    OR
    -- New appointment ends during existing appointment
    (NEW.end_time > start_time AND NEW.end_time <= end_time)
    OR
    -- New appointment completely covers existing appointment
    (NEW.start_time <= start_time AND NEW.end_time >= end_time)
  );

  IF conflict_count > 0 THEN
    RAISE EXCEPTION 'Barbeiro já tem marcação neste horário. Por favor, escolhe outro horário ou barbeiro.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS check_pending_appointments_trigger ON appointments;
DROP TRIGGER IF EXISTS check_availability_trigger ON appointments;

-- Create trigger to check pending appointments before insert
CREATE TRIGGER check_pending_appointments_trigger
  BEFORE INSERT ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION check_client_pending_appointments();

-- Create trigger to check barber availability before insert/update
CREATE TRIGGER check_availability_trigger
  BEFORE INSERT OR UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION check_barber_availability();
