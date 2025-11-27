/*
  # Optimize Critical RLS Policies - Auth Function Calls

  1. Performance Optimization
    - Replace `auth.uid()` with `(select auth.uid())` in most critical RLS policies
    - This prevents re-evaluation of the function for each row
    - Focus on high-traffic tables: profiles, appointments, client_subscriptions
    
  2. Schema Notes
    - profiles: uses 'id' column (which is auth.uid())
    - appointments: uses 'client_id' and 'guest_id'
    - client_subscriptions: uses 'client_id' and 'guest_id'
    - notifications: uses 'client_id'
    - admin_users, barbers: use 'auth_user_id'
*/

-- Profiles policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = (select auth.uid()))
  WITH CHECK (id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = (select auth.uid()));

DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.auth_user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
CREATE POLICY "Admins can update all profiles"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.auth_user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.auth_user_id = (select auth.uid())
    )
  );

-- Appointments policies
DROP POLICY IF EXISTS "Users can view own appointments" ON appointments;
CREATE POLICY "Users can view own appointments"
  ON appointments FOR SELECT
  TO authenticated
  USING (client_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can create own appointments" ON appointments;
CREATE POLICY "Users can create own appointments"
  ON appointments FOR INSERT
  TO authenticated
  WITH CHECK (client_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own appointments" ON appointments;
CREATE POLICY "Users can update own appointments"
  ON appointments FOR UPDATE
  TO authenticated
  USING (client_id = (select auth.uid()))
  WITH CHECK (client_id = (select auth.uid()));

DROP POLICY IF EXISTS "Guests can view own appointments" ON appointments;
CREATE POLICY "Guests can view own appointments"
  ON appointments FOR SELECT
  TO authenticated
  USING (guest_id IS NOT NULL AND guest_id = (select auth.uid()));

DROP POLICY IF EXISTS "Guests can update own appointments" ON appointments;
CREATE POLICY "Guests can update own appointments"
  ON appointments FOR UPDATE
  TO authenticated
  USING (guest_id IS NOT NULL AND guest_id = (select auth.uid()))
  WITH CHECK (guest_id IS NOT NULL AND guest_id = (select auth.uid()));

DROP POLICY IF EXISTS "Barbers can view own appointments" ON appointments;
CREATE POLICY "Barbers can view own appointments"
  ON appointments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM barbers 
      WHERE barbers.id = appointments.barber_id 
      AND barbers.auth_user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Admins can view all appointments" ON appointments;
CREATE POLICY "Admins can view all appointments"
  ON appointments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.auth_user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Admins can manage all appointments" ON appointments;
CREATE POLICY "Admins can manage all appointments"
  ON appointments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.auth_user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.auth_user_id = (select auth.uid())
    )
  );

-- Client subscriptions policies
DROP POLICY IF EXISTS "Users can view own subscriptions" ON client_subscriptions;
CREATE POLICY "Users can view own subscriptions"
  ON client_subscriptions FOR SELECT
  TO authenticated
  USING (client_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own subscriptions" ON client_subscriptions;
CREATE POLICY "Users can update own subscriptions"
  ON client_subscriptions FOR UPDATE
  TO authenticated
  USING (client_id = (select auth.uid()))
  WITH CHECK (client_id = (select auth.uid()));

DROP POLICY IF EXISTS "Guests can view own subscriptions" ON client_subscriptions;
CREATE POLICY "Guests can view own subscriptions"
  ON client_subscriptions FOR SELECT
  TO authenticated
  USING (guest_id IS NOT NULL AND guest_id = (select auth.uid()));

DROP POLICY IF EXISTS "Guests can update own subscriptions" ON client_subscriptions;
CREATE POLICY "Guests can update own subscriptions"
  ON client_subscriptions FOR UPDATE
  TO authenticated
  USING (guest_id IS NOT NULL AND guest_id = (select auth.uid()))
  WITH CHECK (guest_id IS NOT NULL AND guest_id = (select auth.uid()));

DROP POLICY IF EXISTS "Anyone can create subscriptions" ON client_subscriptions;
CREATE POLICY "Anyone can create subscriptions"
  ON client_subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (
    (client_id IS NOT NULL AND client_id = (select auth.uid())) OR
    (guest_id IS NOT NULL AND guest_id = (select auth.uid()))
  );

DROP POLICY IF EXISTS "Admins can view all subscriptions" ON client_subscriptions;
CREATE POLICY "Admins can view all subscriptions"
  ON client_subscriptions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.auth_user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Admins can update all subscriptions" ON client_subscriptions;
CREATE POLICY "Admins can update all subscriptions"
  ON client_subscriptions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.auth_user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.auth_user_id = (select auth.uid())
    )
  );

-- Notifications policies
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (client_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (client_id = (select auth.uid()))
  WITH CHECK (client_id = (select auth.uid()));

-- Admin users policy
DROP POLICY IF EXISTS "View own admin record" ON admin_users;
CREATE POLICY "View own admin record"
  ON admin_users FOR SELECT
  TO authenticated
  USING (auth_user_id = (select auth.uid()));

-- Barbers policies
DROP POLICY IF EXISTS "Barbers can view own profile" ON barbers;
CREATE POLICY "Barbers can view own profile"
  ON barbers FOR SELECT
  TO authenticated
  USING (auth_user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Barbers can update own profile" ON barbers;
CREATE POLICY "Barbers can update own profile"
  ON barbers FOR UPDATE
  TO authenticated
  USING (auth_user_id = (select auth.uid()))
  WITH CHECK (auth_user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Apenas admins podem inserir barbeiros" ON barbers;
CREATE POLICY "Apenas admins podem inserir barbeiros"
  ON barbers FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.auth_user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Apenas admins podem atualizar barbeiros" ON barbers;
CREATE POLICY "Apenas admins podem atualizar barbeiros"
  ON barbers FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.auth_user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.auth_user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Apenas admins podem deletar barbeiros" ON barbers;
CREATE POLICY "Apenas admins podem deletar barbeiros"
  ON barbers FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.auth_user_id = (select auth.uid())
    )
  );

-- All admin policies for other tables
DROP POLICY IF EXISTS "Admins can manage all services" ON services;
CREATE POLICY "Admins can manage all services"
  ON services FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.auth_user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.auth_user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Admins can manage all rewards" ON loyalty_rewards;
CREATE POLICY "Admins can manage all rewards"
  ON loyalty_rewards FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.auth_user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.auth_user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Admins can manage availability blocks" ON barber_availability_blocks;
CREATE POLICY "Admins can manage availability blocks"
  ON barber_availability_blocks FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.auth_user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.auth_user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Admins can view manual commission entries" ON manual_commission_entries;
CREATE POLICY "Admins can view manual commission entries"
  ON manual_commission_entries FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.auth_user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Admins can insert manual commission entries" ON manual_commission_entries;
CREATE POLICY "Admins can insert manual commission entries"
  ON manual_commission_entries FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.auth_user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Admins can update manual commission entries" ON manual_commission_entries;
CREATE POLICY "Admins can update manual commission entries"
  ON manual_commission_entries FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.auth_user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.auth_user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Admins can delete manual commission entries" ON manual_commission_entries;
CREATE POLICY "Admins can delete manual commission entries"
  ON manual_commission_entries FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.auth_user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Admins can view commission settings" ON commission_settings;
CREATE POLICY "Admins can view commission settings"
  ON commission_settings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.auth_user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Admins can update commission settings" ON commission_settings;
CREATE POLICY "Admins can update commission settings"
  ON commission_settings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.auth_user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.auth_user_id = (select auth.uid())
    )
  );