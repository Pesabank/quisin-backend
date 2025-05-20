DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'dishes' AND column_name = 'dietary_info') THEN
        ALTER TABLE dishes ADD COLUMN dietary_info JSONB DEFAULT '[]'::jsonb;
    END IF;
END $$;
