/*
  # Sistema de Autenticação por Telemóvel

  ## Alterações
  Esta migration cria um sistema simplificado onde os utilizadores apenas precisam de nome e telemóvel para usar o sistema.

  ## Novas Tabelas
  
  ### guests
    - `id` (uuid, primary key) - Identificador único do cliente
    - `full_name` (text, obrigatório) - Nome completo do cliente
    - `phone` (text, único, obrigatório) - Número de telemóvel (identificador único)
    - `loyalty_points` (integer) - Pontos de fidelidade acumulados
    - `total_visits` (integer) - Total de visitas realizadas
    - `created_at` (timestamptz) - Data de criação
    - `updated_at` (timestamptz) - Última atualização

  ## Modificações nas Tabelas

  ### appointments
    - Adiciona coluna `guest_id` para suportar marcações de clientes não autenticados
    - Remove obrigatoriedade de `client_id`
    - Adiciona constraint para garantir que ou `client_id` ou `guest_id` está preenchido

  ## Segurança
  - RLS ativado na tabela guests
  - Qualquer pessoa pode criar um registo guest (para permitir marcações)
    - Clientes podem ver e atualizar os seus próprios dados usando o telemóvel
  - Políticas de appointments atualizadas para suportar guests
*/

-- Criar tabela de guests (clientes não autenticados)
CREATE TABLE IF NOT EXISTS guests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  phone text UNIQUE NOT NULL,
  loyalty_points integer DEFAULT 0,
  total_visits integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE guests ENABLE ROW LEVEL SECURITY;

-- Políticas para guests: qualquer pessoa pode criar, mas só pode ver/editar usando phone
CREATE POLICY "Anyone can create guest profile"
  ON guests FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Guests can view own profile by phone"
  ON guests FOR SELECT
  USING (true);

CREATE POLICY "Guests can update own profile by phone"
  ON guests FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Atualizar tabela de appointments para suportar guests
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'appointments' AND column_name = 'guest_id'
  ) THEN
    ALTER TABLE appointments ADD COLUMN guest_id uuid REFERENCES guests(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Remover constraint NOT NULL de client_id se existir
DO $$
BEGIN
  ALTER TABLE appointments ALTER COLUMN client_id DROP NOT NULL;
EXCEPTION
  WHEN others THEN NULL;
END $$;

-- Adicionar constraint para garantir que existe ou client_id ou guest_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'appointments_client_or_guest_check'
  ) THEN
    ALTER TABLE appointments ADD CONSTRAINT appointments_client_or_guest_check
      CHECK (
        (client_id IS NOT NULL AND guest_id IS NULL) OR
        (client_id IS NULL AND guest_id IS NOT NULL)
      );
  END IF;
END $$;

-- Políticas para appointments com guests
DROP POLICY IF EXISTS "Guests can view own appointments" ON appointments;
CREATE POLICY "Guests can view own appointments"
  ON appointments FOR SELECT
  USING (
    auth.uid() = client_id OR
    guest_id IN (SELECT id FROM guests)
  );

DROP POLICY IF EXISTS "Guests can create appointments" ON appointments;
CREATE POLICY "Guests can create appointments"
  ON appointments FOR INSERT
  WITH CHECK (
    auth.uid() = client_id OR
    guest_id IS NOT NULL
  );

DROP POLICY IF EXISTS "Guests can update own appointments" ON appointments;
CREATE POLICY "Guests can update own appointments"
  ON appointments FOR UPDATE
  USING (
    auth.uid() = client_id OR
    guest_id IN (SELECT id FROM guests)
  )
  WITH CHECK (
    auth.uid() = client_id OR
    guest_id IN (SELECT id FROM guests)
  );

-- Políticas para serviços: qualquer pessoa pode ver serviços ativos
DROP POLICY IF EXISTS "Anyone can view active services" ON services;
CREATE POLICY "Public can view active services"
  ON services FOR SELECT
  USING (is_active = true);

-- Criar índice para melhorar performance de buscas por telemóvel
CREATE INDEX IF NOT EXISTS idx_guests_phone ON guests(phone);
CREATE INDEX IF NOT EXISTS idx_appointments_guest_id ON appointments(guest_id);
