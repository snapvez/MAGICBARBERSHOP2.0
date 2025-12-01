/*
  # Sistema de Pagamentos de Assinaturas

  ## Novas Tabelas

  1. `subscription_payments`
    - `id` (uuid, primary key) - Identificador único do pagamento
    - `subscription_id` (uuid, foreign key) - Referência à assinatura
    - `amount` (numeric) - Valor pago
    - `payment_date` (timestamptz) - Data do pagamento
    - `payment_method` (text) - Método de pagamento (cash, card, mbway, transfer)
    - `status` (text) - Estado do pagamento (paid, pending, failed)
    - `notes` (text, nullable) - Notas adicionais
    - `created_at` (timestamptz) - Data de criação do registo
    - `created_by` (uuid, nullable) - Quem registou o pagamento

  ## Modificações

  1. Adiciona coluna `payment_status` às assinaturas
    - Para rastrear se o pagamento do período atual foi feito

  ## Segurança
    - Enable RLS em `subscription_payments`
    - Apenas admins podem inserir/ver pagamentos
    - Clientes podem ver seus próprios pagamentos

  ## Notas Importantes
    - Todo pagamento de assinatura é registado
    - Sistema permite múltiplos métodos de pagamento
    - Histórico completo de pagamentos mantido
*/

-- Criar tabela de pagamentos de assinaturas
CREATE TABLE IF NOT EXISTS subscription_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL REFERENCES client_subscriptions(id) ON DELETE CASCADE,
  amount numeric(10, 2) NOT NULL,
  payment_date timestamptz DEFAULT now() NOT NULL,
  payment_method text NOT NULL CHECK (payment_method IN ('cash', 'card', 'mbway', 'transfer')),
  status text DEFAULT 'paid' NOT NULL CHECK (status IN ('paid', 'pending', 'failed')),
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL,
  created_by uuid REFERENCES auth.users(id)
);

-- Adicionar índices para performance
CREATE INDEX IF NOT EXISTS idx_subscription_payments_subscription_id 
  ON subscription_payments(subscription_id);

CREATE INDEX IF NOT EXISTS idx_subscription_payments_payment_date 
  ON subscription_payments(payment_date);

CREATE INDEX IF NOT EXISTS idx_subscription_payments_status 
  ON subscription_payments(status);

-- Adicionar coluna de status de pagamento às assinaturas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'client_subscriptions' AND column_name = 'payment_status'
  ) THEN
    ALTER TABLE client_subscriptions 
    ADD COLUMN payment_status text DEFAULT 'paid' 
    CHECK (payment_status IN ('paid', 'pending', 'overdue'));
  END IF;
END $$;

-- Enable RLS
ALTER TABLE subscription_payments ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança para subscription_payments

-- Admins podem ver todos os pagamentos
CREATE POLICY "Admins can view all payments"
  ON subscription_payments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.auth_user_id = auth.uid()
      AND admin_users.is_active = true
    )
  );

-- Admins podem inserir pagamentos
CREATE POLICY "Admins can insert payments"
  ON subscription_payments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.auth_user_id = auth.uid()
      AND admin_users.is_active = true
    )
  );

-- Admins podem atualizar pagamentos
CREATE POLICY "Admins can update payments"
  ON subscription_payments FOR UPDATE
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

-- Clientes podem ver seus próprios pagamentos
CREATE POLICY "Clients can view own payments"
  ON subscription_payments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM client_subscriptions
      WHERE client_subscriptions.id = subscription_payments.subscription_id
      AND client_subscriptions.client_id = auth.uid()
    )
  );

-- Criar função para registrar pagamento automaticamente na criação de assinatura
CREATE OR REPLACE FUNCTION record_subscription_payment()
RETURNS trigger AS $$
BEGIN
  IF NEW.status = 'active' AND OLD.id IS NULL THEN
    INSERT INTO subscription_payments (
      subscription_id,
      amount,
      payment_date,
      payment_method,
      status,
      notes
    )
    SELECT
      NEW.id,
      sp.price,
      NEW.created_at,
      'cash',
      'paid',
      'Pagamento inicial da assinatura'
    FROM subscription_plans sp
    WHERE sp.id = NEW.plan_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para registrar pagamento na criação de assinatura
DROP TRIGGER IF EXISTS record_payment_on_subscription_trigger ON client_subscriptions;
CREATE TRIGGER record_payment_on_subscription_trigger
  AFTER INSERT ON client_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION record_subscription_payment();

-- Atualizar status de pagamento das assinaturas existentes
UPDATE client_subscriptions
SET payment_status = 'paid'
WHERE status = 'active' AND payment_status IS NULL;
