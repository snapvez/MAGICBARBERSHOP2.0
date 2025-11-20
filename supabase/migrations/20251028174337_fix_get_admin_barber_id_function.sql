/*
  # Fix get_admin_barber_id Function

  1. Changes
    - Update function to include both 'barber_admin' and 'barber' roles
    - This allows barbers to view and manage their own appointments

  2. Reason
    - The function was only checking for 'barber_admin' role
    - Actual barber users have 'barber' role
    - This was preventing barbers from seeing their own appointments in the admin calendar
*/

CREATE OR REPLACE FUNCTION get_admin_barber_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  barber_id_result uuid;
BEGIN
  SELECT barber_id INTO barber_id_result
  FROM admin_users
  WHERE auth_user_id = auth.uid()
    AND role IN ('barber_admin', 'barber')
    AND is_active = true
  LIMIT 1;

  RETURN barber_id_result;
END;
$$;
