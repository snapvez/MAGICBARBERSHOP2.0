/*
  # Adicionar limite de capacidade total para assinaturas

  ## Alterações
  - Adiciona uma tabela de configuração para controlar o limite total de assinaturas (máximo 90 vagas)
  - Adiciona uma função para validar o limite de capacidade antes de criar/ativar assinaturas
  - Adiciona um trigger para impedir que sejam criadas mais de 90 assinaturas ativas no total

  ## Segurança
  - A tabela de configuração tem RLS ativado
  - Apenas admins podem modificar os limites
  - Todos podem visualizar a capacidade disponível
*/

-- Criar tabela de configuração de capacidade
CREATE TABLE IF NOT EXISTS subscription_capacity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  max_total_subscriptions int NOT NULL DEFAULT 90,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Inserir configuração inicial se não existir
INSERT INTO subscription_capacity (max_total_subscriptions)
SELECT 90
WHERE NOT EXISTS (SELECT 1 FROM subscription_capacity);

-- Ativar RLS
ALTER TABLE subscription_capacity ENABLE ROW LEVEL SECURITY;

-- Políticas para subscription_capacity
CREATE POLICY "Everyone can view capacity settings"
  ON subscription_capacity
  FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Only admins can update capacity settings"
  ON subscription_capacity
  FOR UPDATE
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

-- Função para verificar capacidade disponível
CREATE OR REPLACE FUNCTION check_subscription_capacity()
RETURNS TRIGGER AS $$
DECLARE
  current_count int;
  max_capacity int;
BEGIN
  -- Obter o número atual de assinaturas ativas
  SELECT COUNT(*) INTO current_count
  FROM client_subscriptions
  WHERE status = 'active' AND current_period_end > now();

  -- Obter a capacidade máxima
  SELECT max_total_subscriptions INTO max_capacity
  FROM subscription_capacity
  LIMIT 1;

  -- Se estiver a criar uma nova assinatura ou ativar uma existente
  IF (TG_OP = 'INSERT' AND NEW.status = 'active') OR 
     (TG_OP = 'UPDATE' AND OLD.status != 'active' AND NEW.status = 'active') THEN
    
    IF current_count >= max_capacity THEN
      RAISE EXCEPTION 'Capacidade máxima de assinaturas atingida (% de % vagas). Não há vagas disponíveis.', current_count, max_capacity;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para validar capacidade
DROP TRIGGER IF EXISTS enforce_subscription_capacity ON client_subscriptions;
CREATE TRIGGER enforce_subscription_capacity
  BEFORE INSERT OR UPDATE ON client_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION check_subscription_capacity();
