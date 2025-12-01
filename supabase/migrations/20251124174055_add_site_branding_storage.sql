/*
  # Sistema de Branding e Upload de Logo

  1. Novo Bucket de Storage
    - Criar bucket público 'site-branding' para logos
    - Políticas para upload apenas por admins
    - Leitura pública para todos

  2. Nova Tabela: site_branding
    - `id` (uuid, primary key)
    - `logo_url` (text) - URL do logo atual
    - `logo_storage_path` (text) - Path no storage
    - `site_name` (text) - Nome do site
    - `updated_at` (timestamptz)
    - `updated_by` (uuid) - Admin que fez a alteração

  3. Security
    - Enable RLS na tabela
    - Apenas admins podem fazer UPDATE
    - Todos podem fazer SELECT
*/

-- Create storage bucket for site branding
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'site-branding',
  'site-branding',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for site-branding bucket
CREATE POLICY "Public can view site branding"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'site-branding');

CREATE POLICY "Admins can upload site branding"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'site-branding' AND
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can update site branding"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'site-branding' AND
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can delete site branding"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'site-branding' AND
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.auth_user_id = auth.uid()
    )
  );

-- Create site_branding table
CREATE TABLE IF NOT EXISTS site_branding (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  logo_url text,
  logo_storage_path text,
  site_name text DEFAULT 'Magic Barbershop',
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_site_branding_updated ON site_branding(updated_at DESC);

-- Enable RLS
ALTER TABLE site_branding ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Everyone can view site branding"
  ON site_branding FOR SELECT
  USING (true);

CREATE POLICY "Admins can update site branding"
  ON site_branding FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can insert site branding"
  ON site_branding FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.auth_user_id = auth.uid()
    )
  );

-- Insert default branding record
INSERT INTO site_branding (site_name, logo_url)
VALUES ('Magic Barbershop', NULL)
ON CONFLICT (id) DO NOTHING;

-- Function to update branding timestamp
CREATE OR REPLACE FUNCTION update_site_branding_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for automatic timestamp
DROP TRIGGER IF EXISTS site_branding_updated_at ON site_branding;
CREATE TRIGGER site_branding_updated_at
  BEFORE UPDATE ON site_branding
  FOR EACH ROW
  EXECUTE FUNCTION update_site_branding_timestamp();