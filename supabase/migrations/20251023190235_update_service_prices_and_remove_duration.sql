/*
  # Atualizar Preços dos Serviços e Remover Duração

  ## Alterações
  
  ### 1. Atualização de Preços
    - Corte Masculino: 25€ → 17€
    - Barba: 15€ → 10€
    - Sobrancelha: 10€ → 5€
    - Corte + Barba: 35€ → 25€
    - Corte + Barba + Sobrancelha: 45€ → 20€ (renomeado para Corte + Sobrancelha)
  
  ### 2. Remover Campo duration_minutes
    - A duração dos serviços não é mais necessária no sistema
    - Remove a coluna duration_minutes da tabela services
  
  ## Notas
  - Os preços refletem a nova estrutura de preços do salão
  - Serviços combinados têm desconto sobre serviços individuais
*/

-- Atualizar preços dos serviços existentes
UPDATE services SET price = 17.00, points_reward = 17 WHERE name = 'Corte Masculino';
UPDATE services SET price = 10.00, points_reward = 10 WHERE name = 'Barba';
UPDATE services SET price = 5.00, points_reward = 5 WHERE name = 'Sobrancelha';
UPDATE services SET price = 25.00, points_reward = 25 WHERE name = 'Corte + Barba';

-- Renomear e atualizar o serviço combinado "Corte + Barba + Sobrancelha" para "Corte + Sobrancelha"
UPDATE services 
SET 
  name = 'Corte + Sobrancelha',
  description = 'Corte de cabelo completo com design de sobrancelhas',
  price = 20.00,
  points_reward = 20
WHERE name = 'Corte + Barba + Sobrancelha';

-- Remover a coluna duration_minutes (não é mais necessária)
ALTER TABLE services DROP COLUMN IF EXISTS duration_minutes;
