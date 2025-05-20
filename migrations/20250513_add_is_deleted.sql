-- Migration: 20250513_add_is_deleted.sql
-- Description: Add is_deleted column to dishes and categories tables
-- Date: 2025-05-13

-- Add is_deleted column to dishes table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'dishes'
    AND column_name = 'is_deleted'
  ) THEN
    ALTER TABLE dishes
    ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Add is_deleted column to categories table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'categories'
    AND column_name = 'is_deleted'
  ) THEN
    ALTER TABLE categories
    ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Create indexes for better performance if they don't exist
CREATE INDEX IF NOT EXISTS idx_dishes_is_deleted ON dishes(is_deleted);
CREATE INDEX IF NOT EXISTS idx_categories_is_deleted ON categories(is_deleted);
