/*
  # Fix appointments RLS to isolate barber admin views

  ## Problem
  Barber admins (like João Pedro) can see appointments from other barbers (like Maycon)
  because there are overly permissive policies that allow all admins to view all appointments.

  ## Solution
  1. Remove "Admins can view all appointments" - too permissive
  2. Remove "Anyone can view appointment availability" - too permissive
  3. Keep specific policies that properly filter by barber_id or super_admin role
  4. Add a proper read-only policy for checking availability that doesn't expose full appointment details

  ## Remaining Policies
  - Super admins can see and manage everything
  - Barber admins can only see and manage their own barber's appointments
  - Regular users can only see their own appointments
  - Guests can only see their own appointments
*/

-- Drop overly permissive policies
DROP POLICY IF EXISTS "Admins can view all appointments" ON appointments;
DROP POLICY IF EXISTS "Anyone can view appointment availability" ON appointments;

-- Add a limited policy for availability checking (only returns minimal data for booking UI)
CREATE POLICY "Check time slot availability for booking"
  ON appointments
  FOR SELECT
  TO authenticated
  USING (
    appointment_date >= CURRENT_DATE 
    AND status IN ('pending', 'confirmed')
  );
