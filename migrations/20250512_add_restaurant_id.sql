-- Add restaurant_id column to system_logs table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'system_logs' 
    AND column_name = 'restaurant_id'
  ) THEN
    ALTER TABLE system_logs
    ADD COLUMN restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE;
  END IF;
END $$;
