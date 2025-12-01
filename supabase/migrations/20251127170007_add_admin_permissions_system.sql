/*
  # Sistema de Permissões para Administradores

  1. Novas Tabelas
    - `admin_permissions` - Permissões disponíveis no sistema
    - `admin_user_permissions` - Permissões atribuídas a cada admin

  2. Tipos de Admin
    - `super_admin` (Maycon) - Acesso total, controla permissões de outros admins
    - `admin` - Administrador com permissões customizadas definidas pelo super admin
    - `barber` - Barbeiro com acesso limitado aos seus próprios dados

  3. Permissões Disponíveis
    - view_dashboard - Ver dashboard principal
    - manage_appointments - Gerenciar todos os agendamentos
    - manage_clients - Gerenciar clientes
    - manage_services - Gerenciar serviços
    - manage_barbers - Gerenciar barbeiros
    - manage_subscriptions - Gerenciar assinaturas
    - view_revenue - Ver receitas
    - manage_revenue - Gerenciar receitas e pagamentos
    - manage_commissions - Gerenciar comissões
    - view_reports - Ver relatórios
    - manage_schedule - Gerenciar horários
    - manage_settings - Gerenciar configurações do sistema
    - manage_admins - Gerenciar outros administradores (apenas super admin)
    - manage_branding - Gerenciar marca/visual

  4. Segurança
    - RLS em todas as tabelas
    - Super admin tem acesso total sempre
    - Admins regulares só podem fazer o que têm permissão
    - Barbeiros continuam com acesso limitado aos seus dados
*/

-- Update admin_users role check to include 'admin'
ALTER TABLE admin_users DROP CONSTRAINT IF EXISTS admin_users_role_check;
ALTER TABLE admin_users ADD CONSTRAINT admin_users_role_check
  CHECK (role IN ('super_admin', 'admin', 'barber'));

-- Create admin_permissions table
CREATE TABLE IF NOT EXISTS admin_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  permission_key text UNIQUE NOT NULL,
  permission_name text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

-- Create admin_user_permissions junction table
CREATE TABLE IF NOT EXISTS admin_user_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  permission_key text NOT NULL REFERENCES admin_permissions(permission_key) ON DELETE CASCADE,
  granted_by uuid REFERENCES admin_users(id) ON DELETE SET NULL,
  granted_at timestamptz DEFAULT now(),
  UNIQUE(admin_user_id, permission_key)
);

-- Enable RLS
ALTER TABLE admin_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_user_permissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for admin_permissions (everyone can read available permissions)
CREATE POLICY "Anyone authenticated can view available permissions"
  ON admin_permissions FOR SELECT
  TO authenticated
  USING (true);

-- Only super admins can manage permissions list
CREATE POLICY "Super admins can manage permissions"
  ON admin_permissions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE auth_user_id = auth.uid()
      AND role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE auth_user_id = auth.uid()
      AND role = 'super_admin'
    )
  );

-- RLS Policies for admin_user_permissions
CREATE POLICY "Admins can view their own permissions"
  ON admin_user_permissions FOR SELECT
  TO authenticated
  USING (
    admin_user_id IN (
      SELECT id FROM admin_users WHERE auth_user_id = auth.uid()
    )
  );

-- Super admins can view and manage all permissions
CREATE POLICY "Super admins can view all permissions"
  ON admin_user_permissions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE auth_user_id = auth.uid()
      AND role = 'super_admin'
    )
  );

CREATE POLICY "Super admins can manage all permissions"
  ON admin_user_permissions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE auth_user_id = auth.uid()
      AND role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE auth_user_id = auth.uid()
      AND role = 'super_admin'
    )
  );

-- Insert default permissions
INSERT INTO admin_permissions (permission_key, permission_name, description)
VALUES
  ('view_dashboard', 'Ver Dashboard', 'Visualizar dashboard principal com métricas gerais'),
  ('manage_appointments', 'Gerenciar Agendamentos', 'Ver e gerenciar todos os agendamentos'),
  ('manage_clients', 'Gerenciar Clientes', 'Ver e gerenciar clientes'),
  ('manage_services', 'Gerenciar Serviços', 'Criar, editar e remover serviços'),
  ('manage_barbers', 'Gerenciar Barbeiros', 'Criar, editar e remover barbeiros'),
  ('manage_subscriptions', 'Gerenciar Assinaturas', 'Ver e gerenciar planos e assinaturas'),
  ('view_revenue', 'Ver Receitas', 'Visualizar receitas e relatórios financeiros'),
  ('manage_revenue', 'Gerenciar Receitas', 'Registrar pagamentos e gerenciar receitas'),
  ('manage_commissions', 'Gerenciar Comissões', 'Ver e gerenciar comissões de barbeiros'),
  ('view_reports', 'Ver Relatórios', 'Visualizar relatórios e estatísticas'),
  ('manage_schedule', 'Gerenciar Horários', 'Gerenciar horários de funcionamento'),
  ('manage_settings', 'Gerenciar Configurações', 'Alterar configurações do sistema'),
  ('manage_admins', 'Gerenciar Administradores', 'Criar e gerenciar outros administradores (apenas super admin)'),
  ('manage_branding', 'Gerenciar Marca', 'Alterar logo, cores e visual do sistema')
ON CONFLICT (permission_key) DO NOTHING;

-- Function to check if user has a specific permission
CREATE OR REPLACE FUNCTION has_permission(perm_key text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  -- Super admins always have all permissions
  SELECT CASE
    WHEN EXISTS (
      SELECT 1 FROM admin_users
      WHERE auth_user_id = auth.uid()
      AND role = 'super_admin'
    ) THEN true
    -- Check if admin has the specific permission
    WHEN EXISTS (
      SELECT 1 FROM admin_user_permissions aup
      JOIN admin_users au ON au.id = aup.admin_user_id
      WHERE au.auth_user_id = auth.uid()
      AND aup.permission_key = perm_key
    ) THEN true
    ELSE false
  END;
$$;

-- Function to get all permissions for current user
CREATE OR REPLACE FUNCTION get_user_permissions()
RETURNS TABLE(permission_key text, permission_name text, description text)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  -- If super admin, return all permissions
  SELECT ap.permission_key, ap.permission_name, ap.description
  FROM admin_permissions ap
  WHERE EXISTS (
    SELECT 1 FROM admin_users
    WHERE auth_user_id = auth.uid()
    AND role = 'super_admin'
  )

  UNION

  -- Return user's specific permissions
  SELECT ap.permission_key, ap.permission_name, ap.description
  FROM admin_permissions ap
  JOIN admin_user_permissions aup ON aup.permission_key = ap.permission_key
  JOIN admin_users au ON au.id = aup.admin_user_id
  WHERE au.auth_user_id = auth.uid();
$$;

-- Update is_super_admin function to be more explicit
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM admin_users
    WHERE auth_user_id = auth.uid()
    AND role = 'super_admin'
  );
$$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_admin_user_permissions_admin_user_id ON admin_user_permissions(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_user_permissions_permission_key ON admin_user_permissions(permission_key);
CREATE INDEX IF NOT EXISTS idx_admin_permissions_permission_key ON admin_permissions(permission_key);
