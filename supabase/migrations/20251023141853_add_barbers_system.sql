/*
  # Adicionar Sistema de Barbeiros

  ## Alterações
  
  1. Nova Tabela: `barbers`
    - `id` (uuid, chave primária)
    - `name` (text, nome do barbeiro)
    - `is_active` (boolean, se o barbeiro está ativo)
    - `created_at` (timestamp)
  
  2. Modificações na Tabela `appointments`
    - Adiciona coluna `barber_id` (uuid, referência ao barbeiro)
  
  3. Dados Iniciais
    - Insere os barbeiros: João Pedro e Maycon
  
  4. Segurança
    - Habilita RLS na tabela `barbers`
    - Política de leitura pública para barbeiros ativos
    - Apenas admins podem modificar barbeiros
*/

CREATE TABLE IF NOT EXISTS barbers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE barbers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Qualquer um pode ver barbeiros ativos"
  ON barbers FOR SELECT
  USING (is_active = true);

CREATE POLICY "Apenas admins podem inserir barbeiros"
  ON barbers FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.auth_user_id = auth.uid()
      AND admin_users.is_active = true
    )
  );

CREATE POLICY "Apenas admins podem atualizar barbeiros"
  ON barbers FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.auth_user_id = auth.uid()
      AND admin_users.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.auth_user_id = auth.uid()
      AND admin_users.is_active = true
    )
  );

CREATE POLICY "Apenas admins podem deletar barbeiros"
  ON barbers FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.auth_user_id = auth.uid()
      AND admin_users.is_active = true
    )
  );

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'appointments' AND column_name = 'barber_id'
  ) THEN
    ALTER TABLE appointments ADD COLUMN barber_id uuid REFERENCES barbers(id);
  END IF;
END $$;

INSERT INTO barbers (name, is_active)
VALUES 
  ('João Pedro', true),
  ('Maycon', true)
ON CONFLICT DO NOTHING;
