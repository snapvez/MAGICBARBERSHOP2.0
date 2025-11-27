/*
  # Sistema de Categorias de Serviços

  1. Nova Tabela
    - `service_categories`
      - `id` (uuid, primary key)
      - `name` (text, unique) - Nome da categoria (Barbearia, Corte, Corte + Barba)
      - `description` (text) - Descrição da categoria
      - `discount_percentage` (numeric) - Percentagem de desconto
      - `commission_percentage` (numeric) - Percentagem de comissão
      - `display_order` (integer) - Ordem de exibição
      - `is_active` (boolean) - Se a categoria está ativa
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Alterações na Tabela Services
    - Adicionar `category_id` (uuid, references service_categories)
    - Manter compatibilidade com serviços existentes

  3. Dados Padrão
    - Criar categorias iniciais:
      1. Barbearia (desconto 0%, comissão 0%)
      2. Corte (desconto 0%, comissão 0%)
      3. Corte + Barba (desconto 0%, comissão 0%)
      4. Serviços Extras (desconto 0%, comissão 0%)

  4. Security
    - Enable RLS
    - Todos podem ler categorias ativas
    - Apenas admins podem criar/editar categorias
*/

-- Create service categories table
CREATE TABLE IF NOT EXISTS service_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text DEFAULT '',
  discount_percentage numeric(5,2) DEFAULT 0 CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
  commission_percentage numeric(5,2) DEFAULT 0 CHECK (commission_percentage >= 0 AND commission_percentage <= 100),
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_service_categories_active ON service_categories(is_active);
CREATE INDEX IF NOT EXISTS idx_service_categories_order ON service_categories(display_order);

ALTER TABLE service_categories ENABLE ROW LEVEL SECURITY;

-- Everyone can read active categories
CREATE POLICY "Anyone can view active service categories"
  ON service_categories FOR SELECT
  USING (is_active = true);

-- Admins can manage categories
CREATE POLICY "Admins can manage service categories"
  ON service_categories FOR ALL
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

-- Add category_id to services table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'services' AND column_name = 'category_id'
  ) THEN
    ALTER TABLE services ADD COLUMN category_id uuid REFERENCES service_categories(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_services_category ON services(category_id);
  END IF;
END $$;

-- Insert default categories
INSERT INTO service_categories (name, description, display_order) VALUES
  ('Barbearia', 'Serviços gerais de barbearia', 1),
  ('Corte', 'Serviços de corte de cabelo', 2),
  ('Corte + Barba', 'Pacotes combinados de corte e barba', 3),
  ('Serviços Extras', 'Serviços adicionais e especiais', 4)
ON CONFLICT (name) DO NOTHING;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_service_categories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_service_categories_updated_at ON service_categories;
CREATE TRIGGER trigger_update_service_categories_updated_at
  BEFORE UPDATE ON service_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_service_categories_updated_at();