/*
  # Adicionar campo de email opcional aos guests

  ## Alterações
  Adiciona coluna de email opcional à tabela guests para permitir que clientes forneçam o seu email durante o registo.

  ## Modificações
  - Adiciona coluna `email` (text, opcional) à tabela guests
  - Email não é obrigatório para permitir registo apenas com telemóvel
*/

-- Adicionar coluna de email opcional à tabela guests
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'guests' AND column_name = 'email'
  ) THEN
    ALTER TABLE guests ADD COLUMN email text;
  END IF;
END $$;

-- Criar índice para melhorar performance de buscas por email
CREATE INDEX IF NOT EXISTS idx_guests_email ON guests(email) WHERE email IS NOT NULL;
