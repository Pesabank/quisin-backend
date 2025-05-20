-- Migration: 20250513_add_default_admin.sql
-- Description: Add default admin user and restaurant
-- Date: 2025-05-13

DO $$ 
DECLARE
  admin_id UUID;
  restaurant_id UUID;
BEGIN
  -- Create default admin user if not exists
  INSERT INTO users (
    email, 
    password, 
    role, 
    first_name, 
    last_name, 
    is_active
  )
  VALUES (
    'admin@quisin.com',
    '$2b$10$R9UHVOWWeNHpSuPXoC7V5ecwLQ3fV9EjIF6GPWHU25LF.2iJCqnJe',  -- Password: admin123
    'admin',
    'Admin',
    'User',
    true
  )
  ON CONFLICT (email) DO NOTHING
  RETURNING id INTO admin_id;

  -- Create default restaurant if not exists
  INSERT INTO restaurants (
    name,
    address,
    city,
    country,
    is_active
  )
  VALUES (
    'Demo Restaurant',
    '123 Main St',
    'Demo City',
    'Demo Country',
    true
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO restaurant_id;

  -- Link admin to restaurant
  IF admin_id IS NOT NULL AND restaurant_id IS NOT NULL THEN
    INSERT INTO restaurant_admins (
      restaurant_id,
      user_id
    )
    VALUES (
      restaurant_id,
      admin_id
    )
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
