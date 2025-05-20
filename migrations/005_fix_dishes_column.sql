-- Migration: 005_fix_dishes_column.sql
-- Description: Increase the length of image_url columns
-- Date: 2025-05-14

-- Increase image_url length in dishes table
ALTER TABLE dishes 
ALTER COLUMN image_url TYPE VARCHAR(1024);
