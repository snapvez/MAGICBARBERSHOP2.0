/*
  # Update Notifications System to SMS

  ## Overview
  Changes the notification system from email to SMS messaging.

  ## Changes
  1. Rename email_templates to sms_templates
  2. Update column names to reflect SMS instead of email
  3. Update default SMS templates with Portuguese messages
  4. Update notification_log to prioritize SMS

  ## SMS Templates
  - booking_confirmed: Confirmation message
  - booking_changed: Change notification
  - booking_cancelled: Cancellation message
  - booking_reminder: Reminder before appointment
*/

-- Rename table from email_templates to sms_templates
ALTER TABLE IF EXISTS email_templates RENAME TO sms_templates;

-- Update the unique constraint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'email_templates_template_type_key'
  ) THEN
    ALTER TABLE sms_templates 
    RENAME CONSTRAINT email_templates_template_type_key TO sms_templates_template_type_key;
  END IF;
END $$;

-- Update column names to reflect SMS
ALTER TABLE sms_templates RENAME COLUMN subject TO message_title;
ALTER TABLE sms_templates RENAME COLUMN body TO message_body;

-- Clear existing email templates and insert SMS templates
TRUNCATE TABLE sms_templates;

INSERT INTO sms_templates (template_type, message_title, message_body) VALUES
(
  'booking_confirmed',
  'Marcação Confirmada',
  'Olá %NOME%,
A sua marcação para %NOME_NEGOCIO% foi confirmada.

Data da marcação: %DATA%

Se desejar cancelar esta marcação basta clicar na seguinte ligação %LINK_CANCELAR% ou ligue para %TELEFONE%

Obrigado'
),
(
  'booking_changed',
  'Marcação Alterada',
  'Olá %NOME%,
A sua marcação (%NOME_NEGOCIO%) foi alterada para %DATA%.

Se desejar cancelar esta marcação basta clicar na seguinte ligação %LINK_CANCELAR% ou ligue para %TELEFONE%

Obrigado'
),
(
  'booking_cancelled',
  'Marcação Cancelada',
  'Olá %NOME%,
A sua marcação para %NOME_NEGOCIO% agendada para %DATA% foi cancelada.

Se tiver alguma dúvida, entre em contacto connosco através do %TELEFONE%

Obrigado'
),
(
  'booking_reminder',
  'Lembrete de Marcação',
  'Olá %NOME%,
Lembramos que tem uma marcação para %NOME_NEGOCIO% amanhã às %DATA%.

Se desejar cancelar esta marcação basta clicar na seguinte ligação %LINK_CANCELAR% ou ligue para %TELEFONE%

Obrigado'
);

-- Update RLS policies to use new table name
DROP POLICY IF EXISTS "Anyone can read active email templates" ON sms_templates;
DROP POLICY IF EXISTS "Admins can manage email templates" ON sms_templates;

CREATE POLICY "Anyone can read active SMS templates"
  ON sms_templates FOR SELECT
  TO authenticated
  USING (active = true);

CREATE POLICY "Admins can manage SMS templates"
  ON sms_templates FOR ALL
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

-- Update notification_log to prioritize phone over email
COMMENT ON COLUMN notification_log.recipient_email IS 'Secondary contact method (fallback)';
COMMENT ON COLUMN notification_log.recipient_phone IS 'Primary contact method (SMS)';