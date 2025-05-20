-- Migration: 009_add_dish_constraints.sql
-- Description: Add unique constraint for dish name per restaurant
-- Date: 2025-05-14

-- Add unique constraint for dish name per restaurant
ALTER TABLE dishes 
ADD CONSTRAINT dishes_name_restaurant_unique 
UNIQUE (name, restaurant_id);
