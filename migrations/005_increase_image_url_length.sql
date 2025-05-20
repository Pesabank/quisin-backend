-- Migration: 005_increase_image_url_length.sql
-- Description: Increase the length of image_url columns
-- Date: 2025-05-14

-- Increase image_url length in dishes table
ALTER TABLE dishes 
ALTER COLUMN image_url TYPE VARCHAR(1024);

-- Also increase other image URL columns for consistency
ALTER TABLE categories 
ALTER COLUMN image_url TYPE VARCHAR(1024);

ALTER TABLE users 
ALTER COLUMN profile_image TYPE VARCHAR(1024);

ALTER TABLE restaurants 
ALTER COLUMN logo_url TYPE VARCHAR(1024);
