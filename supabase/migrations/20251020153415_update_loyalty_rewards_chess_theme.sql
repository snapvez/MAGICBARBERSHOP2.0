/*
  # Update Loyalty Rewards to Chess-Themed Ranking

  ## Changes
  Updates the loyalty_rewards table with chess-themed tier names and adjusted point requirements:
  
  1. Pawn - Entry level (100 points, 10% discount)
  2. Knight - Intermediate level (250 points, 15% discount)
  3. Bishop - Advanced level (500 points, 20% discount)
  4. Rook - Expert level (750 points, 25% discount)
  5. Queen - Master level (1000 points, 30% discount)
  6. King - Ultimate level (1500 points, 35% discount)

  ## Notes
  - Removes old reward tiers (Bronze, Prata, Ouro, Platina)
  - Adds new chess-themed tiers with progressive rewards
  - King tier added as ultimate achievement with 35% discount
*/

-- Clear existing rewards
DELETE FROM loyalty_rewards;

-- Insert new chess-themed loyalty rewards
INSERT INTO loyalty_rewards (name, description, points_required, discount_percentage) VALUES
  ('Pawn', 'Nível inicial - Começa a tua jornada', 100, 10.00),
  ('Knight', 'Nível intermédio - Avança com estilo', 250, 15.00),
  ('Bishop', 'Nível avançado - Compromisso reconhecido', 500, 20.00),
  ('Rook', 'Nível expert - Cliente veterano', 750, 25.00),
  ('Queen', 'Nível master - Elite do salão', 1000, 30.00),
  ('King', 'Nível supremo - Realeza absoluta', 1500, 35.00);
