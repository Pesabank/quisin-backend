-- Add metadata column to system_logs table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'system_logs' 
    AND column_name = 'metadata'
  ) THEN
    ALTER TABLE system_logs
    ADD COLUMN metadata JSONB;
  END IF;
END $$;
