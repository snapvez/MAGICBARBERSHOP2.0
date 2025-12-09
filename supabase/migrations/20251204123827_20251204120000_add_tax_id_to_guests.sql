/*
  # Add Tax ID (NIF) to Guests Table

  1. Changes
    - Add `tax_id` (NIF) column to `guests` table
    - Add validation constraint for 9-digit Portuguese NIF format
    - Add index for performance
    - Update comments for documentation

  2. Validation
    - NIF must be exactly 9 digits
    - Optional field (NULL allowed)

  3. Notes
    - This mirrors the tax_id field added to profiles table
    - Enables tax ID collection for guest users during registration
*/

-- Add tax_id (NIF) to guests table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'guests' AND column_name = 'tax_id'
  ) THEN
    ALTER TABLE guests ADD COLUMN tax_id text;
  END IF;
END $$;

-- Add validation constraint for Portuguese NIF (9 digits)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'guests' AND constraint_name = 'guests_tax_id_check'
  ) THEN
    ALTER TABLE guests ADD CONSTRAINT guests_tax_id_check
      CHECK (tax_id IS NULL OR tax_id ~ '^[0-9]{9}$');
  END IF;
END $$;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_guests_tax_id ON guests(tax_id) WHERE tax_id IS NOT NULL;

-- Add documentation comment
COMMENT ON COLUMN guests.tax_id IS 'Portuguese Tax ID (NIF) - 9 digits, optional';