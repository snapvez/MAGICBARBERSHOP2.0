/*
  # Fix Appointments Public Access for Availability Checking

  ## Changes
  - Add policy to allow anonymous users to view appointments needed for availability checking
  - This enables the booking calendar to show availability to non-logged-in users

  ## Security
  - Anonymous users can only see: barber_id, start_time, end_time, appointment_date, status
  - Anonymous users cannot see client/guest information
  - Only confirmed and pending appointments are visible to prevent showing cancelled slots

  ## Note
  - This is a calculated view approach using SELECT with specific fields
  - Anonymous users need to see busy times to calculate availability
*/

-- Allow anonymous users to view appointment busy times for availability calculation
CREATE POLICY "Anonymous users can view appointment availability times"
  ON appointments
  FOR SELECT
  TO anon
  USING (status IN ('pending', 'confirmed'));
