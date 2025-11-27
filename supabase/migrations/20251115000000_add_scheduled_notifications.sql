/*
  # Sistema de Notificações Agendadas

  1. Nova Tabela
    - `scheduled_notifications`
      - `id` (uuid, primary key)
      - `appointment_id` (uuid, references appointments)
      - `notification_type` (text) - 'reminder_client', 'reminder_admin'
      - `scheduled_for` (timestamptz) - Quando a notificação deve ser enviada
      - `status` (text) - 'pending', 'sent', 'failed'
      - `sent_at` (timestamptz)
      - `error_message` (text)
      - `recipient_email` (text)
      - `recipient_phone` (text)
      - `created_at` (timestamptz)

  2. Triggers
    - Criar notificações agendadas automaticamente quando uma marcação é criada
    - Cliente recebe notificação 1 hora antes
    - Administrador recebe notificação 2 horas antes

  3. Security
    - Enable RLS
    - Admins podem ver todas as notificações
    - Sistema pode criar e atualizar notificações
*/

-- Create scheduled notifications table
CREATE TABLE IF NOT EXISTS scheduled_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid REFERENCES appointments(id) ON DELETE CASCADE NOT NULL,
  notification_type text NOT NULL CHECK (notification_type IN ('reminder_client', 'reminder_admin')),
  scheduled_for timestamptz NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  sent_at timestamptz,
  error_message text,
  recipient_email text,
  recipient_phone text,
  client_name text,
  service_name text,
  appointment_datetime text,
  barber_name text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_appointment ON scheduled_notifications(appointment_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_scheduled_for ON scheduled_notifications(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_status ON scheduled_notifications(status, scheduled_for);

ALTER TABLE scheduled_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all scheduled notifications"
  ON scheduled_notifications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "System can manage scheduled notifications"
  ON scheduled_notifications FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Function to create scheduled notifications for an appointment
CREATE OR REPLACE FUNCTION create_scheduled_notifications()
RETURNS TRIGGER AS $$
DECLARE
  v_client_email text;
  v_client_phone text;
  v_client_name text;
  v_service_name text;
  v_barber_name text;
  v_admin_email text;
  v_appointment_datetime timestamptz;
  v_client_reminder_time timestamptz;
  v_admin_reminder_time timestamptz;
  admin_record RECORD;
BEGIN
  -- Calculate appointment datetime
  v_appointment_datetime := (NEW.appointment_date::date + NEW.start_time::time)::timestamptz;

  -- Only create notifications for confirmed appointments in the future
  IF NEW.status != 'confirmed' OR v_appointment_datetime <= now() THEN
    RETURN NEW;
  END IF;

  -- Calculate reminder times (1 hour before for client, 2 hours before for admin)
  v_client_reminder_time := v_appointment_datetime - INTERVAL '1 hour';
  v_admin_reminder_time := v_appointment_datetime - INTERVAL '2 hours';

  -- Only create if reminder time is in the future
  IF v_client_reminder_time <= now() AND v_admin_reminder_time <= now() THEN
    RETURN NEW;
  END IF;

  -- Get client information
  IF NEW.client_id IS NOT NULL THEN
    SELECT p.email, p.phone, p.full_name
    INTO v_client_email, v_client_phone, v_client_name
    FROM profiles p
    WHERE p.id = NEW.client_id;
  ELSIF NEW.guest_id IS NOT NULL THEN
    SELECT g.email, g.phone, g.full_name
    INTO v_client_email, v_client_phone, v_client_name
    FROM guests g
    WHERE g.id = NEW.guest_id;
  END IF;

  -- Use client_name_at_booking if available
  IF NEW.client_name_at_booking IS NOT NULL THEN
    v_client_name := NEW.client_name_at_booking;
  END IF;

  -- Get service name
  SELECT s.name INTO v_service_name
  FROM services s
  WHERE s.id = NEW.service_id;

  -- Get barber name
  IF NEW.barber_id IS NOT NULL THEN
    SELECT b.name INTO v_barber_name
    FROM barbers b
    WHERE b.id = NEW.barber_id;
  END IF;

  -- Create client reminder notification (1 hour before)
  IF v_client_reminder_time > now() AND (v_client_email IS NOT NULL OR v_client_phone IS NOT NULL) THEN
    INSERT INTO scheduled_notifications (
      appointment_id,
      notification_type,
      scheduled_for,
      recipient_email,
      recipient_phone,
      client_name,
      service_name,
      appointment_datetime,
      barber_name
    ) VALUES (
      NEW.id,
      'reminder_client',
      v_client_reminder_time,
      v_client_email,
      v_client_phone,
      v_client_name,
      v_service_name,
      to_char(v_appointment_datetime, 'DD/MM/YYYY às HH24:MI'),
      v_barber_name
    );
  END IF;

  -- Create admin reminder notifications (2 hours before)
  IF v_admin_reminder_time > now() THEN
    FOR admin_record IN
      SELECT au.auth_user_id
      FROM admin_users au
    LOOP
      -- Get admin email from auth.users
      SELECT raw_user_meta_data->>'email' INTO v_admin_email
      FROM auth.users
      WHERE id = admin_record.auth_user_id;

      IF v_admin_email IS NOT NULL THEN
        INSERT INTO scheduled_notifications (
          appointment_id,
          notification_type,
          scheduled_for,
          recipient_email,
          client_name,
          service_name,
          appointment_datetime,
          barber_name
        ) VALUES (
          NEW.id,
          'reminder_admin',
          v_admin_reminder_time,
          v_admin_email,
          v_client_name,
          v_service_name,
          to_char(v_appointment_datetime, 'DD/MM/YYYY às HH24:MI'),
          v_barber_name
        );
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new appointments
DROP TRIGGER IF EXISTS trigger_create_scheduled_notifications ON appointments;
CREATE TRIGGER trigger_create_scheduled_notifications
  AFTER INSERT ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION create_scheduled_notifications();

-- Create trigger for updated appointments (when status changes to confirmed)
DROP TRIGGER IF EXISTS trigger_update_scheduled_notifications ON appointments;
CREATE TRIGGER trigger_update_scheduled_notifications
  AFTER UPDATE ON appointments
  FOR EACH ROW
  WHEN (OLD.status != 'confirmed' AND NEW.status = 'confirmed')
  EXECUTE FUNCTION create_scheduled_notifications();

-- Function to delete scheduled notifications when appointment is cancelled or rescheduled
CREATE OR REPLACE FUNCTION cleanup_scheduled_notifications()
RETURNS TRIGGER AS $$
BEGIN
  -- If appointment is cancelled or rescheduled, delete pending notifications
  IF NEW.status IN ('cancelled', 'no_show') OR
     (NEW.appointment_date != OLD.appointment_date OR NEW.start_time != OLD.start_time) THEN
    DELETE FROM scheduled_notifications
    WHERE appointment_id = NEW.id
    AND status = 'pending';

    -- If rescheduled and confirmed, trigger will create new notifications
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_cleanup_scheduled_notifications ON appointments;
CREATE TRIGGER trigger_cleanup_scheduled_notifications
  AFTER UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_scheduled_notifications();
