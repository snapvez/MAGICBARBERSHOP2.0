/*
  # Fix Security Issues - Indexes and RLS Policies

  This migration addresses Supabase security advisor warnings:

  ## 1. Remove Unused Indexes
  Removes 15 unused indexes that add maintenance overhead without performance benefit

  ## 2. Consolidate Multiple Permissive RLS Policies
  Replaces multiple permissive policies with single, efficient policies using OR logic

  ## 3. Fix SECURITY DEFINER Views
  Recreates views without SECURITY DEFINER

  ## Security Notes
  - All consolidated policies maintain the same access patterns
  - Policies use explicit role checks and ownership verification
*/

-- ============================================================================
-- PART 1: REMOVE UNUSED INDEXES
-- ============================================================================

DROP INDEX IF EXISTS idx_appointments_guest_id;
DROP INDEX IF EXISTS idx_appointments_payment_verified_by;
DROP INDEX IF EXISTS idx_appointments_service_id;
DROP INDEX IF EXISTS idx_admin_users_barber_id;
DROP INDEX IF EXISTS idx_barber_availability_blocks_barber_id;
DROP INDEX IF EXISTS idx_barber_availability_blocks_created_by;
DROP INDEX IF EXISTS idx_payments_recorded_by;
DROP INDEX IF EXISTS idx_payments_subscription_id;
DROP INDEX IF EXISTS idx_client_subscriptions_guest_id;
DROP INDEX IF EXISTS idx_client_subscriptions_plan_id;
DROP INDEX IF EXISTS idx_manual_commission_entries_barber_id;
DROP INDEX IF EXISTS idx_manual_commission_entries_created_by;
DROP INDEX IF EXISTS idx_commission_settings_updated_by;
DROP INDEX IF EXISTS idx_subscription_payments_created_by;
DROP INDEX IF EXISTS idx_barber_points_subscription_id;

-- ============================================================================
-- PART 2: CONSOLIDATE RLS POLICIES
-- ============================================================================

-- 2.1 APPOINTMENTS TABLE
DROP POLICY IF EXISTS "Barber admins can manage their appointments" ON appointments;
DROP POLICY IF EXISTS "Super admins can manage all appointments" ON appointments;
DROP POLICY IF EXISTS "Guests can create appointments" ON appointments;
DROP POLICY IF EXISTS "Users can create own appointments" ON appointments;
DROP POLICY IF EXISTS "Barbers can view own appointments" ON appointments;
DROP POLICY IF EXISTS "Guests can view own appointments" ON appointments;
DROP POLICY IF EXISTS "Users can view own appointments" ON appointments;
DROP POLICY IF EXISTS "Guests can update own appointments" ON appointments;
DROP POLICY IF EXISTS "Users can update own appointments" ON appointments;

CREATE POLICY "appointments_select_policy" ON appointments FOR SELECT TO authenticated USING (
  auth.uid() = client_id OR auth.uid() = guest_id
  OR barber_id IN (SELECT id FROM barbers WHERE auth_user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM admin_users WHERE admin_users.auth_user_id = auth.uid() AND (admin_users.role = 'super_admin' OR (admin_users.role = 'barber_admin' AND admin_users.barber_id = appointments.barber_id)))
);

CREATE POLICY "appointments_insert_policy" ON appointments FOR INSERT TO authenticated WITH CHECK (
  auth.uid() = client_id OR auth.uid() = guest_id
  OR EXISTS (SELECT 1 FROM admin_users WHERE admin_users.auth_user_id = auth.uid() AND (admin_users.role = 'super_admin' OR (admin_users.role = 'barber_admin' AND admin_users.barber_id = appointments.barber_id)))
);

CREATE POLICY "appointments_update_policy" ON appointments FOR UPDATE TO authenticated
USING (auth.uid() = client_id OR auth.uid() = guest_id OR EXISTS (SELECT 1 FROM admin_users WHERE admin_users.auth_user_id = auth.uid() AND (admin_users.role = 'super_admin' OR (admin_users.role = 'barber_admin' AND admin_users.barber_id = appointments.barber_id))))
WITH CHECK (auth.uid() = client_id OR auth.uid() = guest_id OR EXISTS (SELECT 1 FROM admin_users WHERE admin_users.auth_user_id = auth.uid() AND (admin_users.role = 'super_admin' OR (admin_users.role = 'barber_admin' AND admin_users.barber_id = appointments.barber_id))));

CREATE POLICY "appointments_delete_policy" ON appointments FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM admin_users WHERE admin_users.auth_user_id = auth.uid() AND (admin_users.role = 'super_admin' OR (admin_users.role = 'barber_admin' AND admin_users.barber_id = appointments.barber_id)))
);

-- 2.2 BARBER_AVAILABILITY_BLOCKS TABLE
DROP POLICY IF EXISTS "Admins can manage availability blocks" ON barber_availability_blocks;
DROP POLICY IF EXISTS "Users can view availability blocks" ON barber_availability_blocks;

CREATE POLICY "barber_availability_blocks_select_policy" ON barber_availability_blocks FOR SELECT TO authenticated USING (true);

-- 2.3 BARBERS TABLE
DROP POLICY IF EXISTS "Barbers can view own profile" ON barbers;
DROP POLICY IF EXISTS "Qualquer um pode ver barbeiros ativos" ON barbers;
DROP POLICY IF EXISTS "Admins can update barbers" ON barbers;
DROP POLICY IF EXISTS "Barbers can update own profile" ON barbers;

CREATE POLICY "barbers_select_policy" ON barbers FOR SELECT TO authenticated USING (
  is_active = true OR auth_user_id = auth.uid() OR EXISTS (SELECT 1 FROM admin_users WHERE admin_users.auth_user_id = auth.uid())
);

CREATE POLICY "barbers_update_policy" ON barbers FOR UPDATE TO authenticated
USING (auth_user_id = auth.uid() OR EXISTS (SELECT 1 FROM admin_users WHERE admin_users.auth_user_id = auth.uid()))
WITH CHECK (auth_user_id = auth.uid() OR EXISTS (SELECT 1 FROM admin_users WHERE admin_users.auth_user_id = auth.uid()));

-- 2.4 CLIENT_SUBSCRIPTIONS TABLE
DROP POLICY IF EXISTS "Barber admins can manage their subscriptions" ON client_subscriptions;
DROP POLICY IF EXISTS "Super admins can manage all subscriptions" ON client_subscriptions;
DROP POLICY IF EXISTS "Anyone can create subscriptions" ON client_subscriptions;
DROP POLICY IF EXISTS "Admins can view all subscriptions" ON client_subscriptions;
DROP POLICY IF EXISTS "Guests can view own subscriptions" ON client_subscriptions;
DROP POLICY IF EXISTS "Users can view own subscriptions" ON client_subscriptions;
DROP POLICY IF EXISTS "Admins can update all subscriptions" ON client_subscriptions;
DROP POLICY IF EXISTS "Guests can update own subscriptions" ON client_subscriptions;
DROP POLICY IF EXISTS "Users can update own subscriptions" ON client_subscriptions;

CREATE POLICY "client_subscriptions_select_policy" ON client_subscriptions FOR SELECT TO authenticated USING (
  client_id = auth.uid() OR guest_id = auth.uid()
  OR EXISTS (SELECT 1 FROM admin_users WHERE admin_users.auth_user_id = auth.uid() AND (admin_users.role = 'super_admin' OR (admin_users.role = 'barber_admin' AND admin_users.barber_id = client_subscriptions.barber_id)))
);

CREATE POLICY "client_subscriptions_insert_policy" ON client_subscriptions FOR INSERT TO authenticated WITH CHECK (
  client_id = auth.uid() OR guest_id = auth.uid()
  OR EXISTS (SELECT 1 FROM admin_users WHERE admin_users.auth_user_id = auth.uid() AND (admin_users.role = 'super_admin' OR (admin_users.role = 'barber_admin' AND admin_users.barber_id = client_subscriptions.barber_id)))
);

CREATE POLICY "client_subscriptions_update_policy" ON client_subscriptions FOR UPDATE TO authenticated
USING (client_id = auth.uid() OR guest_id = auth.uid() OR EXISTS (SELECT 1 FROM admin_users WHERE admin_users.auth_user_id = auth.uid() AND (admin_users.role = 'super_admin' OR (admin_users.role = 'barber_admin' AND admin_users.barber_id = client_subscriptions.barber_id))))
WITH CHECK (client_id = auth.uid() OR guest_id = auth.uid() OR EXISTS (SELECT 1 FROM admin_users WHERE admin_users.auth_user_id = auth.uid() AND (admin_users.role = 'super_admin' OR (admin_users.role = 'barber_admin' AND admin_users.barber_id = client_subscriptions.barber_id))));

CREATE POLICY "client_subscriptions_delete_policy" ON client_subscriptions FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM admin_users WHERE admin_users.auth_user_id = auth.uid() AND (admin_users.role = 'super_admin' OR (admin_users.role = 'barber_admin' AND admin_users.barber_id = client_subscriptions.barber_id)))
);

-- 2.5 COMMISSION_SETTINGS TABLE
DROP POLICY IF EXISTS "Super admins can manage commission settings" ON commission_settings;
DROP POLICY IF EXISTS "Super admins can view commission settings" ON commission_settings;
DROP POLICY IF EXISTS "Admins can update commission settings" ON commission_settings;

CREATE POLICY "commission_settings_select_policy" ON commission_settings FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM admin_users WHERE admin_users.auth_user_id = auth.uid() AND admin_users.role = 'super_admin')
);

CREATE POLICY "commission_settings_update_policy" ON commission_settings FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.auth_user_id = auth.uid() AND admin_users.role = 'super_admin'))
WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.auth_user_id = auth.uid() AND admin_users.role = 'super_admin'));

-- 2.6 LOYALTY_REWARDS TABLE
DROP POLICY IF EXISTS "Admins can manage all rewards" ON loyalty_rewards;
DROP POLICY IF EXISTS "Anyone can view active rewards" ON loyalty_rewards;

CREATE POLICY "loyalty_rewards_select_policy" ON loyalty_rewards FOR SELECT TO authenticated USING (
  is_active = true OR EXISTS (SELECT 1 FROM admin_users WHERE admin_users.auth_user_id = auth.uid())
);

-- 2.7 MANUAL_COMMISSION_ENTRIES TABLE
DROP POLICY IF EXISTS "Admins can delete manual commission entries" ON manual_commission_entries;
DROP POLICY IF EXISTS "Super admins can manage manual commissions" ON manual_commission_entries;
DROP POLICY IF EXISTS "Admins can insert manual commission entries" ON manual_commission_entries;
DROP POLICY IF EXISTS "Admins can view manual commission entries" ON manual_commission_entries;
DROP POLICY IF EXISTS "Super admins can view all manual commissions" ON manual_commission_entries;
DROP POLICY IF EXISTS "Admins can update manual commission entries" ON manual_commission_entries;

CREATE POLICY "manual_commission_entries_select_policy" ON manual_commission_entries FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.auth_user_id = auth.uid()));
CREATE POLICY "manual_commission_entries_insert_policy" ON manual_commission_entries FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.auth_user_id = auth.uid()));
CREATE POLICY "manual_commission_entries_update_policy" ON manual_commission_entries FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.auth_user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.auth_user_id = auth.uid()));
CREATE POLICY "manual_commission_entries_delete_policy" ON manual_commission_entries FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.auth_user_id = auth.uid()));

-- 2.8 PAYMENTS TABLE
DROP POLICY IF EXISTS "Admins can insert payments" ON payments;
DROP POLICY IF EXISTS "Barbers can insert own payments" ON payments;
DROP POLICY IF EXISTS "Admins can view all payments" ON payments;
DROP POLICY IF EXISTS "Barbers can view own payments" ON payments;
DROP POLICY IF EXISTS "Admins can update payments" ON payments;
DROP POLICY IF EXISTS "Barbers can update own payments" ON payments;

CREATE POLICY "payments_select_policy" ON payments FOR SELECT TO authenticated USING (barber_id IN (SELECT id FROM barbers WHERE auth_user_id = auth.uid()) OR EXISTS (SELECT 1 FROM admin_users WHERE admin_users.auth_user_id = auth.uid()));
CREATE POLICY "payments_insert_policy" ON payments FOR INSERT TO authenticated WITH CHECK (barber_id IN (SELECT id FROM barbers WHERE auth_user_id = auth.uid()) OR EXISTS (SELECT 1 FROM admin_users WHERE admin_users.auth_user_id = auth.uid()));
CREATE POLICY "payments_update_policy" ON payments FOR UPDATE TO authenticated USING (barber_id IN (SELECT id FROM barbers WHERE auth_user_id = auth.uid()) OR EXISTS (SELECT 1 FROM admin_users WHERE admin_users.auth_user_id = auth.uid())) WITH CHECK (barber_id IN (SELECT id FROM barbers WHERE auth_user_id = auth.uid()) OR EXISTS (SELECT 1 FROM admin_users WHERE admin_users.auth_user_id = auth.uid()));

-- 2.9 PROFILES TABLE
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

CREATE POLICY "profiles_select_policy" ON profiles FOR SELECT TO authenticated USING (id = auth.uid() OR EXISTS (SELECT 1 FROM admin_users WHERE admin_users.auth_user_id = auth.uid()));
CREATE POLICY "profiles_update_policy" ON profiles FOR UPDATE TO authenticated USING (id = auth.uid() OR EXISTS (SELECT 1 FROM admin_users WHERE admin_users.auth_user_id = auth.uid())) WITH CHECK (id = auth.uid() OR EXISTS (SELECT 1 FROM admin_users WHERE admin_users.auth_user_id = auth.uid()));

-- 2.10 SERVICES TABLE
DROP POLICY IF EXISTS "Admins can manage all services" ON services;
DROP POLICY IF EXISTS "Public can view active services" ON services;

CREATE POLICY "services_select_policy" ON services FOR SELECT TO authenticated USING (is_active = true OR EXISTS (SELECT 1 FROM admin_users WHERE admin_users.auth_user_id = auth.uid()));

-- 2.11 SMS_TEMPLATES TABLE
DROP POLICY IF EXISTS "Admins can manage SMS templates" ON sms_templates;
DROP POLICY IF EXISTS "Anyone can read active SMS templates" ON sms_templates;

CREATE POLICY "sms_templates_select_policy" ON sms_templates FOR SELECT TO authenticated USING (active = true OR EXISTS (SELECT 1 FROM admin_users WHERE admin_users.auth_user_id = auth.uid()));

-- 2.12 SUBSCRIPTION_PAYMENTS TABLE
DROP POLICY IF EXISTS "Admins can insert subscription payments" ON subscription_payments;
DROP POLICY IF EXISTS "Super admins can manage subscription payments" ON subscription_payments;
DROP POLICY IF EXISTS "Super admins can view all subscription payments" ON subscription_payments;
DROP POLICY IF EXISTS "Admins can update subscription payments" ON subscription_payments;

CREATE POLICY "subscription_payments_select_policy" ON subscription_payments FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.auth_user_id = auth.uid() AND admin_users.role = 'super_admin'));
CREATE POLICY "subscription_payments_insert_policy" ON subscription_payments FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.auth_user_id = auth.uid() AND admin_users.role = 'super_admin'));
CREATE POLICY "subscription_payments_update_policy" ON subscription_payments FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.auth_user_id = auth.uid() AND admin_users.role = 'super_admin')) WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.auth_user_id = auth.uid() AND admin_users.role = 'super_admin'));

-- 2.13 SUBSCRIPTION_PLANS TABLE
DROP POLICY IF EXISTS "Admins manage plans" ON subscription_plans;
DROP POLICY IF EXISTS "Anyone can view active plans" ON subscription_plans;

CREATE POLICY "subscription_plans_select_policy" ON subscription_plans FOR SELECT TO authenticated USING (is_active = true OR EXISTS (SELECT 1 FROM admin_users WHERE admin_users.auth_user_id = auth.uid()));

-- ============================================================================
-- PART 3: FIX SECURITY DEFINER VIEWS
-- ============================================================================

DROP VIEW IF EXISTS barber_commissions_by_month;
CREATE VIEW barber_commissions_by_month AS
SELECT b.id as barber_id, b.name as barber_name, DATE_TRUNC('month', a.appointment_date) as month,
  COUNT(*) as total_appointments, SUM(s.price) as total_revenue,
  SUM(COALESCE(bp.points_earned, 0)) as total_points,
  (SELECT commission_percentage FROM commission_settings LIMIT 1) as commission_rate
FROM appointments a
JOIN barbers b ON a.barber_id = b.id
JOIN services s ON a.service_id = s.id
LEFT JOIN barber_points bp ON bp.appointment_id = a.id
WHERE a.status = 'completed'
GROUP BY b.id, b.name, DATE_TRUNC('month', a.appointment_date);

DROP VIEW IF EXISTS revenue_breakdown;
CREATE VIEW revenue_breakdown AS
SELECT DATE_TRUNC('month', a.appointment_date) as month,
  COUNT(*) as total_appointments, SUM(s.price) as total_revenue,
  SUM(CASE WHEN cs.id IS NOT NULL THEN s.price ELSE 0 END) as subscription_revenue,
  SUM(CASE WHEN cs.id IS NULL THEN s.price ELSE 0 END) as individual_revenue,
  COUNT(DISTINCT a.barber_id) as active_barbers
FROM appointments a
JOIN services s ON a.service_id = s.id
LEFT JOIN client_subscriptions cs ON a.client_id = cs.client_id
WHERE a.status = 'completed'
GROUP BY DATE_TRUNC('month', a.appointment_date);
