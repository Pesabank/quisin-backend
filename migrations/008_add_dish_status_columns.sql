-- Migration: 008_add_dish_status_columns.sql
-- Description: Add status and availability columns to dishes table
-- Date: 2025-05-14

-- Add availability and status columns
ALTER TABLE dishes
ADD COLUMN IF NOT EXISTS available BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active',
ADD COLUMN IF NOT EXISTS last_status_update TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
