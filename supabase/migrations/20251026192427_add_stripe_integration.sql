/*
  # Integração com Stripe para Assinaturas

  ## Modificações

  1. Tabela `profiles`
    - Adiciona `stripe_customer_id` (text, nullable) - ID do cliente no Stripe

  2. Tabela `client_subscriptions`
    - Adiciona `stripe_subscription_id` (text, nullable) - ID da assinatura no Stripe
    - Adiciona `stripe_payment_intent_id` (text, nullable) - ID do pagamento no Stripe

  ## Notas Importantes
    - Permite rastrear clientes e assinaturas no Stripe
    - Facilita sincronização entre sistema local e Stripe
    - Suporta renovações automáticas via webhook
*/

-- Adicionar stripe_customer_id à tabela profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'stripe_customer_id'
  ) THEN
    ALTER TABLE profiles ADD COLUMN stripe_customer_id text UNIQUE;
  END IF;
END $$;

-- Adicionar campos Stripe à tabela client_subscriptions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'client_subscriptions' AND column_name = 'stripe_subscription_id'
  ) THEN
    ALTER TABLE client_subscriptions ADD COLUMN stripe_subscription_id text UNIQUE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'client_subscriptions' AND column_name = 'stripe_payment_intent_id'
  ) THEN
    ALTER TABLE client_subscriptions ADD COLUMN stripe_payment_intent_id text;
  END IF;
END $$;

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id ON profiles(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id ON client_subscriptions(stripe_subscription_id);
