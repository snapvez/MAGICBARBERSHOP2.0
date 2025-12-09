/*
  # Add Availability Blocking and Email Notifications System

  ## 1. New Tables
    
    ### `barber_availability_blocks`
    - Allows admins to block specific time periods for barbers (days off, holidays, etc.)
    - `id` (uuid, primary key)
    - `barber_id` (uuid, references barbers)
    - `start_datetime` (timestamptz) - Start of blocked period
    - `end_datetime` (timestamptz) - End of blocked period
    - `reason` (text) - Reason for blocking (optional)
    - `created_by` (uuid, references admin_users)
    - `created_at` (timestamptz)
    
    ### `email_templates`
    - Store customizable email templates for notifications
    - `id` (uuid, primary key)
    - `template_type` (text) - Type of email (booking_confirmed, booking_changed, booking_cancelled, reminder)
    - `subject` (text) - Email subject
    - `body` (text) - Email body with placeholders
    - `active` (boolean) - Whether template is active
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)
    
    ### `notification_log`
    - Track all notifications sent to clients
    - `id` (uuid, primary key)
    - `appointment_id` (uuid, references appointments)
    - `notification_type` (text) - Type of notification
    - `recipient_email` (text)
    - `recipient_phone` (text)
    - `status` (text) - sent, failed, pending
    - `sent_at` (timestamptz)
    - `error_message` (text)

  ## 2. Security
    - Enable RLS on all new tables
    - Admins can manage availability blocks
    - Admins can view notification logs
    - Email templates readable by authenticated users
*/

-- Create barber availability blocks table
CREATE TABLE IF NOT EXISTS barber_availability_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barber_id uuid REFERENCES barbers(id) ON DELETE CASCADE NOT NULL,
  start_datetime timestamptz NOT NULL,
  end_datetime timestamptz NOT NULL,
  reason text DEFAULT '',
  created_by uuid REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_time_range CHECK (end_datetime > start_datetime)
);

CREATE INDEX IF NOT EXISTS idx_availability_blocks_barber ON barber_availability_blocks(barber_id);
CREATE INDEX IF NOT EXISTS idx_availability_blocks_dates ON barber_availability_blocks(start_datetime, end_datetime);

ALTER TABLE barber_availability_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage availability blocks"
  ON barber_availability_blocks FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE admin_users.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE admin_users.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view availability blocks"
  ON barber_availability_blocks FOR SELECT
  TO authenticated
  USING (true);

-- Create email templates table
CREATE TABLE IF NOT EXISTS email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_type text UNIQUE NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active email templates"
  ON email_templates FOR SELECT
  TO authenticated
  USING (active = true);

CREATE POLICY "Admins can manage email templates"
  ON email_templates FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE admin_users.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE admin_users.auth_user_id = auth.uid()
    )
  );

-- Create notification log table
CREATE TABLE IF NOT EXISTS notification_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid REFERENCES appointments(id) ON DELETE CASCADE,
  notification_type text NOT NULL,
  recipient_email text,
  recipient_phone text,
  status text DEFAULT 'pending',
  sent_at timestamptz,
  error_message text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notification_log_appointment ON notification_log(appointment_id);
CREATE INDEX IF NOT EXISTS idx_notification_log_status ON notification_log(status);

ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view notification logs"
  ON notification_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE admin_users.auth_user_id = auth.uid()
    )
  );

-- Insert default email templates
INSERT INTO email_templates (template_type, subject, body) VALUES
(
  'booking_confirmed',
  'Marcação Confirmada - %NOME_NEGOCIO%',
  'Olá %NOME%,

A sua marcação para %NOME_NEGOCIO% foi confirmada.

Data da marcação: %DATA%

Se desejar cancelar esta marcação basta clicar na seguinte ligação %LINK_CANCELAR% ou ligue para %TELEFONE%

Obrigado'
),
(
  'booking_changed',
  'Marcação Alterada - %NOME_NEGOCIO%',
  'Olá %NOME%,

A sua marcação (%NOME_NEGOCIO%) foi alterada para %DATA%.

Se desejar cancelar esta marcação basta clicar na seguinte ligação %LINK_CANCELAR% ou ligue para %TELEFONE%

Obrigado'
),
(
  'booking_cancelled',
  'Marcação Cancelada - %NOME_NEGOCIO%',
  'Olá %NOME%,

A sua marcação para %NOME_NEGOCIO% agendada para %DATA% foi cancelada.

Se tiver alguma dúvida, entre em contacto connosco através do %TELEFONE%

Obrigado'
),
(
  'booking_reminder',
  'Lembrete de Marcação - %NOME_NEGOCIO%',
  'Olá %NOME%,

Lembramos que tem uma marcação para %NOME_NEGOCIO% amanhã às %DATA%.

Se desejar cancelar esta marcação basta clicar na seguinte ligação %LINK_CANCELAR% ou ligue para %TELEFONE%

Obrigado'
)
ON CONFLICT (template_type) DO NOTHING;

-- Function to check if a barber is available at a given time
CREATE OR REPLACE FUNCTION is_barber_available(
  p_barber_id uuid,
  p_start_time timestamptz,
  p_end_time timestamptz
) RETURNS boolean AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM barber_availability_blocks
    WHERE barber_id = p_barber_id
    AND (
      (start_datetime <= p_start_time AND end_datetime > p_start_time)
      OR (start_datetime < p_end_time AND end_datetime >= p_end_time)
      OR (start_datetime >= p_start_time AND end_datetime <= p_end_time)
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;