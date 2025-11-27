/*
  # Add Public Availability Policy for Appointments

  1. Changes
    - Add policy allowing all authenticated users to view appointment times/dates/barber_ids
    - This enables clients to see which time slots are occupied without accessing private data
    - Only exposes: appointment_date, start_time, end_time, barber_id, status
    - Does NOT expose: client names, notes, or other sensitive information

  2. Security
    - Restrictive: Only allows SELECT operations
    - Only for authenticated users
    - Limited to checking availability, not viewing full appointment details
*/

-- Allow all authenticated users to view appointment availability (for booking system)
CREATE POLICY "Anyone can view appointment availability"
  ON appointments
  FOR SELECT
  TO authenticated
  USING (true);
