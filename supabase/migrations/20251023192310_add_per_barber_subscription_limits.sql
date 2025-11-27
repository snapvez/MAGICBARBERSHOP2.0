/*
  # Sistema de Limites de Assinaturas por Barbeiro

  ## Alterações

  1. Modificações na Tabela `barbers`
    - Adiciona `max_subscriptions` (integer) - número máximo de assinaturas que o barbeiro pode ter
    - Default: 45 assinaturas por barbeiro

  2. Nova Função
    - `get_barber_active_subscriptions_count(barber_id)` - retorna o número de assinaturas ativas de um barbeiro

  3. Nova Constraint
    - Adiciona check constraint para garantir que barbeiro não excede limite de assinaturas

  ## Notas Importantes
    - Cada barbeiro pode ter no máximo 45 assinaturas ativas
    - Sistema verifica automaticamente antes de permitir nova assinatura
    - Se barbeiro atingir limite, cliente deve escolher outro barbeiro
*/

-- Adicionar coluna max_subscriptions aos barbeiros
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'barbers' AND column_name = 'max_subscriptions'
  ) THEN
    ALTER TABLE barbers ADD COLUMN max_subscriptions integer DEFAULT 45 NOT NULL;
  END IF;
END $$;

-- Criar função para contar assinaturas ativas de um barbeiro
CREATE OR REPLACE FUNCTION get_barber_active_subscriptions_count(barber_uuid uuid)
RETURNS integer AS $$
  SELECT COUNT(*)::integer
  FROM client_subscriptions
  WHERE barber_id = barber_uuid
    AND status = 'active'
    AND current_period_end > now();
$$ LANGUAGE sql STABLE;

-- Criar função para verificar se barbeiro pode aceitar mais assinaturas
CREATE OR REPLACE FUNCTION check_barber_subscription_capacity()
RETURNS trigger AS $$
DECLARE
  barber_current_count integer;
  barber_max integer;
BEGIN
  -- Se não tem barbeiro associado, permite (para compatibilidade)
  IF NEW.barber_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Se está cancelando ou expirando, permite
  IF NEW.status != 'active' THEN
    RETURN NEW;
  END IF;

  -- Buscar limite máximo do barbeiro
  SELECT max_subscriptions INTO barber_max
  FROM barbers
  WHERE id = NEW.barber_id;

  -- Contar assinaturas ativas atuais (excluindo a que está sendo inserida/atualizada)
  SELECT COUNT(*) INTO barber_current_count
  FROM client_subscriptions
  WHERE barber_id = NEW.barber_id
    AND status = 'active'
    AND current_period_end > now()
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

  -- Verificar se excede o limite
  IF barber_current_count >= barber_max THEN
    RAISE EXCEPTION 'O barbeiro já atingiu o limite máximo de % assinaturas ativas. Por favor, escolhe outro barbeiro.', barber_max;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para verificar capacidade antes de inserir/atualizar
DROP TRIGGER IF EXISTS check_barber_capacity_trigger ON client_subscriptions;
CREATE TRIGGER check_barber_capacity_trigger
  BEFORE INSERT OR UPDATE ON client_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION check_barber_subscription_capacity();

-- Atualizar todos os barbeiros existentes com o limite padrão de 45
UPDATE barbers
SET max_subscriptions = 45
WHERE max_subscriptions IS NULL OR max_subscriptions = 0;
