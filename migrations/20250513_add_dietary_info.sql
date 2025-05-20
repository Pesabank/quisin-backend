-- Migration: 20250513_add_dietary_info.sql
-- Description: Add dietary_info column to dishes table
-- Date: 2025-05-13

-- Add dietary_info column to dishes table as a JSON array
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'dishes'
    AND column_name = 'dietary_info'
  ) THEN
    ALTER TABLE dishes
    ADD COLUMN dietary_info JSONB DEFAULT '[]'::jsonb;
  END IF;
END $$;
