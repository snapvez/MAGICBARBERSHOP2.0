/*
  # Add Missing Foreign Key Indexes for Performance

  1. Performance Improvements
    - Add indexes to all foreign key columns that don't have covering indexes
    - This dramatically improves JOIN performance and foreign key constraint checks
    
  2. Affected Tables
    - appointments: barber_id, payment_verified_by, service_id
    - barber_availability_blocks: created_by
    - client_subscriptions: plan_id
    - commission_settings: updated_by
    - manual_commission_entries: created_by
    - notifications: appointment_id
    - payments: recorded_by
    - subscription_payments: created_by
*/

-- Appointments table indexes
CREATE INDEX IF NOT EXISTS idx_appointments_barber_id 
  ON appointments(barber_id);

CREATE INDEX IF NOT EXISTS idx_appointments_payment_verified_by 
  ON appointments(payment_verified_by);

CREATE INDEX IF NOT EXISTS idx_appointments_service_id 
  ON appointments(service_id);

-- Barber availability blocks
CREATE INDEX IF NOT EXISTS idx_barber_availability_blocks_created_by 
  ON barber_availability_blocks(created_by);

-- Client subscriptions
CREATE INDEX IF NOT EXISTS idx_client_subscriptions_plan_id 
  ON client_subscriptions(plan_id);

-- Commission settings
CREATE INDEX IF NOT EXISTS idx_commission_settings_updated_by 
  ON commission_settings(updated_by);

-- Manual commission entries
CREATE INDEX IF NOT EXISTS idx_manual_commission_entries_created_by 
  ON manual_commission_entries(created_by);

-- Notifications
CREATE INDEX IF NOT EXISTS idx_notifications_appointment_id 
  ON notifications(appointment_id);

-- Payments
CREATE INDEX IF NOT EXISTS idx_payments_recorded_by 
  ON payments(recorded_by);

-- Subscription payments
CREATE INDEX IF NOT EXISTS idx_subscription_payments_created_by 
  ON subscription_payments(created_by);