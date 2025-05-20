-- Migration: 007_add_stock_columns.sql
-- Description: Add stock management columns to dishes table
-- Date: 2025-05-14

-- Add stock management columns
ALTER TABLE dishes
ADD COLUMN IF NOT EXISTS stock INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS inventory_status VARCHAR(50),
ADD COLUMN IF NOT EXISTS last_stock_update TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
