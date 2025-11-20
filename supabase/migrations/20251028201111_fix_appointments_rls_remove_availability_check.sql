/*
  # Remove overly permissive availability check policy

  ## Problem
  The "Check time slot availability for booking" policy allows ANY authenticated user
  to view ALL pending/confirmed appointments. This means barber admins can see
  appointments from other barbers because the policy uses OR logic (PERMISSIVE).

  ## Solution
  Remove the "Check time slot availability for booking" policy completely.
  The barber admin policy "Barber admins can manage their appointments" already
  covers viewing appointments through its ALL command, and it properly filters
  by barber_id using get_admin_barber_id().

  ## Result
  - Super admins: see everything (via "Super admins can manage all appointments")
  - Barber admins: see only their barber's appointments (via "Barber admins can manage their appointments")
  - Regular users: see only their own appointments (via "Users can view own appointments")
  - Guests: see only their own appointments (via "Guests can view own appointments")
*/

DROP POLICY IF EXISTS "Check time slot availability for booking" ON appointments;
