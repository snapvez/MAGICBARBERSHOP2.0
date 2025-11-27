/*
  # Sistema Completo de Serviços, Horários e Folgas

  1. Nova Tabela: barber_services
    - Relaciona barbeiros com serviços que eles realizam
    - `id` (uuid, primary key)
    - `barber_id` (uuid, references barbers)
    - `service_id` (uuid, references services)
    - `custom_commission_percentage` (numeric) - Comissão personalizada
    - `custom_duration_minutes` (integer) - Duração personalizada
    - `custom_price` (numeric) - Preço personalizado
    - `created_at` (timestamptz)

  2. Nova Tabela: barber_schedules
    - Horários de trabalho por dia da semana
    - `id` (uuid, primary key)
    - `barber_id` (uuid, references barbers)
    - `day_of_week` (integer) - 0=domingo, 6=sábado
    - `start_time` (time) - Horário de início
    - `end_time` (time) - Horário de fim
    - `is_working` (boolean) - Se trabalha neste dia
    - `created_at` (timestamptz)

  3. Nova Tabela: barber_breaks
    - Intervalos e pausas durante o dia
    - `id` (uuid, primary key)
    - `barber_id` (uuid, references barbers)
    - `day_of_week` (integer) - 0=domingo, 6=sábado
    - `start_time` (time)
    - `end_time` (time)
    - `description` (text)
    - `created_at` (timestamptz)

  4. Nova Tabela: barber_time_off
    - Folgas, férias e bloqueios
    - `id` (uuid, primary key)
    - `barber_id` (uuid, references barbers)
    - `start_date` (date)
    - `end_date` (date)
    - `type` (text) - 'day_off', 'vacation', 'block'
    - `reason` (text)
    - `is_active` (boolean)
    - `created_at` (timestamptz)

  5. Alterações na Tabela: services
    - Adicionar novos campos para serviços
    - `tokens_price` (numeric) - Valor em fichas
    - `rebooking_period_days` (integer) - Período para reocupar
    - `is_hidden` (boolean) - Oculto do cliente
    - `is_quick_service` (boolean) - Serviço de encaixe
    - `push_notification_enabled` (boolean) - Para campanhas push
    - `price_starts_at` (boolean) - Preço "a partir de"
    - `service_type` (text) - 'subscription' ou 'individual'

  6. Nova Tabela: voucher_settings
    - Configurações de vales e descontos
    - `id` (uuid, primary key)
    - `discount_source` (text) - 'all', 'subscription', 'extra_services', 'products'
    - `discount_percentage` (numeric)
    - `description` (text)
    - `is_active` (boolean)

  7. Security
    - Enable RLS em todas as tabelas
    - Políticas apropriadas para cada tabela
*/

-- Create barber_services table
CREATE TABLE IF NOT EXISTS barber_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barber_id uuid REFERENCES barbers(id) ON DELETE CASCADE NOT NULL,
  service_id uuid REFERENCES services(id) ON DELETE CASCADE NOT NULL,
  custom_commission_percentage numeric(5,2),
  custom_duration_minutes integer,
  custom_price numeric(10,2),
  created_at timestamptz DEFAULT now(),
  UNIQUE(barber_id, service_id)
);

CREATE INDEX IF NOT EXISTS idx_barber_services_barber ON barber_services(barber_id);
CREATE INDEX IF NOT EXISTS idx_barber_services_service ON barber_services(service_id);

ALTER TABLE barber_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage barber services"
  ON barber_services FOR ALL
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

CREATE POLICY "Anyone can view barber services"
  ON barber_services FOR SELECT
  USING (true);

-- Create barber_schedules table
CREATE TABLE IF NOT EXISTS barber_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barber_id uuid REFERENCES barbers(id) ON DELETE CASCADE NOT NULL,
  day_of_week integer NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  is_working boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(barber_id, day_of_week)
);

CREATE INDEX IF NOT EXISTS idx_barber_schedules_barber ON barber_schedules(barber_id);

ALTER TABLE barber_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage barber schedules"
  ON barber_schedules FOR ALL
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

CREATE POLICY "Anyone can view barber schedules"
  ON barber_schedules FOR SELECT
  USING (true);

-- Create barber_breaks table
CREATE TABLE IF NOT EXISTS barber_breaks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barber_id uuid REFERENCES barbers(id) ON DELETE CASCADE NOT NULL,
  day_of_week integer NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  description text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_barber_breaks_barber ON barber_breaks(barber_id);

ALTER TABLE barber_breaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage barber breaks"
  ON barber_breaks FOR ALL
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

CREATE POLICY "Anyone can view barber breaks"
  ON barber_breaks FOR SELECT
  USING (true);

-- Create barber_time_off table
CREATE TABLE IF NOT EXISTS barber_time_off (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barber_id uuid REFERENCES barbers(id) ON DELETE CASCADE NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  type text NOT NULL CHECK (type IN ('day_off', 'vacation', 'block')),
  reason text DEFAULT '',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_barber_time_off_barber ON barber_time_off(barber_id);
CREATE INDEX IF NOT EXISTS idx_barber_time_off_dates ON barber_time_off(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_barber_time_off_active ON barber_time_off(is_active);

ALTER TABLE barber_time_off ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage barber time off"
  ON barber_time_off FOR ALL
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

CREATE POLICY "Anyone can view active barber time off"
  ON barber_time_off FOR SELECT
  USING (is_active = true);

-- Add new fields to services table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'services' AND column_name = 'tokens_price') THEN
    ALTER TABLE services ADD COLUMN tokens_price numeric(10,2);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'services' AND column_name = 'rebooking_period_days') THEN
    ALTER TABLE services ADD COLUMN rebooking_period_days integer;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'services' AND column_name = 'is_hidden') THEN
    ALTER TABLE services ADD COLUMN is_hidden boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'services' AND column_name = 'is_quick_service') THEN
    ALTER TABLE services ADD COLUMN is_quick_service boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'services' AND column_name = 'push_notification_enabled') THEN
    ALTER TABLE services ADD COLUMN push_notification_enabled boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'services' AND column_name = 'price_starts_at') THEN
    ALTER TABLE services ADD COLUMN price_starts_at boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'services' AND column_name = 'service_type') THEN
    ALTER TABLE services ADD COLUMN service_type text DEFAULT 'individual' CHECK (service_type IN ('subscription', 'individual'));
  END IF;
END $$;

-- Create voucher_settings table
CREATE TABLE IF NOT EXISTS voucher_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  discount_source text NOT NULL CHECK (discount_source IN ('all', 'subscription', 'extra_services', 'products')),
  discount_percentage numeric(5,2) DEFAULT 0 CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
  description text DEFAULT '',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE voucher_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage voucher settings"
  ON voucher_settings FOR ALL
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

-- Function to get barber availability considering time off
CREATE OR REPLACE FUNCTION is_barber_available(
  p_barber_id uuid,
  p_date date,
  p_time time
)
RETURNS boolean AS $$
DECLARE
  v_day_of_week integer;
  v_is_time_off boolean;
  v_is_working boolean;
  v_in_schedule boolean;
  v_in_break boolean;
BEGIN
  v_day_of_week := EXTRACT(DOW FROM p_date);
  
  -- Check if barber has time off
  SELECT EXISTS (
    SELECT 1 FROM barber_time_off
    WHERE barber_id = p_barber_id
    AND p_date BETWEEN start_date AND end_date
    AND is_active = true
  ) INTO v_is_time_off;
  
  IF v_is_time_off THEN
    RETURN false;
  END IF;
  
  -- Check if barber works on this day
  SELECT is_working INTO v_is_working
  FROM barber_schedules
  WHERE barber_id = p_barber_id
  AND day_of_week = v_day_of_week;
  
  IF NOT FOUND OR NOT v_is_working THEN
    RETURN false;
  END IF;
  
  -- Check if time is within working hours
  SELECT EXISTS (
    SELECT 1 FROM barber_schedules
    WHERE barber_id = p_barber_id
    AND day_of_week = v_day_of_week
    AND p_time BETWEEN start_time AND end_time
  ) INTO v_in_schedule;
  
  IF NOT v_in_schedule THEN
    RETURN false;
  END IF;
  
  -- Check if time is during a break
  SELECT EXISTS (
    SELECT 1 FROM barber_breaks
    WHERE barber_id = p_barber_id
    AND day_of_week = v_day_of_week
    AND p_time BETWEEN start_time AND end_time
  ) INTO v_in_break;
  
  IF v_in_break THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get barber time off type for display
CREATE OR REPLACE FUNCTION get_barber_time_off_type(
  p_barber_id uuid,
  p_date date
)
RETURNS text AS $$
DECLARE
  v_time_off_type text;
BEGIN
  SELECT type INTO v_time_off_type
  FROM barber_time_off
  WHERE barber_id = p_barber_id
  AND p_date BETWEEN start_date AND end_date
  AND is_active = true
  LIMIT 1;
  
  RETURN COALESCE(v_time_off_type, 'available');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;