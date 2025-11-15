/*
  # Fix Security Issues - Part 1: Foreign Key Indexes

  1. Performance Improvements
    - Add indexes for all unindexed foreign keys
    - These indexes improve query performance significantly
    
  2. Tables Affected
    - appointments (barber_id, payment_verified_by, service_id)
    - barber_availability_blocks (created_by)
    - client_subscriptions (plan_id)
    - commission_settings (updated_by)
    - manual_commission_entries (created_by)
    - notifications (appointment_id)
    - payments (recorded_by)
    - subscription_payments (created_by)
*/

-- Add indexes for foreign keys in appointments table
CREATE INDEX IF NOT EXISTS idx_appointments_barber_id ON appointments(barber_id);
CREATE INDEX IF NOT EXISTS idx_appointments_payment_verified_by ON appointments(payment_verified_by);
CREATE INDEX IF NOT EXISTS idx_appointments_service_id ON appointments(service_id);

-- Add index for barber_availability_blocks
CREATE INDEX IF NOT EXISTS idx_barber_availability_blocks_created_by ON barber_availability_blocks(created_by);

-- Add index for client_subscriptions
CREATE INDEX IF NOT EXISTS idx_client_subscriptions_plan_id ON client_subscriptions(plan_id);

-- Add index for commission_settings
CREATE INDEX IF NOT EXISTS idx_commission_settings_updated_by ON commission_settings(updated_by);

-- Add index for manual_commission_entries
CREATE INDEX IF NOT EXISTS idx_manual_commission_entries_created_by ON manual_commission_entries(created_by);

-- Add index for notifications
CREATE INDEX IF NOT EXISTS idx_notifications_appointment_id ON notifications(appointment_id);

-- Add index for payments
CREATE INDEX IF NOT EXISTS idx_payments_recorded_by ON payments(recorded_by);

-- Add index for subscription_payments
CREATE INDEX IF NOT EXISTS idx_subscription_payments_created_by ON subscription_payments(created_by);