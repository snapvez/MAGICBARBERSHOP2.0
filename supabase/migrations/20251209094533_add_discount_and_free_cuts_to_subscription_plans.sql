/*
  # Adicionar Desconto e Cortes Gratuitos aos Planos

  1. Alterações na Tabela subscription_plans
    - Adicionar campo `discount_percentage` (numeric) - Desconto em percentagem (0-100) aplicado no checkout
    - Manter campo `cuts_per_month` mas com nova função: representa os cortes gratuitos incluídos no plano
    - O preço do plano é fixo, os cortes gratuitos são um benefício

  2. Funcionalidade
    - O campo `discount_percentage` será aplicado ao preço total no momento do checkout
    - Exemplo: Preço €100 com desconto de 10% = Cliente paga €90
    - O campo `cuts_per_month` agora representa quantos cortes gratuitos o cliente recebe
    - O sistema deve rastrear e subtrair essa quantidade a cada agendamento

  3. Notas Importantes
    - O desconto é opcional (pode ser 0 ou NULL)
    - O desconto é aplicado apenas no checkout, não altera o preço base do plano
    - Os cortes gratuitos são contabilizados no campo existente `cuts_used_this_month` da tabela `client_subscriptions`
*/

-- Adicionar campo de desconto à tabela subscription_plans
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscription_plans' AND column_name = 'discount_percentage'
  ) THEN
    ALTER TABLE subscription_plans 
    ADD COLUMN discount_percentage numeric DEFAULT 0 CHECK (discount_percentage >= 0 AND discount_percentage <= 100);
    
    COMMENT ON COLUMN subscription_plans.discount_percentage IS 'Desconto em percentagem (0-100) aplicado no checkout. Exemplo: 10 = 10% de desconto';
  END IF;
END $$;

-- Adicionar comentário explicativo ao campo cuts_per_month
COMMENT ON COLUMN subscription_plans.cuts_per_month IS 'Quantidade de cortes gratuitos incluídos no plano. O cliente recebe este número de cortes sem custo adicional.';

-- Atualizar os planos existentes com desconto 0 (sem desconto por padrão)
UPDATE subscription_plans 
SET discount_percentage = 0 
WHERE discount_percentage IS NULL;
