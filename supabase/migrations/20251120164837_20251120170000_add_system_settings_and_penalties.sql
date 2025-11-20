/*
  # Sistema de Configurações, Penalidades e Permissões

  1. Nova Tabela: system_settings
    - Configurações globais do sistema
    - `id` (uuid, primary key)
    - `setting_key` (text, unique) - Chave da configuração
    - `setting_value` (jsonb) - Valor da configuração
    - `description` (text) - Descrição da configuração
    - `updated_at` (timestamptz)

  2. Nova Tabela: subscriber_penalties
    - Penalidades aplicadas a assinantes
    - `id` (uuid, primary key)
    - `client_id` (uuid, references profiles)
    - `reason` (text) - Motivo da penalidade
    - `penalty_start` (timestamptz) - Início da penalidade
    - `penalty_end` (timestamptz) - Fim da penalidade
    - `applied_by` (uuid, references admin_users) - Quem aplicou
    - `is_active` (boolean) - Se está ativa
    - `created_at` (timestamptz)

  3. Nova Tabela: barber_permissions
    - Permissões granulares por barbeiro
    - `id` (uuid, primary key)
    - `barber_id` (uuid, references barbers)
    - `can_create_appointments` (boolean)
    - `can_edit_appointments` (boolean)
    - `can_manage_products` (boolean)
    - `can_manage_services` (boolean)
    - `can_create_blocks` (boolean)
    - `can_remove_days_off` (boolean)
    - `can_edit_client_notes` (boolean)
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  4. Alterações na Tabela: barbers
    - Adicionar novos campos para profissionais
    - `nif` (text) - Número de identificação fiscal
    - `phone` (text) - Telemóvel
    - `mbway_number` (text) - Número MBWay
    - `address` (text) - Morada
    - `profile_photo_url` (text) - URL da foto de perfil
    - `availability_days_advance` (integer) - Dias de antecedência para visualização
    - `is_hidden` (boolean) - Ocultar do site público

  5. Configurações Padrão
    - Tolerância de cancelamento
    - Duração de penalidades
    - Percentual de comissão de assinaturas
    - Descontos de vales

  6. Security
    - Enable RLS em todas as tabelas
    - Apenas admins podem gerenciar configurações
*/

-- Create system_settings table
CREATE TABLE IF NOT EXISTS system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text UNIQUE NOT NULL,
  setting_value jsonb NOT NULL,
  description text DEFAULT '',
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(setting_key);

ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage system settings"
  ON system_settings FOR ALL
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

-- Create subscriber_penalties table
CREATE TABLE IF NOT EXISTS subscriber_penalties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  reason text NOT NULL,
  penalty_start timestamptz NOT NULL DEFAULT now(),
  penalty_end timestamptz NOT NULL,
  applied_by uuid REFERENCES admin_users(id) ON DELETE SET NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscriber_penalties_client ON subscriber_penalties(client_id);
CREATE INDEX IF NOT EXISTS idx_subscriber_penalties_active ON subscriber_penalties(is_active, penalty_end);

ALTER TABLE subscriber_penalties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage penalties"
  ON subscriber_penalties FOR ALL
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

CREATE POLICY "Users can view their own penalties"
  ON subscriber_penalties FOR SELECT
  TO authenticated
  USING (client_id = auth.uid());

-- Create barber_permissions table
CREATE TABLE IF NOT EXISTS barber_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barber_id uuid UNIQUE REFERENCES barbers(id) ON DELETE CASCADE NOT NULL,
  can_create_appointments boolean DEFAULT true,
  can_edit_appointments boolean DEFAULT true,
  can_manage_products boolean DEFAULT false,
  can_manage_services boolean DEFAULT false,
  can_create_blocks boolean DEFAULT true,
  can_remove_days_off boolean DEFAULT false,
  can_edit_client_notes boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_barber_permissions_barber ON barber_permissions(barber_id);

ALTER TABLE barber_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage barber permissions"
  ON barber_permissions FOR ALL
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

CREATE POLICY "Barbers can view their own permissions"
  ON barber_permissions FOR SELECT
  TO authenticated
  USING (
    barber_id IN (
      SELECT id FROM barbers
      WHERE auth_user_id = auth.uid()
    )
  );

-- Add new fields to barbers table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'barbers' AND column_name = 'nif') THEN
    ALTER TABLE barbers ADD COLUMN nif text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'barbers' AND column_name = 'phone') THEN
    ALTER TABLE barbers ADD COLUMN phone text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'barbers' AND column_name = 'mbway_number') THEN
    ALTER TABLE barbers ADD COLUMN mbway_number text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'barbers' AND column_name = 'address') THEN
    ALTER TABLE barbers ADD COLUMN address text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'barbers' AND column_name = 'profile_photo_url') THEN
    ALTER TABLE barbers ADD COLUMN profile_photo_url text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'barbers' AND column_name = 'availability_days_advance') THEN
    ALTER TABLE barbers ADD COLUMN availability_days_advance integer DEFAULT 7;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'barbers' AND column_name = 'is_hidden') THEN
    ALTER TABLE barbers ADD COLUMN is_hidden boolean DEFAULT false;
  END IF;
END $$;

-- Insert default system settings
INSERT INTO system_settings (setting_key, setting_value, description) VALUES
  ('cancellation_tolerance_minutes', '60', 'Tolerância antes de aplicar penalidade (em minutos): 20, 60, 120, 180, 240, 300'),
  ('penalty_duration_hours', '24', 'Duração da penalidade em horas: 1, 2, 3, 6, 12, 24, 48, 72'),
  ('subscription_commission_percentage', '0', 'Percentual que o barbeiro recebe das assinaturas'),
  ('voucher_discounts', '{"all": 0, "individual_services": 0, "subscription_services": 0, "products": 0}', 'Descontos de vales por categoria')
ON CONFLICT (setting_key) DO NOTHING;

-- Function to automatically deactivate expired penalties
CREATE OR REPLACE FUNCTION deactivate_expired_penalties()
RETURNS void AS $$
BEGIN
  UPDATE subscriber_penalties
  SET is_active = false
  WHERE is_active = true
  AND penalty_end < now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if client has active penalty
CREATE OR REPLACE FUNCTION has_active_penalty(p_client_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM subscriber_penalties
    WHERE client_id = p_client_id
    AND is_active = true
    AND penalty_end > now()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create default permissions for new barber
CREATE OR REPLACE FUNCTION create_default_barber_permissions()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO barber_permissions (barber_id)
  VALUES (NEW.id)
  ON CONFLICT (barber_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_create_barber_permissions ON barbers;
CREATE TRIGGER trigger_create_barber_permissions
  AFTER INSERT ON barbers
  FOR EACH ROW
  EXECUTE FUNCTION create_default_barber_permissions();

-- Create permissions for existing barbers
INSERT INTO barber_permissions (barber_id)
SELECT id FROM barbers
WHERE id NOT IN (SELECT barber_id FROM barber_permissions)
ON CONFLICT (barber_id) DO NOTHING;