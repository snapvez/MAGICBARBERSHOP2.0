/*
  # Sistema de Cores de Serviço e Controlo de Pagamentos

  ## Alterações

  ### 1. Tabela Services
    - Adiciona `color` (text) - Cor hexadecimal para o calendário
    - Exemplos: Corte → #3B82F6 (azul), Barba → #10B981 (verde)

  ### 2. Tabela Appointments
    - Adiciona `payment_status` (text) - Status do pagamento: paid, pending, overdue
    - Adiciona `is_subscription_valid` (boolean) - Se a mensalidade está válida
    - Adiciona `payment_verified_at` (timestamptz) - Quando o pagamento foi verificado
    - Adiciona `payment_verified_by` (uuid) - Admin que verificou o pagamento

  ### 3. Atualizar Client Subscriptions
    - Adiciona `last_payment_date` (timestamptz) - Data do último pagamento
    - Adiciona `next_payment_due` (timestamptz) - Próxima data de pagamento

  ## Lógica de Cores no Calendário
  - Verde: Assinatura válida + paga
  - Vermelho: Assinatura vencida ou não paga
  - Azul/Verde/Laranja: Cor base do tipo de serviço (quando tudo está ok)

  ## Segurança
  - Apenas admins podem verificar pagamentos
  - Clientes podem ver o status dos seus próprios pagamentos
*/

-- Adicionar coluna de cor aos serviços
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'services' AND column_name = 'color'
  ) THEN
    ALTER TABLE services ADD COLUMN color text DEFAULT '#3B82F6';
  END IF;
END $$;

-- Atualizar cores dos serviços existentes
UPDATE services SET color = '#3B82F6' WHERE name ILIKE '%corte%' AND color = '#3B82F6';
UPDATE services SET color = '#10B981' WHERE name ILIKE '%barba%';
UPDATE services SET color = '#F59E0B' WHERE name ILIKE '%coloração%' OR name ILIKE '%hidratação%';
UPDATE services SET color = '#8B5CF6' WHERE name ILIKE '%penteado%';

-- Adicionar colunas de controlo de pagamento aos agendamentos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'appointments' AND column_name = 'payment_status'
  ) THEN
    ALTER TABLE appointments ADD COLUMN payment_status text DEFAULT 'pending' 
      CHECK (payment_status IN ('paid', 'pending', 'overdue'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'appointments' AND column_name = 'is_subscription_valid'
  ) THEN
    ALTER TABLE appointments ADD COLUMN is_subscription_valid boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'appointments' AND column_name = 'payment_verified_at'
  ) THEN
    ALTER TABLE appointments ADD COLUMN payment_verified_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'appointments' AND column_name = 'payment_verified_by'
  ) THEN
    ALTER TABLE appointments ADD COLUMN payment_verified_by uuid REFERENCES admin_users(id);
  END IF;
END $$;

-- Adicionar controlo de pagamento às assinaturas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'client_subscriptions' AND column_name = 'last_payment_date'
  ) THEN
    ALTER TABLE client_subscriptions ADD COLUMN last_payment_date timestamptz DEFAULT now();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'client_subscriptions' AND column_name = 'next_payment_due'
  ) THEN
    ALTER TABLE client_subscriptions ADD COLUMN next_payment_due timestamptz 
      DEFAULT (now() + interval '1 month');
  END IF;
END $$;

-- Função para verificar se a assinatura está válida
CREATE OR REPLACE FUNCTION is_subscription_valid(client_uuid uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM client_subscriptions
    WHERE client_id = client_uuid
    AND status = 'active'
    AND current_period_end > now()
    AND next_payment_due > now()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Função para verificar pagamento automaticamente ao criar agendamento
CREATE OR REPLACE FUNCTION check_subscription_on_appointment()
RETURNS TRIGGER AS $$
DECLARE
  has_valid_subscription boolean;
BEGIN
  -- Verifica se o cliente tem assinatura válida
  has_valid_subscription := is_subscription_valid(NEW.client_id);
  
  NEW.is_subscription_valid := has_valid_subscription;
  
  -- Se tem assinatura válida, marca como pago
  IF has_valid_subscription THEN
    NEW.payment_status := 'paid';
  ELSE
    NEW.payment_status := 'pending';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para verificar assinatura ao criar agendamento
DROP TRIGGER IF EXISTS check_subscription_before_appointment ON appointments;
CREATE TRIGGER check_subscription_before_appointment
  BEFORE INSERT ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION check_subscription_on_appointment();

-- Políticas para admins verificarem pagamentos
CREATE POLICY "Admins can verify payments"
  ON appointments
  FOR UPDATE
  TO authenticated
  USING (check_is_admin())
  WITH CHECK (check_is_admin());

-- Adicionar serviços combinados com cores específicas
INSERT INTO services (name, description, duration_minutes, price, points_reward, color, is_active)
VALUES
  ('Corte + Barba', 'Corte de cabelo completo com design de barba', 50, 35.00, 35, '#F97316', true),
  ('Corte + Barba + Sobrancelha', 'Pacote completo de cuidados masculinos', 60, 45.00, 45, '#F97316', true),
  ('Sobrancelha', 'Design e manutenção de sobrancelhas', 15, 10.00, 10, '#EC4899', true)
ON CONFLICT DO NOTHING;

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_appointments_payment_status ON appointments(payment_status);
CREATE INDEX IF NOT EXISTS idx_appointments_subscription_valid ON appointments(is_subscription_valid);
CREATE INDEX IF NOT EXISTS idx_client_subscriptions_payment_due ON client_subscriptions(next_payment_due);
