/*
  # Separate Subscription and Individual Services

  ## Overview
  This migration adds functionality to track individual (pay-per-service) bookings
  separately from subscription-based bookings for better revenue tracking.

  ## Changes
  1. Add `is_subscription_booking` field to appointments table
  2. Add `client_name_at_booking` to store the client name at the time of booking
  3. Update existing appointments to mark them appropriately
  4. Add check to differentiate subscription vs individual service revenue

  ## Business Logic
  - Subscription bookings: Covered by monthly subscription, no immediate payment
  - Individual bookings: Pay-per-service, requires payment confirmation
*/

-- Add field to track if appointment is subscription-based or individual
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'appointments' AND column_name = 'is_subscription_booking'
  ) THEN
    ALTER TABLE appointments ADD COLUMN is_subscription_booking boolean DEFAULT false;
  END IF;
END $$;

-- Add field to store client name at time of booking
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'appointments' AND column_name = 'client_name_at_booking'
  ) THEN
    ALTER TABLE appointments ADD COLUMN client_name_at_booking text;
  END IF;
END $$;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_appointments_is_subscription 
  ON appointments(is_subscription_booking, status);

CREATE INDEX IF NOT EXISTS idx_appointments_payment_tracking 
  ON appointments(appointment_date, is_subscription_booking) 
  WHERE status IN ('completed', 'confirmed');

-- Create view for revenue reporting
CREATE OR REPLACE VIEW revenue_breakdown AS
SELECT
  appointment_date,
  CASE 
    WHEN is_subscription_booking THEN 'Assinatura'
    ELSE 'Avulso'
  END as revenue_type,
  COUNT(*) as total_appointments,
  SUM(CASE WHEN status = 'completed' THEN services.price ELSE 0 END) as total_revenue
FROM appointments
LEFT JOIN services ON appointments.service_id = services.id
GROUP BY appointment_date, is_subscription_booking
ORDER BY appointment_date DESC;

COMMENT ON COLUMN appointments.is_subscription_booking IS 'True if appointment is covered by subscription, False if individual pay-per-service';
COMMENT ON COLUMN appointments.client_name_at_booking IS 'Client name captured at booking time for display purposes';