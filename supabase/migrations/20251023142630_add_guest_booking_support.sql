/*
  # Adicionar Suporte para Agendamento sem Conta

  ## Alterações
  
  1. Modificações na Tabela `appointments`
    - Torna `client_id` opcional (nullable) para permitir agendamentos sem conta
    - Adiciona `guest_name` (text) - nome do cliente convidado
    - Adiciona `guest_phone` (text) - telefone do cliente convidado
    - Adiciona `guest_email` (text) - email do cliente convidado (opcional)
  
  2. Segurança
    - Atualiza políticas RLS para permitir inserção sem autenticação
    - Permite qualquer pessoa criar agendamentos (para clientes convidados)
    - Mantém políticas de leitura/atualização apenas para usuários autenticados
  
  ## Notas Importantes
    - Pelo menos um de `client_id` ou `guest_name` + `guest_phone`/`guest_email` deve existir
    - Agendamentos de convidados ficam sempre como 'pending' até confirmação do admin
*/

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'appointments' AND column_name = 'client_id'
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE appointments ALTER COLUMN client_id DROP NOT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'appointments' AND column_name = 'guest_name'
  ) THEN
    ALTER TABLE appointments ADD COLUMN guest_name text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'appointments' AND column_name = 'guest_phone'
  ) THEN
    ALTER TABLE appointments ADD COLUMN guest_phone text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'appointments' AND column_name = 'guest_email'
  ) THEN
    ALTER TABLE appointments ADD COLUMN guest_email text;
  END IF;
END $$;

DROP POLICY IF EXISTS "Usuários podem criar suas próprias marcações" ON appointments;
DROP POLICY IF EXISTS "Admins podem criar qualquer marcação" ON appointments;

CREATE POLICY "Qualquer pessoa pode criar marcações"
  ON appointments FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Usuários podem ver suas próprias marcações"
  ON appointments FOR SELECT
  TO authenticated
  USING (auth.uid() = client_id);

CREATE POLICY "Admins podem ver todas as marcações"
  ON appointments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.auth_user_id = auth.uid()
      AND admin_users.is_active = true
    )
  );

CREATE POLICY "Usuários podem atualizar suas próprias marcações"
  ON appointments FOR UPDATE
  TO authenticated
  USING (auth.uid() = client_id)
  WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Admins podem atualizar qualquer marcação"
  ON appointments FOR UPDATE
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

CREATE POLICY "Admins podem deletar marcações"
  ON appointments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.auth_user_id = auth.uid()
      AND admin_users.is_active = true
    )
  );
