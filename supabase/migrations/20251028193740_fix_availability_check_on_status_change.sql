/*
  # Fix Availability Check on Status Change

  ## Problem
  The check_barber_availability trigger was blocking status updates to 'completed'
  because it was checking for time conflicts even when only the status changed.

  ## Solution
  Update the function to skip availability checks when:
  - Only the status is changing (not date/time)
  - Status is changing to 'completed' or 'cancelled'
*/

CREATE OR REPLACE FUNCTION check_barber_availability()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  conflict_count INTEGER;
BEGIN
  -- Skip availability check if only status is changing to completed/cancelled
  IF TG_OP = 'UPDATE' THEN
    IF (NEW.status IN ('completed', 'cancelled')) AND 
       (OLD.appointment_date = NEW.appointment_date) AND
       (OLD.start_time = NEW.start_time) AND
       (OLD.end_time = NEW.end_time) AND
       (OLD.barber_id = NEW.barber_id) THEN
      RETURN NEW;
    END IF;
  END IF;

  -- Only check availability for pending/confirmed appointments
  IF NEW.status NOT IN ('pending', 'confirmed') THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO conflict_count
  FROM appointments
  WHERE barber_id = NEW.barber_id
    AND appointment_date = NEW.appointment_date
    AND status IN ('pending', 'confirmed')
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    AND (
      (NEW.start_time >= start_time AND NEW.start_time < end_time)
      OR
      (NEW.end_time > start_time AND NEW.end_time <= end_time)
      OR
      (NEW.start_time <= start_time AND NEW.end_time >= end_time)
    );

  IF conflict_count > 0 THEN
    RAISE EXCEPTION 'Barbeiro já tem marcação neste horário. Por favor, escolhe outro horário ou barbeiro.';
  END IF;

  RETURN NEW;
END;
$$;
