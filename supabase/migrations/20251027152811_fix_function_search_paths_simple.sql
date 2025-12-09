/*
  # Fix Function Search Paths for Security

  1. Security Enhancement
    - Set immutable search_path on all functions
    - Prevents search_path manipulation attacks
    - Required for security best practices
    
  2. Strategy
    - Use DO block to dynamically update all functions
    - Avoids parameter signature issues
*/

DO $$
DECLARE
  func_name text;
BEGIN
  FOR func_name IN 
    SELECT DISTINCT routine_name 
    FROM information_schema.routines 
    WHERE routine_schema = 'public' 
    AND routine_type = 'FUNCTION'
    AND routine_name IN (
      'check_is_admin',
      'update_payments_updated_at',
      'is_subscription_valid',
      'record_subscription_payment',
      'check_subscription_on_appointment',
      'is_barber_available',
      'check_subscription_capacity',
      'update_site_content_updated_at',
      'get_barber_active_subscriptions_count',
      'check_barber_subscription_capacity',
      'notify_appointment_change',
      'is_admin',
      'update_updated_at_column'
    )
  LOOP
    EXECUTE format('ALTER FUNCTION %I SET search_path = pg_catalog, public', func_name);
  END LOOP;
END $$;