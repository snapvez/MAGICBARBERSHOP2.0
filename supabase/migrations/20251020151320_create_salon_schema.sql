/*
  # Salon Management System Schema

  ## Overview
  Complete database schema for a professional hair salon booking system with loyalty program

  ## New Tables
  
  ### 1. profiles
    - `id` (uuid, primary key) - Links to auth.users
    - `email` (text, unique) - User email
    - `full_name` (text) - Client full name
    - `phone` (text) - Contact phone number
    - `loyalty_points` (integer) - Accumulated loyalty points
    - `total_visits` (integer) - Total number of visits
    - `created_at` (timestamptz) - Account creation timestamp
    - `updated_at` (timestamptz) - Last update timestamp
  
  ### 2. services
    - `id` (uuid, primary key) - Service identifier
    - `name` (text) - Service name (e.g., "Corte", "Coloração")
    - `description` (text) - Service description
    - `duration_minutes` (integer) - Service duration
    - `price` (decimal) - Service price
    - `points_reward` (integer) - Loyalty points earned
    - `is_active` (boolean) - Service availability status
    - `created_at` (timestamptz) - Creation timestamp
  
  ### 3. appointments
    - `id` (uuid, primary key) - Appointment identifier
    - `client_id` (uuid, foreign key) - Reference to profiles
    - `service_id` (uuid, foreign key) - Reference to services
    - `appointment_date` (date) - Appointment date
    - `start_time` (time) - Appointment start time
    - `end_time` (time) - Appointment end time
    - `status` (text) - Status: pending, confirmed, completed, cancelled
    - `notes` (text) - Additional notes
    - `points_earned` (integer) - Points earned from this appointment
    - `created_at` (timestamptz) - Booking timestamp
    - `updated_at` (timestamptz) - Last update timestamp
  
  ### 4. notifications
    - `id` (uuid, primary key) - Notification identifier
    - `client_id` (uuid, foreign key) - Reference to profiles
    - `appointment_id` (uuid, foreign key) - Reference to appointments
    - `type` (text) - Type: confirmation, reminder, loyalty_milestone
    - `message` (text) - Notification message
    - `sent_at` (timestamptz) - When notification was sent
    - `is_read` (boolean) - Read status
    - `created_at` (timestamptz) - Creation timestamp
  
  ### 5. loyalty_rewards
    - `id` (uuid, primary key) - Reward identifier
    - `name` (text) - Reward name
    - `description` (text) - Reward description
    - `points_required` (integer) - Points needed to redeem
    - `discount_percentage` (decimal) - Discount percentage
    - `is_active` (boolean) - Reward availability
    - `created_at` (timestamptz) - Creation timestamp

  ## Security
  
  ### Row Level Security (RLS)
  - All tables have RLS enabled
  - Clients can view and manage their own data
  - Admin users have full access (via app_metadata role check)
  - Public can view active services for booking

  ### Policies
  Each table has specific policies for:
  - SELECT: Authenticated users can view their own data
  - INSERT: Users can create their own records
  - UPDATE: Users can update their own records
  - DELETE: Restricted to admin users only
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  phone text,
  loyalty_points integer DEFAULT 0,
  total_visits integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Create services table
CREATE TABLE IF NOT EXISTS services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  duration_minutes integer NOT NULL,
  price decimal(10, 2) NOT NULL,
  points_reward integer DEFAULT 10,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active services"
  ON services FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admin can manage services"
  ON services FOR ALL
  TO authenticated
  USING (
    (auth.jwt()->>'app_metadata')::json->>'role' = 'admin'
  )
  WITH CHECK (
    (auth.jwt()->>'app_metadata')::json->>'role' = 'admin'
  );

-- Create appointments table
CREATE TABLE IF NOT EXISTS appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
  appointment_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  notes text,
  points_earned integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own appointments"
  ON appointments FOR SELECT
  TO authenticated
  USING (auth.uid() = client_id);

CREATE POLICY "Users can create own appointments"
  ON appointments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Users can update own appointments"
  ON appointments FOR UPDATE
  TO authenticated
  USING (auth.uid() = client_id)
  WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Admin can view all appointments"
  ON appointments FOR SELECT
  TO authenticated
  USING (
    (auth.jwt()->>'app_metadata')::json->>'role' = 'admin'
  );

CREATE POLICY "Admin can manage all appointments"
  ON appointments FOR ALL
  TO authenticated
  USING (
    (auth.jwt()->>'app_metadata')::json->>'role' = 'admin'
  )
  WITH CHECK (
    (auth.jwt()->>'app_metadata')::json->>'role' = 'admin'
  );

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  appointment_id uuid REFERENCES appointments(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('confirmation', 'reminder', 'loyalty_milestone', 'promotion')),
  message text NOT NULL,
  sent_at timestamptz,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = client_id);

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = client_id)
  WITH CHECK (auth.uid() = client_id);

CREATE POLICY "System can create notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create loyalty_rewards table
CREATE TABLE IF NOT EXISTS loyalty_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  points_required integer NOT NULL,
  discount_percentage decimal(5, 2) NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE loyalty_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active rewards"
  ON loyalty_rewards FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admin can manage rewards"
  ON loyalty_rewards FOR ALL
  TO authenticated
  USING (
    (auth.jwt()->>'app_metadata')::json->>'role' = 'admin'
  )
  WITH CHECK (
    (auth.jwt()->>'app_metadata')::json->>'role' = 'admin'
  );

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_appointments_client_id ON appointments(client_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_notifications_client_id ON notifications(client_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);

-- Insert sample services
INSERT INTO services (name, description, duration_minutes, price, points_reward) VALUES
  ('Corte Masculino', 'Corte de cabelo masculino com acabamento profissional', 30, 25.00, 25),
  ('Corte Feminino', 'Corte de cabelo feminino personalizado', 45, 40.00, 40),
  ('Barba', 'Aparo e design de barba', 20, 15.00, 15),
  ('Coloração', 'Coloração completa do cabelo', 90, 80.00, 80),
  ('Hidratação', 'Tratamento de hidratação profunda', 60, 50.00, 50),
  ('Penteado', 'Penteado para eventos especiais', 60, 60.00, 60)
ON CONFLICT DO NOTHING;

-- Insert sample loyalty rewards
INSERT INTO loyalty_rewards (name, description, points_required, discount_percentage) VALUES
  ('Bronze', '10% de desconto no próximo serviço', 100, 10.00),
  ('Prata', '15% de desconto no próximo serviço', 250, 15.00),
  ('Ouro', '20% de desconto no próximo serviço', 500, 20.00),
  ('Platina', '30% de desconto no próximo serviço', 1000, 30.00)
ON CONFLICT DO NOTHING;