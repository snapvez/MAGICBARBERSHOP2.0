/*
  # Sistema de Comissões Baseado em Pontos

  ## Descrição
  Sistema onde cada minuto de serviço = 1 ponto para o barbeiro.
  As comissões são calculadas proporcionalmente ao total de pontos de todos os barbeiros,
  distribuindo o fundo total das assinaturas.

  ## Tabelas
  1. `barber_points` - Regista pontos ganhos por cada serviço completado
    - `id` (uuid, primary key)
    - `barber_id` (uuid, references barbers)
    - `appointment_id` (uuid, references appointments)
    - `service_duration_minutes` (integer) - Duração do serviço em minutos
    - `points_earned` (integer) - Pontos ganhos (= minutos)
    - `completed_at` (timestamptz) - Quando o serviço foi completado
    - `month` (text) - Mês no formato YYYY-MM para facilitar consultas
    - `subscription_id` (uuid, nullable) - Se foi serviço de assinatura
    - `created_at` (timestamptz)

  2. `subscription_revenue_pool` - Fundo mensal das assinaturas
    - `id` (uuid, primary key)
    - `month` (text) - Mês no formato YYYY-MM
    - `total_revenue` (decimal) - Total arrecadado em assinaturas
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  ## Funções
  - Função para atribuir pontos automaticamente quando marcação é completada
  - View para calcular comissões por barbeiro por mês

  ## Segurança
  - RLS ativado em todas as tabelas
  - Apenas admins podem ver/modificar
*/

-- Criar tabela de pontos dos barbeiros
CREATE TABLE IF NOT EXISTS barber_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barber_id uuid REFERENCES barbers(id) ON DELETE CASCADE NOT NULL,
  appointment_id uuid REFERENCES appointments(id) ON DELETE CASCADE NOT NULL,
  service_duration_minutes integer NOT NULL DEFAULT 0,
  points_earned integer NOT NULL DEFAULT 0,
  completed_at timestamptz NOT NULL DEFAULT now(),
  month text NOT NULL,
  subscription_id uuid REFERENCES client_subscriptions(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_points CHECK (points_earned = service_duration_minutes),
  CONSTRAINT valid_month_format CHECK (month ~ '^\d{4}-\d{2}$')
);

-- Criar tabela do fundo de receitas das assinaturas
CREATE TABLE IF NOT EXISTS subscription_revenue_pool (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month text UNIQUE NOT NULL,
  total_revenue decimal(10,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_month_format CHECK (month ~ '^\d{4}-\d{2}$')
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_barber_points_barber_month
  ON barber_points(barber_id, month);

CREATE INDEX IF NOT EXISTS idx_barber_points_month
  ON barber_points(month);

CREATE INDEX IF NOT EXISTS idx_barber_points_appointment
  ON barber_points(appointment_id);

CREATE INDEX IF NOT EXISTS idx_subscription_revenue_pool_month
  ON subscription_revenue_pool(month);

-- Ativar RLS
ALTER TABLE barber_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_revenue_pool ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para barber_points
CREATE POLICY "Admins can view barber points"
  ON barber_points
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can insert barber points"
  ON barber_points
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.auth_user_id = auth.uid()
    )
  );

-- Políticas RLS para subscription_revenue_pool
CREATE POLICY "Admins can view revenue pool"
  ON subscription_revenue_pool
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage revenue pool"
  ON subscription_revenue_pool
  FOR ALL
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

-- Função para atribuir pontos automaticamente quando marcação é completada
CREATE OR REPLACE FUNCTION award_barber_points()
RETURNS TRIGGER AS $$
DECLARE
  service_minutes integer;
  appointment_month text;
BEGIN
  -- Apenas processar quando status muda para 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN

    -- Obter duração do serviço
    SELECT duration_minutes INTO service_minutes
    FROM services
    WHERE id = NEW.service_id;

    -- Se não encontrar duração, usar 30 minutos por defeito
    IF service_minutes IS NULL THEN
      service_minutes := 30;
    END IF;

    -- Calcular o mês (formato YYYY-MM)
    appointment_month := to_char(NEW.appointment_date, 'YYYY-MM');

    -- Inserir pontos para o barbeiro
    INSERT INTO barber_points (
      barber_id,
      appointment_id,
      service_duration_minutes,
      points_earned,
      completed_at,
      month,
      subscription_id
    ) VALUES (
      NEW.barber_id,
      NEW.id,
      service_minutes,
      service_minutes, -- 1 minuto = 1 ponto
      NEW.updated_at,
      appointment_month,
      CASE WHEN NEW.is_subscription_booking THEN
        (SELECT id FROM client_subscriptions WHERE client_id = NEW.client_id AND status = 'active' LIMIT 1)
      ELSE NULL END
    )
    ON CONFLICT (appointment_id) DO NOTHING;

    -- Se for marcação de assinatura, atualizar o fundo de receitas
    IF NEW.is_subscription_booking THEN
      DECLARE
        subscription_price decimal(10,2);
      BEGIN
        -- Obter preço da assinatura do cliente
        SELECT sp.price INTO subscription_price
        FROM client_subscriptions s
        JOIN subscription_plans sp ON s.plan_id = sp.id
        WHERE s.client_id = NEW.client_id
          AND s.status = 'active'
        LIMIT 1;

        IF subscription_price IS NOT NULL THEN
          -- Adicionar ao fundo mensal (ou criar se não existir)
          INSERT INTO subscription_revenue_pool (month, total_revenue)
          VALUES (appointment_month, subscription_price)
          ON CONFLICT (month)
          DO UPDATE SET
            total_revenue = subscription_revenue_pool.total_revenue + subscription_price,
            updated_at = now();
        END IF;
      END;
    END IF;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para atribuir pontos automaticamente
DROP TRIGGER IF EXISTS trigger_award_barber_points ON appointments;
CREATE TRIGGER trigger_award_barber_points
  AFTER INSERT OR UPDATE OF status ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION award_barber_points();

-- View para calcular comissões por barbeiro por mês
CREATE OR REPLACE VIEW barber_commissions_by_month AS
SELECT
  bp.month,
  bp.barber_id,
  b.name as barber_name,
  SUM(bp.points_earned) as total_points,
  COUNT(bp.id) as total_services,
  SUM(bp.service_duration_minutes) as total_minutes,
  -- Calcular percentagem de pontos do barbeiro em relação ao total do mês
  ROUND(
    (SUM(bp.points_earned)::decimal / NULLIF(month_totals.total_month_points, 0) * 100),
    2
  ) as points_percentage,
  -- Calcular comissão baseada na percentagem
  ROUND(
    (SUM(bp.points_earned)::decimal / NULLIF(month_totals.total_month_points, 0)) *
    COALESCE(srp.total_revenue, 0),
    2
  ) as commission_amount,
  COALESCE(srp.total_revenue, 0) as monthly_revenue_pool
FROM barber_points bp
JOIN barbers b ON bp.barber_id = b.id
LEFT JOIN subscription_revenue_pool srp ON srp.month = bp.month
CROSS JOIN LATERAL (
  SELECT SUM(points_earned) as total_month_points
  FROM barber_points
  WHERE month = bp.month
) month_totals
GROUP BY bp.month, bp.barber_id, b.name, month_totals.total_month_points, srp.total_revenue
ORDER BY bp.month DESC, total_points DESC;

-- Garantir que a constraint de appointment_id único existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'barber_points_appointment_id_key'
  ) THEN
    ALTER TABLE barber_points ADD CONSTRAINT barber_points_appointment_id_key UNIQUE (appointment_id);
  END IF;
END $$;

COMMENT ON TABLE barber_points IS 'Pontos ganhos pelos barbeiros. 1 minuto de serviço = 1 ponto';
COMMENT ON TABLE subscription_revenue_pool IS 'Fundo mensal total das assinaturas para distribuir entre barbeiros';
COMMENT ON VIEW barber_commissions_by_month IS 'Calcula comissões proporcionais baseadas nos pontos de cada barbeiro';
