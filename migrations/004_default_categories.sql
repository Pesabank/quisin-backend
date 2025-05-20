-- Migration: 004_default_categories.sql
-- Description: Add default categories for restaurants
-- Date: 2025-05-14

-- Create default_categories table if it doesn't exist
CREATE TABLE IF NOT EXISTS default_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  display_order INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE
);

-- Insert default categories
INSERT INTO default_categories (name, description, display_order)
VALUES
  ('Appetizers', 'Starters and small bites to stimulate the appetite', 1),
  ('Soups', 'Warm and comforting soups', 2),
  ('Salads', 'Fresh and healthy salad options', 3),
  ('Main Course', 'Primary dishes and entrees', 4),
  ('Seafood', 'Fresh seafood specialties', 5),
  ('Grill', 'Grilled meats and vegetables', 6),
  ('Pasta', 'Pasta and noodle dishes', 7),
  ('Pizza', 'Traditional and gourmet pizzas', 8),
  ('Sides', 'Side dishes and accompaniments', 9),
  ('Desserts', 'Sweet treats and desserts', 10),
  ('Beverages', 'Drinks and refreshments', 11),
  ('Kids Menu', 'Special dishes for children', 12),
  ('Specials', 'Chef''s special dishes and seasonal items', 13)
ON CONFLICT (name) DO NOTHING;

-- Create function to copy default categories for new restaurants
CREATE OR REPLACE FUNCTION copy_default_categories_for_restaurant(restaurant_id UUID)
RETURNS void AS $$
BEGIN
  INSERT INTO categories (id, restaurant_id, name, description, display_order, is_active)
  SELECT 
    uuid_generate_v4(),
    restaurant_id,
    name,
    description,
    display_order,
    is_active
  FROM default_categories
  WHERE is_active = true
  ORDER BY display_order
  ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql;
