/*
  # Fix Guest Appointment Booking RLS

  ## Problem
  - Guest users cannot create appointments because RLS policies check auth.uid() but guests are anon users
  - The appointments_insert_policy requires auth.uid() = guest_id, but guests don't have auth.uid()

  ## Solution
  - Add a specific policy allowing anonymous users to insert appointments with guest_id
  - Guest users need to be able to create appointments without being authenticated

  ## Security
  - The table constraint `appointments_client_or_guest_check` ensures either client_id OR guest_id is set
  - Trigger functions validate pending appointments
  - This policy only applies when inserting (no DELETE/UPDATE via anon)
*/

CREATE POLICY "Guests can create their appointments"
  ON appointments
  FOR INSERT
  TO anon
  WITH CHECK (
    guest_id IS NOT NULL 
    AND client_id IS NULL
  );
