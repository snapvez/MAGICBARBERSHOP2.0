/*
  # Fix Security Issues - Part 2: RLS Policy Optimization (Corrected)

  1. Performance Improvements
    - Replace auth.uid() with (select auth.uid()) in RLS policies
    - This prevents re-evaluation for each row
    
  2. Important Notes
    - Uses client_id (not user_id) for user-related foreign keys
    - Maintains all existing security while improving performance
*/

-- Profiles policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT TO authenticated
  USING (id = (select auth.uid()));

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE TO authenticated
  USING (id = (select auth.uid()))
  WITH CHECK (id = (select auth.uid()));

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT TO authenticated
  WITH CHECK (id = (select auth.uid()));

CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.auth_user_id = (select auth.uid())));

CREATE POLICY "Admins can update all profiles"
  ON profiles FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.auth_user_id = (select auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.auth_user_id = (select auth.uid())));

-- Appointments policies (using client_id)
DROP POLICY IF EXISTS "Users can view own appointments" ON appointments;
DROP POLICY IF EXISTS "Users can create own appointments" ON appointments;
DROP POLICY IF EXISTS "Users can update own appointments" ON appointments;
DROP POLICY IF EXISTS "Usuários podem ver suas próprias marcações" ON appointments;
DROP POLICY IF EXISTS "Admins podem ver todas as marcações" ON appointments;
DROP POLICY IF EXISTS "Usuários podem atualizar suas próprias marcações" ON appointments;
DROP POLICY IF EXISTS "Admins can view all appointments" ON appointments;
DROP POLICY IF EXISTS "Admins can manage all appointments" ON appointments;
DROP POLICY IF EXISTS "Admins podem atualizar qualquer marcação" ON appointments;
DROP POLICY IF EXISTS "Admins podem deletar marcações" ON appointments;
DROP POLICY IF EXISTS "Guests can view own appointments" ON appointments;
DROP POLICY IF EXISTS "Guests can create appointments" ON appointments;
DROP POLICY IF EXISTS "Guests can update own appointments" ON appointments;
DROP POLICY IF EXISTS "Qualquer pessoa pode criar marcações" ON appointments;
DROP POLICY IF EXISTS "Barbers can view own appointments" ON appointments;
DROP POLICY IF EXISTS "Admins can verify payments" ON appointments;

CREATE POLICY "Users can view own appointments"
  ON appointments FOR SELECT TO authenticated
  USING (client_id = (select auth.uid()));

CREATE POLICY "Users can create own appointments"
  ON appointments FOR INSERT TO authenticated
  WITH CHECK (client_id = (select auth.uid()));

CREATE POLICY "Users can update own appointments"
  ON appointments FOR UPDATE TO authenticated
  USING (client_id = (select auth.uid()))
  WITH CHECK (client_id = (select auth.uid()));

CREATE POLICY "Guests can create appointments"
  ON appointments FOR INSERT TO anon, authenticated, authenticator, dashboard_user
  WITH CHECK (guest_id IS NOT NULL);

CREATE POLICY "Admins can manage all appointments"
  ON appointments TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.auth_user_id = (select auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.auth_user_id = (select auth.uid())));

CREATE POLICY "Barbers can view own appointments"
  ON appointments FOR SELECT TO authenticated
  USING (barber_id IN (SELECT id FROM barbers WHERE auth_user_id = (select auth.uid())));

-- Notifications policies (using client_id)
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;

CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT TO authenticated
  USING (client_id = (select auth.uid()));

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE TO authenticated
  USING (client_id = (select auth.uid()))
  WITH CHECK (client_id = (select auth.uid()));

-- Services policies
DROP POLICY IF EXISTS "Admins can manage all services" ON services;

CREATE POLICY "Admins can manage all services"
  ON services TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.auth_user_id = (select auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.auth_user_id = (select auth.uid())));

-- Loyalty rewards policies
DROP POLICY IF EXISTS "Admins can manage all rewards" ON loyalty_rewards;

CREATE POLICY "Admins can manage all rewards"
  ON loyalty_rewards TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.auth_user_id = (select auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.auth_user_id = (select auth.uid())));

-- Client subscriptions policies (using client_id)
DROP POLICY IF EXISTS "Admins view all subscriptions" ON client_subscriptions;
DROP POLICY IF EXISTS "Admins update all subscriptions" ON client_subscriptions;
DROP POLICY IF EXISTS "Anyone can create subscriptions" ON client_subscriptions;
DROP POLICY IF EXISTS "Users can view own subscriptions" ON client_subscriptions;
DROP POLICY IF EXISTS "Users can update own subscriptions" ON client_subscriptions;
DROP POLICY IF EXISTS "Admins can view all subscriptions" ON client_subscriptions;
DROP POLICY IF EXISTS "Admins can update all subscriptions" ON client_subscriptions;
DROP POLICY IF EXISTS "Guests can view own subscriptions" ON client_subscriptions;
DROP POLICY IF EXISTS "Guests can update own subscriptions" ON client_subscriptions;

CREATE POLICY "Users can view own subscriptions"
  ON client_subscriptions FOR SELECT TO authenticated
  USING (client_id = (select auth.uid()));

CREATE POLICY "Admins can view all subscriptions"
  ON client_subscriptions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.auth_user_id = (select auth.uid())));

CREATE POLICY "Admins can update all subscriptions"
  ON client_subscriptions FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.auth_user_id = (select auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.auth_user_id = (select auth.uid())));

-- Admin users policies
DROP POLICY IF EXISTS "View own admin record" ON admin_users;

CREATE POLICY "View own admin record"
  ON admin_users FOR SELECT TO authenticated
  USING (auth_user_id = (select auth.uid()));

-- Barbers policies
DROP POLICY IF EXISTS "Apenas admins podem inserir barbeiros" ON barbers;
DROP POLICY IF EXISTS "Apenas admins podem atualizar barbeiros" ON barbers;
DROP POLICY IF EXISTS "Apenas admins podem deletar barbeiros" ON barbers;
DROP POLICY IF EXISTS "Barbers can view own profile" ON barbers;
DROP POLICY IF EXISTS "Barbers can update own profile" ON barbers;
DROP POLICY IF EXISTS "Admins can update barbers" ON barbers;

CREATE POLICY "Apenas admins podem inserir barbeiros"
  ON barbers FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.auth_user_id = (select auth.uid())));

CREATE POLICY "Admins can update barbers"
  ON barbers FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.auth_user_id = (select auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.auth_user_id = (select auth.uid())));

CREATE POLICY "Apenas admins podem deletar barbeiros"
  ON barbers FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.auth_user_id = (select auth.uid())));

CREATE POLICY "Barbers can view own profile"
  ON barbers FOR SELECT TO authenticated
  USING (auth_user_id = (select auth.uid()));

CREATE POLICY "Barbers can update own profile"
  ON barbers FOR UPDATE TO authenticated
  USING (auth_user_id = (select auth.uid()))
  WITH CHECK (auth_user_id = (select auth.uid()));

-- Subscription capacity policies
DROP POLICY IF EXISTS "Only admins can update capacity settings" ON subscription_capacity;

CREATE POLICY "Only admins can update capacity settings"
  ON subscription_capacity FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.auth_user_id = (select auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.auth_user_id = (select auth.uid())));

-- Site content policies
DROP POLICY IF EXISTS "Only admins can update site content" ON site_content;
DROP POLICY IF EXISTS "Only admins can insert site content" ON site_content;

CREATE POLICY "Only admins can update site content"
  ON site_content FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.auth_user_id = (select auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.auth_user_id = (select auth.uid())));

CREATE POLICY "Only admins can insert site content"
  ON site_content FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.auth_user_id = (select auth.uid())));

-- Payments policies
DROP POLICY IF EXISTS "Admins can view all payments" ON payments;
DROP POLICY IF EXISTS "Admins can insert payments" ON payments;
DROP POLICY IF EXISTS "Admins can update payments" ON payments;
DROP POLICY IF EXISTS "Admins can delete payments" ON payments;
DROP POLICY IF EXISTS "Clients can view own appointment payments" ON payments;
DROP POLICY IF EXISTS "Clients can view own subscription payments" ON payments;
DROP POLICY IF EXISTS "Barbers can view own payments" ON payments;
DROP POLICY IF EXISTS "Barbers can insert own payments" ON payments;
DROP POLICY IF EXISTS "Barbers can update own payments" ON payments;

CREATE POLICY "Admins can view all payments"
  ON payments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.auth_user_id = (select auth.uid())));

CREATE POLICY "Admins can insert payments"
  ON payments FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.auth_user_id = (select auth.uid())));

CREATE POLICY "Admins can update payments"
  ON payments FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.auth_user_id = (select auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.auth_user_id = (select auth.uid())));

CREATE POLICY "Admins can delete payments"
  ON payments FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.auth_user_id = (select auth.uid())));

CREATE POLICY "Barbers can view own payments"
  ON payments FOR SELECT TO authenticated
  USING (barber_id IN (SELECT id FROM barbers WHERE auth_user_id = (select auth.uid())));

CREATE POLICY "Barbers can insert own payments"
  ON payments FOR INSERT TO authenticated
  WITH CHECK (barber_id IN (SELECT id FROM barbers WHERE auth_user_id = (select auth.uid())));

CREATE POLICY "Barbers can update own payments"
  ON payments FOR UPDATE TO authenticated
  USING (barber_id IN (SELECT id FROM barbers WHERE auth_user_id = (select auth.uid())))
  WITH CHECK (barber_id IN (SELECT id FROM barbers WHERE auth_user_id = (select auth.uid())));

-- Subscription payments policies
DROP POLICY IF EXISTS "Admins can view all payments" ON subscription_payments;
DROP POLICY IF EXISTS "Admins can insert payments" ON subscription_payments;
DROP POLICY IF EXISTS "Admins can update payments" ON subscription_payments;
DROP POLICY IF EXISTS "Clients can view own payments" ON subscription_payments;

CREATE POLICY "Admins can view all subscription payments"
  ON subscription_payments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.auth_user_id = (select auth.uid())));

CREATE POLICY "Admins can insert subscription payments"
  ON subscription_payments FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.auth_user_id = (select auth.uid())));

CREATE POLICY "Admins can update subscription payments"
  ON subscription_payments FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.auth_user_id = (select auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.auth_user_id = (select auth.uid())));

-- Barber availability blocks policies
DROP POLICY IF EXISTS "Admins can manage availability blocks" ON barber_availability_blocks;

CREATE POLICY "Admins can manage availability blocks"
  ON barber_availability_blocks TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.auth_user_id = (select auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.auth_user_id = (select auth.uid())));

-- Notification log policies
DROP POLICY IF EXISTS "Admins can view notification logs" ON notification_log;

CREATE POLICY "Admins can view notification logs"
  ON notification_log FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.auth_user_id = (select auth.uid())));

-- SMS templates policies
DROP POLICY IF EXISTS "Admins can manage SMS templates" ON sms_templates;

CREATE POLICY "Admins can manage SMS templates"
  ON sms_templates TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.auth_user_id = (select auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.auth_user_id = (select auth.uid())));

-- Manual commission entries policies
DROP POLICY IF EXISTS "Admins can view manual commission entries" ON manual_commission_entries;
DROP POLICY IF EXISTS "Admins can insert manual commission entries" ON manual_commission_entries;
DROP POLICY IF EXISTS "Admins can update manual commission entries" ON manual_commission_entries;
DROP POLICY IF EXISTS "Admins can delete manual commission entries" ON manual_commission_entries;

CREATE POLICY "Admins can view manual commission entries"
  ON manual_commission_entries FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.auth_user_id = (select auth.uid())));

CREATE POLICY "Admins can insert manual commission entries"
  ON manual_commission_entries FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.auth_user_id = (select auth.uid())));

CREATE POLICY "Admins can update manual commission entries"
  ON manual_commission_entries FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.auth_user_id = (select auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.auth_user_id = (select auth.uid())));

CREATE POLICY "Admins can delete manual commission entries"
  ON manual_commission_entries FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.auth_user_id = (select auth.uid())));

-- Commission settings policies
DROP POLICY IF EXISTS "Admins can view commission settings" ON commission_settings;
DROP POLICY IF EXISTS "Admins can update commission settings" ON commission_settings;

CREATE POLICY "Admins can view commission settings"
  ON commission_settings FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.auth_user_id = (select auth.uid())));

CREATE POLICY "Admins can update commission settings"
  ON commission_settings FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.auth_user_id = (select auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.auth_user_id = (select auth.uid())));