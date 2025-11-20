/*
  # Fix admin_users role constraint

  1. Changes
    - Update existing 'admin' role to 'super_admin'
    - Drop old constraint that only allows 'admin' and 'super_admin'
    - Add new constraint that allows 'super_admin' and 'barber'
    
  2. Notes
    - This fixes the issue preventing barber role creation
    - Migrates existing admins to super_admin role
*/

-- Update existing 'admin' roles to 'super_admin'
UPDATE admin_users SET role = 'super_admin' WHERE role = 'admin';

-- Drop the old constraint
ALTER TABLE admin_users DROP CONSTRAINT IF EXISTS admin_users_role_check;

-- Add the correct constraint
ALTER TABLE admin_users ADD CONSTRAINT admin_users_role_check 
CHECK (role IN ('super_admin', 'barber'));