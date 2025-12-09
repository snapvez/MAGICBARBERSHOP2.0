/*
  # Add Email Notification Trigger for New Appointments

  1. Changes
    - Create trigger function to call edge function when new appointment is inserted
    - Trigger sends notification to admin email automatically
    
  2. Security
    - Uses secure webhook call to edge function
    - Only triggers on INSERT operations
*/

-- Create function to notify admin on new appointment
CREATE OR REPLACE FUNCTION notify_admin_new_appointment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  webhook_url text;
BEGIN
  webhook_url := current_setting('app.settings.supabase_url', true) || '/functions/v1/send-appointment-notification';
  
  PERFORM net.http_post(
    url := webhook_url,
    body := json_build_object(
      'type', TG_OP,
      'table', TG_TABLE_NAME,
      'record', row_to_json(NEW),
      'old_record', NULL
    )::text,
    headers := json_build_object(
      'Content-Type', 'application/json'
    )::jsonb
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NEW;
END;
$$;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS appointment_email_notification_trigger ON appointments;

-- Create trigger for new appointments
CREATE TRIGGER appointment_email_notification_trigger
  AFTER INSERT ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION notify_admin_new_appointment();