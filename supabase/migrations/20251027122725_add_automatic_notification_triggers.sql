/*
  # Add Automatic Notification Triggers

  ## Overview
  This migration adds database triggers that automatically send notifications to clients
  when appointments are created, updated, or cancelled.

  ## Changes
  1. Create function to invoke the send-notification edge function
  2. Add triggers on appointments table for:
     - New bookings (INSERT)
     - Booking changes (UPDATE)
     - Booking cancellations (UPDATE status to cancelled)

  ## Security
  - Function runs with SECURITY DEFINER to have necessary permissions
  - Only triggers on relevant status changes to avoid spam
*/

-- Function to call the send-notification edge function
CREATE OR REPLACE FUNCTION notify_appointment_change()
RETURNS TRIGGER AS $$
DECLARE
  notification_type text;
  supabase_url text;
  supabase_key text;
  function_url text;
BEGIN
  supabase_url := current_setting('app.settings.supabase_url', true);
  supabase_key := current_setting('app.settings.supabase_service_key', true);
  
  IF supabase_url IS NULL THEN
    supabase_url := 'https://ftprkjvvayvbtnbpmqen.supabase.co';
  END IF;
  
  function_url := supabase_url || '/functions/v1/send-notification';

  IF TG_OP = 'INSERT' THEN
    notification_type := 'booking_confirmed';
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
      notification_type := 'booking_cancelled';
    ELSIF NEW.appointment_date != OLD.appointment_date OR NEW.start_time != OLD.start_time THEN
      notification_type := 'booking_changed';
    ELSE
      RETURN NEW;
    END IF;
  ELSE
    RETURN NEW;
  END IF;

  PERFORM
    net.http_post(
      url := function_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || supabase_key
      ),
      body := jsonb_build_object(
        'appointmentId', NEW.id::text,
        'notificationType', notification_type
      )
    );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to send notification: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new appointments
DROP TRIGGER IF EXISTS trigger_new_appointment_notification ON appointments;
CREATE TRIGGER trigger_new_appointment_notification
  AFTER INSERT ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION notify_appointment_change();

-- Trigger for appointment updates
DROP TRIGGER IF EXISTS trigger_appointment_update_notification ON appointments;
CREATE TRIGGER trigger_appointment_update_notification
  AFTER UPDATE ON appointments
  FOR EACH ROW
  WHEN (
    NEW.status = 'cancelled' AND OLD.status != 'cancelled'
    OR NEW.appointment_date != OLD.appointment_date
    OR NEW.start_time != OLD.start_time
  )
  EXECUTE FUNCTION notify_appointment_change();