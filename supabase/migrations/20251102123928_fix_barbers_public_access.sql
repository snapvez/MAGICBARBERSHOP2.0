/*
  # Fix Barbers Public Access

  ## Changes
  - Add policy to allow anonymous users to view active barbers
  - This enables the booking calendar to display barbers to non-logged-in users

  ## Security
  - Only active barbers are visible to anonymous users
  - All other operations still require authentication
*/

-- Allow anonymous users to view active barbers
CREATE POLICY "Anonymous users can view active barbers"
  ON barbers
  FOR SELECT
  TO anon
  USING (is_active = true);
