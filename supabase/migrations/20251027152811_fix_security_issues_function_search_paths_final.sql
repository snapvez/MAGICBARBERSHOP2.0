/*
  # Fix Security Issues - Part 3: Function Search Paths (Final)

  1. Security Improvements
    - Set explicit search_path for all functions using correct signatures
    - This prevents SQL injection attacks
*/

-- Set search_path for functions with no arguments
ALTER FUNCTION check_is_admin() SET search_path = public, pg_temp;
ALTER FUNCTION check_barber_subscription_capacity() SET search_path = public, pg_temp;
ALTER FUNCTION check_subscription_capacity() SET search_path = public, pg_temp;
ALTER FUNCTION check_subscription_on_appointment() SET search_path = public, pg_temp;
ALTER FUNCTION notify_appointment_change() SET search_path = public, pg_temp;
ALTER FUNCTION record_subscription_payment() SET search_path = public, pg_temp;
ALTER FUNCTION update_payments_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION update_site_content_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION update_updated_at_column() SET search_path = public, pg_temp;

-- Set search_path for functions with arguments
ALTER FUNCTION is_admin(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION is_subscription_valid(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION get_barber_active_subscriptions_count(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION is_barber_available(uuid, timestamp with time zone, timestamp with time zone) SET search_path = public, pg_temp;