/*
  # Fix award_barber_points to remove subscription_id reference

  ## Problem
  The award_barber_points function was trying to access NEW.subscription_id
  but this column doesn't exist in the appointments table, causing errors
  when marking appointments as completed.

  ## Solution
  Remove all references to subscription_id from the function since appointments
  don't have a direct subscription_id field.
*/

CREATE OR REPLACE FUNCTION award_barber_points()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_service_duration integer;
  v_points integer;
  v_month text;
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    SELECT duration_minutes INTO v_service_duration
    FROM services
    WHERE id = NEW.service_id;

    v_points := COALESCE(v_service_duration, 0);
    v_month := to_char(NEW.appointment_date, 'YYYY-MM');

    INSERT INTO barber_points (
      barber_id,
      appointment_id,
      month,
      points_earned,
      service_duration_minutes
    ) VALUES (
      NEW.barber_id,
      NEW.id,
      v_month,
      v_points,
      v_service_duration
    )
    ON CONFLICT (appointment_id) 
    DO UPDATE SET
      points_earned = v_points,
      service_duration_minutes = v_service_duration,
      completed_at = now();
  END IF;

  RETURN NEW;
END;
$$;
