/*
  # Enable pg_net Extension and Fix Notification System

  1. Changes
    - Enable pg_net extension for HTTP requests from database functions
    - Update notification functions to use correct settings
    - Add helper function to get Supabase URL
    
  2. Notes
    - pg_net is required for database functions to call edge functions
    - This will enable email notifications for new appointments
*/

-- Enable pg_net extension
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Grant usage to service role
GRANT USAGE ON SCHEMA net TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA net TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA net TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA net TO postgres, anon, authenticated, service_role;

-- Update notify_admin_new_appointment function with better error handling
CREATE OR REPLACE FUNCTION notify_admin_new_appointment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  webhook_url text;
  request_id bigint;
BEGIN
  -- Get Supabase URL from environment or use default
  BEGIN
    webhook_url := current_setting('app.settings.supabase_url', true);
  EXCEPTION
    WHEN OTHERS THEN
      webhook_url := 'https://ftprkjvvayvbtnbpmqen.supabase.co';
  END;
  
  webhook_url := webhook_url || '/functions/v1/send-appointment-notification';
  
  -- Make async HTTP POST request
  SELECT net.http_post(
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
  ) INTO request_id;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the appointment insert
    RAISE WARNING 'Failed to send notification: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Update notify_appointment_change function with better settings handling
CREATE OR REPLACE FUNCTION notify_appointment_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  notification_type text;
  supabase_url text;
  function_url text;
  request_id bigint;
BEGIN
  -- Get Supabase URL
  BEGIN
    supabase_url := current_setting('app.settings.supabase_url', true);
  EXCEPTION
    WHEN OTHERS THEN
      supabase_url := 'https://ftprkjvvayvbtnbpmqen.supabase.co';
  END;
  
  IF supabase_url IS NULL OR supabase_url = '' THEN
    supabase_url := 'https://ftprkjvvayvbtnbpmqen.supabase.co';
  END IF;
  
  function_url := supabase_url || '/functions/v1/send-notification';
  
  -- Determine notification type
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
  
  -- Make async HTTP POST request
  SELECT net.http_post(
    url := function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'appointmentId', NEW.id::text,
      'notificationType', notification_type
    )
  ) INTO request_id;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to send notification: %', SQLERRM;
    RETURN NEW;
END;
$$;