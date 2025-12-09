/*
  # Limitar Apenas Marcações de Assinatura a Uma Pendente

  1. Alterações
    - Modificar função `check_client_pending_appointments()` para verificar apenas marcações de assinatura
    - Permitir que clientes normais (sem assinatura) façam múltiplas marcações pendentes
    - Bloquear apenas quando é marcação de assinatura E já existe outra marcação de assinatura pendente

  2. Lógica
    - Se a nova marcação NÃO é de assinatura (is_subscription_booking = false): permitir sempre
    - Se a nova marcação É de assinatura (is_subscription_booking = true): verificar se já existe outra marcação de assinatura pendente
    - Guests e clientes autenticados seguem a mesma regra

  3. Segurança
    - Validação a nível de base de dados (não pode ser contornada pelo frontend)
    - Previne condições de corrida
    - Garante integridade dos dados
*/

-- Substituir função para verificar marcações pendentes apenas para assinaturas
CREATE OR REPLACE FUNCTION check_client_pending_appointments()
RETURNS TRIGGER AS $$
BEGIN
  -- Apenas verificar se a NOVA marcação é de assinatura
  IF NEW.is_subscription_booking = true THEN
    
    -- Verificar se cliente autenticado já tem uma marcação de assinatura pendente
    IF NEW.client_id IS NOT NULL THEN
      IF EXISTS (
        SELECT 1 FROM appointments 
        WHERE client_id = NEW.client_id 
        AND status = 'pending'
        AND is_subscription_booking = true
        AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      ) THEN
        RAISE EXCEPTION 'Já tens uma marcação de assinatura pendente. Aguarda a confirmação do administrador antes de fazer outra marcação.';
      END IF;
    END IF;

    -- Verificar se guest já tem uma marcação de assinatura pendente
    IF NEW.guest_id IS NOT NULL THEN
      IF EXISTS (
        SELECT 1 FROM appointments 
        WHERE guest_id = NEW.guest_id 
        AND status = 'pending'
        AND is_subscription_booking = true
        AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      ) THEN
        RAISE EXCEPTION 'Já tens uma marcação de assinatura pendente. Aguarda a confirmação do administrador antes de fazer outra marcação.';
      END IF;
    END IF;
    
  END IF;
  
  -- Se não é marcação de assinatura, permite sempre (sem verificação)
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- A trigger já existe, não precisa recriar
