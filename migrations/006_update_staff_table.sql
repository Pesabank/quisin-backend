-- Update restaurant_staff table structure

-- First, check if the table exists with the old structure
DO $$
BEGIN
  -- Check if name column doesn't exist
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'restaurant_staff' AND column_name = 'name'
  ) THEN
    -- Add missing columns
    ALTER TABLE restaurant_staff ADD COLUMN name VARCHAR(255);
    ALTER TABLE restaurant_staff ADD COLUMN email VARCHAR(255);
    ALTER TABLE restaurant_staff ADD COLUMN password VARCHAR(255);
    ALTER TABLE restaurant_staff ADD COLUMN phone VARCHAR(50);
    ALTER TABLE restaurant_staff ADD COLUMN role VARCHAR(100);
    ALTER TABLE restaurant_staff ADD COLUMN status VARCHAR(50) DEFAULT 'active';
    
    -- Make required columns NOT NULL after adding them
    ALTER TABLE restaurant_staff ALTER COLUMN name SET NOT NULL;
    ALTER TABLE restaurant_staff ALTER COLUMN email SET NOT NULL;
    ALTER TABLE restaurant_staff ALTER COLUMN password SET NOT NULL;
    ALTER TABLE restaurant_staff ALTER COLUMN role SET NOT NULL;
    
    -- Add unique constraint to email
    ALTER TABLE restaurant_staff ADD CONSTRAINT restaurant_staff_email_key UNIQUE (email);
  END IF;
END
$$;
