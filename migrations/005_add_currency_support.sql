-- Migration: 005_add_currency_support.sql
-- Description: Add currency support for restaurants and menu items
-- Date: 2025-05-14

-- Create currencies table
CREATE TABLE IF NOT EXISTS currencies (
  code VARCHAR(3) PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  symbol VARCHAR(5) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE
);

-- Insert common currencies
INSERT INTO currencies (code, name, symbol) VALUES
  ('USD', 'US Dollar', '$'),
  ('KES', 'Kenyan Shilling', 'Ksh'),
  ('EUR', 'Euro', '€'),
  ('GBP', 'British Pound', '£')
ON CONFLICT (code) DO NOTHING;

-- Add currency support to restaurants
ALTER TABLE restaurants
ADD COLUMN IF NOT EXISTS default_currency VARCHAR(3) REFERENCES currencies(code);

-- Add currency support to dishes
ALTER TABLE dishes
ADD COLUMN IF NOT EXISTS currency_code VARCHAR(3) REFERENCES currencies(code),
ADD COLUMN IF NOT EXISTS price_amount DECIMAL(10,2);

-- Create function to update dish prices with currency
CREATE OR REPLACE FUNCTION update_dish_price_with_currency()
RETURNS TRIGGER AS $$
BEGIN
  -- If no currency specified, use restaurant's default currency
  IF NEW.currency_code IS NULL THEN
    SELECT default_currency INTO NEW.currency_code
    FROM restaurants
    WHERE id = NEW.restaurant_id;
  END IF;
  
  -- If price_amount not set but price is, copy it
  IF NEW.price_amount IS NULL AND NEW.price IS NOT NULL THEN
    NEW.price_amount = NEW.price;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for dish price updates
CREATE TRIGGER dish_price_currency_trigger
BEFORE INSERT OR UPDATE ON dishes
FOR EACH ROW
EXECUTE FUNCTION update_dish_price_with_currency();
