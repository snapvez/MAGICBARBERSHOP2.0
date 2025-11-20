/*
  # Adicionar Link de Pagamento Stripe aos Planos

  ## Modificações

  1. Tabela `subscription_plans`
    - Adiciona `stripe_payment_link` (text, nullable) - Link direto de pagamento do Stripe

  ## Notas Importantes
    - Permite usar links de pagamento pré-configurados do Stripe
    - Facilita gestão de preços e produtos no Stripe Dashboard
*/

-- Adicionar stripe_payment_link à tabela subscription_plans
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscription_plans' AND column_name = 'stripe_payment_link'
  ) THEN
    ALTER TABLE subscription_plans ADD COLUMN stripe_payment_link text;
  END IF;
END $$;

-- Atualizar o plano existente com o link de pagamento
UPDATE subscription_plans
SET stripe_payment_link = 'https://buy.stripe.com/7sY7sL5ctfwb0zsblSdfG04'
WHERE name = 'Plano de Corte';
