/*
  # Sistema de Regras de Agendamento Diferenciadas

  1. Nova Configuração
    - Adicionar `non_subscriber_booking_window_days` para definir janela de dias
    - Valor padrão: 7 dias (configurável)

  2. Nova Função Helper
    - `is_client_subscriber()` - Verifica se cliente tem assinatura ativa
    - Retorna boolean indicando status de assinatura

  3. Atualizar Validação de Agendamentos Ativos
    - Substituir `check_client_active_appointments()` 
    - Aplicar restrição de 1 agendamento ativo APENAS para assinantes
    - Não assinantes podem ter múltiplos agendamentos

  4. Nova Validação de Janela de Dias
    - `check_non_subscriber_booking_window()` - Valida data do agendamento
    - Aplicar APENAS para não assinantes
    - Verifica se data está dentro da janela configurada

  5. Lógica de Regras
    - **Assinantes**: Máximo 1 agendamento ativo, sem limite de data futura
    - **Não Assinantes**: Múltiplos agendamentos permitidos, limitados por janela de dias

  6. Segurança
    - Validação em nível de base de dados
    - Previne condições de corrida
    - Garante integridade dos dados
*/

-- Adicionar configuração de janela de dias para não assinantes
INSERT INTO system_settings (setting_key, setting_value, description) VALUES
  ('non_subscriber_booking_window_days', '7', 'Número de dias de antecedência que não-assinantes podem agendar (sugestões: 7, 10, 14, 21, 30)')
ON CONFLICT (setting_key) DO UPDATE
  SET setting_value = EXCLUDED.setting_value,
      description = EXCLUDED.description,
      updated_at = now();

-- Função helper para verificar se cliente é assinante
CREATE OR REPLACE FUNCTION is_client_subscriber(p_client_id uuid, p_guest_id uuid)
RETURNS boolean AS $$
DECLARE
  has_subscription boolean;
BEGIN
  -- Guests nunca são assinantes
  IF p_guest_id IS NOT NULL THEN
    RETURN false;
  END IF;

  -- Verificar se cliente autenticado tem assinatura ativa
  IF p_client_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 
      FROM client_subscriptions
      WHERE client_id = p_client_id
      AND status = 'active'
      AND current_period_end > now()
    ) INTO has_subscription;
    
    RETURN COALESCE(has_subscription, false);
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger e função anterior
DROP TRIGGER IF EXISTS check_active_appointments_trigger ON appointments;
DROP FUNCTION IF EXISTS check_client_active_appointments();

-- Nova função: Verificar agendamentos ativos APENAS para assinantes
CREATE OR REPLACE FUNCTION check_subscriber_active_appointments()
RETURNS TRIGGER AS $$
DECLARE
  is_subscriber boolean;
  active_appointment_id uuid;
BEGIN
  -- Verificar se o cliente é assinante
  is_subscriber := is_client_subscriber(NEW.client_id, NEW.guest_id);

  -- Se NÃO é assinante, permitir múltiplos agendamentos
  IF NOT is_subscriber THEN
    RETURN NEW;
  END IF;

  -- Se É assinante, aplicar restrição de 1 agendamento ativo
  
  -- Check para cliente autenticado assinante
  IF NEW.client_id IS NOT NULL THEN
    SELECT id 
    INTO active_appointment_id
    FROM appointments 
    WHERE client_id = NEW.client_id 
    AND status IN ('pending', 'confirmed')
    AND (
      -- Appointment is in the future
      appointment_date > CURRENT_DATE
      OR (appointment_date = CURRENT_DATE AND end_time > CURRENT_TIME)
    )
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    LIMIT 1;

    IF active_appointment_id IS NOT NULL THEN
      RAISE EXCEPTION 'Já tens uma marcação ativa. Só podes fazer nova marcação depois da anterior terminar.';
    END IF;
  END IF;

  -- Check para guest assinante (improvável, mas cobrir o caso)
  IF NEW.guest_id IS NOT NULL THEN
    SELECT id 
    INTO active_appointment_id
    FROM appointments 
    WHERE guest_id = NEW.guest_id 
    AND status IN ('pending', 'confirmed')
    AND (
      appointment_date > CURRENT_DATE
      OR (appointment_date = CURRENT_DATE AND end_time > CURRENT_TIME)
    )
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    LIMIT 1;

    IF active_appointment_id IS NOT NULL THEN
      RAISE EXCEPTION 'Já tens uma marcação ativa. Só podes fazer nova marcação depois da anterior terminar.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Nova função: Verificar janela de dias APENAS para não assinantes
CREATE OR REPLACE FUNCTION check_non_subscriber_booking_window()
RETURNS TRIGGER AS $$
DECLARE
  is_subscriber boolean;
  booking_window_days integer;
  max_allowed_date date;
BEGIN
  -- Verificar se o cliente é assinante
  is_subscriber := is_client_subscriber(NEW.client_id, NEW.guest_id);

  -- Se É assinante, permitir qualquer data futura (sem limite)
  IF is_subscriber THEN
    RETURN NEW;
  END IF;

  -- Se NÃO é assinante, aplicar limite de janela de dias

  -- Buscar configuração da janela de dias
  SELECT (setting_value::text)::integer 
  INTO booking_window_days
  FROM system_settings
  WHERE setting_key = 'non_subscriber_booking_window_days';

  -- Se não encontrou configuração, usar padrão de 7 dias
  IF booking_window_days IS NULL THEN
    booking_window_days := 7;
  END IF;

  -- Calcular data máxima permitida
  max_allowed_date := CURRENT_DATE + booking_window_days;

  -- Verificar se a data do agendamento está dentro da janela
  IF NEW.appointment_date > max_allowed_date THEN
    RAISE EXCEPTION 'Não assinantes podem agendar até % dias de antecedência. A data selecionada excede este limite. Considera a nossa assinatura premium para agendar sem limites!', booking_window_days;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar trigger para verificar agendamentos ativos de assinantes
CREATE TRIGGER check_subscriber_active_appointments_trigger
  BEFORE INSERT ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION check_subscriber_active_appointments();

-- Criar trigger para verificar janela de dias de não assinantes
CREATE TRIGGER check_non_subscriber_booking_window_trigger
  BEFORE INSERT ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION check_non_subscriber_booking_window();

-- Comentários úteis
COMMENT ON FUNCTION is_client_subscriber(uuid, uuid) IS 'Verifica se um cliente possui assinatura ativa. Retorna false para guests.';
COMMENT ON FUNCTION check_subscriber_active_appointments() IS 'Permite apenas 1 agendamento ativo para assinantes. Não assinantes podem ter múltiplos agendamentos.';
COMMENT ON FUNCTION check_non_subscriber_booking_window() IS 'Limita não assinantes a agendar dentro de uma janela configurável de dias. Assinantes podem agendar sem limite temporal.';
