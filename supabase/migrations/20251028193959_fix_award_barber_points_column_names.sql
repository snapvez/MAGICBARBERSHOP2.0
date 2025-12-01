/*
  # Fix award_barber_points function column names

  ## Problem
  The award_barber_points function was trying to insert into column 'points' 
  but the actual column name is 'points_earned' in the barber_points table.

  ## Solution
  Update the function to use the correct column name 'points_earned'.
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
  v_subscription_id uuid;
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    SELECT duration_minutes INTO v_service_duration
    FROM services
    WHERE id = NEW.service_id;

    v_points := COALESCE(v_service_duration, 0);
    v_month := to_char(NEW.appointment_date, 'YYYY-MM');

    IF NEW.subscription_id IS NOT NULL THEN
      v_subscription_id := NEW.subscription_id;
    ELSE
      v_subscription_id := NULL;
    END IF;

    INSERT INTO barber_points (
      barber_id,
      appointment_id,
      subscription_id,
      month,
      points_earned,
      service_duration_minutes
    ) VALUES (
      NEW.barber_id,
      NEW.id,
      v_subscription_id,
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
