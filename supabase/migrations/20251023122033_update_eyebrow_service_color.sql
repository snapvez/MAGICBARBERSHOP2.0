/*
  # Atualizar Cor do Serviço de Sobrancelha
  
  ## Alterações
  - Muda a cor do serviço de Sobrancelha de rosa (#EC4899) para cinza escuro (#6B7280)
  - Cor mais masculina e profissional
*/

UPDATE services 
SET color = '#6B7280' 
WHERE name ILIKE '%sobrancelha%' OR name ILIKE '%eyebrow%';
