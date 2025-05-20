-- Migration: 006_update_dishes_schema.sql
-- Description: Update dishes table schema with missing columns
-- Date: 2025-05-14

-- Add missing columns to dishes table
ALTER TABLE dishes
ADD COLUMN IF NOT EXISTS max_stock INTEGER DEFAULT 100,
ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS dietary_tags TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
