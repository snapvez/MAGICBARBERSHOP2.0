/*
  # Remover Serviços Femininos e Não Masculinos
  
  ## Alterações
  - Desativa os serviços: Corte Feminino, Hidratação, Penteado
  - Mantém apenas serviços masculinos: Corte Masculino, Barba, Coloração, Sobrancelha e combos
*/

UPDATE services 
SET is_active = false 
WHERE name IN ('Corte Feminino', 'Hidratação', 'Penteado');
