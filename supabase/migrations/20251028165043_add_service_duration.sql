/*
  # Add Service Duration Field

  1. Changes
    - Add `duration_minutes` column to `services` table to track service duration
    - Update existing services with their specific durations:
      - Corte Masculino: 30 minutes
      - Corte e Barba: 45 minutes
      - Barba: 10 minutes
      - Sobrancelha: 5 minutes

  2. Notes
    - Duration is stored in minutes for easy calculation
    - Default duration is 30 minutes for any new services
*/

-- Add duration column to services table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'services' AND column_name = 'duration_minutes'
  ) THEN
    ALTER TABLE services ADD COLUMN duration_minutes integer DEFAULT 30 NOT NULL;
  END IF;
END $$;

-- Update existing services with their specific durations
UPDATE services SET duration_minutes = 30 WHERE name = 'Corte Masculino';
UPDATE services SET duration_minutes = 45 WHERE name = 'Corte e Barba';
UPDATE services SET duration_minutes = 10 WHERE name = 'Barba';
UPDATE services SET duration_minutes = 5 WHERE name = 'Sobrancelha';