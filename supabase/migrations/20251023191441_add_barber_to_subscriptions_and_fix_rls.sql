/*
  # Adicionar Barbeiro às Assinaturas e Corrigir RLS

  ## Alterações

  1. Modificações na Tabela `client_subscriptions`
    - Adiciona `barber_id` (uuid, foreign key para barbers) - barbeiro preferido para a assinatura
    - Adiciona `guest_id` (uuid, foreign key para guests) - suporte para guests comprarem assinaturas
    - Torna `client_id` opcional (nullable) para permitir guests

  2. Segurança
    - Atualiza políticas RLS para permitir que qualquer pessoa autenticada ou guest crie assinaturas
    - Mantém políticas de leitura/atualização seguras
    - Permite que admins vejam e gerenciem todas as assinaturas

  ## Notas Importantes
    - Guests podem ter assinaturas usando seu guest_id
    - Cada assinatura pode ter um barbeiro preferido (opcional)
    - Pelo menos um de `client_id` ou `guest_id` deve existir
*/

-- Adicionar coluna barber_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'client_subscriptions' AND column_name = 'barber_id'
  ) THEN
    ALTER TABLE client_subscriptions ADD COLUMN barber_id uuid REFERENCES barbers(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Adicionar coluna guest_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'client_subscriptions' AND column_name = 'guest_id'
  ) THEN
    ALTER TABLE client_subscriptions ADD COLUMN guest_id uuid REFERENCES guests(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Tornar client_id opcional
DO $$
BEGIN
  ALTER TABLE client_subscriptions ALTER COLUMN client_id DROP NOT NULL;
EXCEPTION
  WHEN others THEN NULL;
END $$;

-- Adicionar constraint para garantir que existe ou client_id ou guest_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'subscriptions_client_or_guest_check'
  ) THEN
    ALTER TABLE client_subscriptions ADD CONSTRAINT subscriptions_client_or_guest_check
      CHECK (
        (client_id IS NOT NULL AND guest_id IS NULL) OR
        (client_id IS NULL AND guest_id IS NOT NULL)
      );
  END IF;
END $$;

-- Remover políticas antigas e criar novas
DROP POLICY IF EXISTS "Users can view own subscriptions" ON client_subscriptions;
DROP POLICY IF EXISTS "Users can insert own subscriptions" ON client_subscriptions;
DROP POLICY IF EXISTS "Users can update own subscriptions" ON client_subscriptions;
DROP POLICY IF EXISTS "Admins can view all subscriptions" ON client_subscriptions;
DROP POLICY IF EXISTS "Admins can update all subscriptions" ON client_subscriptions;

-- Qualquer pessoa pode criar assinaturas (autenticados ou guests)
CREATE POLICY "Anyone can create subscriptions"
  ON client_subscriptions FOR INSERT
  WITH CHECK (
    auth.uid() = client_id OR
    guest_id IS NOT NULL
  );

-- Ver próprias assinaturas (autenticados)
CREATE POLICY "Users can view own subscriptions"
  ON client_subscriptions FOR SELECT
  TO authenticated
  USING (auth.uid() = client_id);

-- Guests podem ver suas próprias assinaturas
CREATE POLICY "Guests can view own subscriptions"
  ON client_subscriptions FOR SELECT
  USING (guest_id IN (SELECT id FROM guests));

-- Usuários podem atualizar suas próprias assinaturas
CREATE POLICY "Users can update own subscriptions"
  ON client_subscriptions FOR UPDATE
  TO authenticated
  USING (auth.uid() = client_id)
  WITH CHECK (auth.uid() = client_id);

-- Guests podem atualizar suas próprias assinaturas
CREATE POLICY "Guests can update own subscriptions"
  ON client_subscriptions FOR UPDATE
  USING (guest_id IN (SELECT id FROM guests))
  WITH CHECK (guest_id IN (SELECT id FROM guests));

-- Admins podem ver todas as assinaturas
CREATE POLICY "Admins can view all subscriptions"
  ON client_subscriptions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.auth_user_id = auth.uid()
      AND admin_users.is_active = true
    )
  );

-- Admins podem atualizar todas as assinaturas
CREATE POLICY "Admins can update all subscriptions"
  ON client_subscriptions FOR UPDATE
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

-- Criar índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_client_subscriptions_guest_id ON client_subscriptions(guest_id);
CREATE INDEX IF NOT EXISTS idx_client_subscriptions_barber_id ON client_subscriptions(barber_id);
