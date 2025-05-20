-- Migration for the support ticketing system with UUID support

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- First, ensure the support_tickets table has the necessary structure
DO $$
BEGIN
    -- If the table already exists, add any missing columns
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'support_tickets') THEN
        -- Add category column if it doesn't exist
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'support_tickets' AND column_name = 'category') THEN
            ALTER TABLE support_tickets ADD COLUMN category VARCHAR(100) DEFAULT 'General';
        END IF;
        
        -- Add resolved_at column if it doesn't exist
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'support_tickets' AND column_name = 'resolved_at') THEN
            ALTER TABLE support_tickets ADD COLUMN resolved_at TIMESTAMP WITH TIME ZONE;
        END IF;
        
        -- Add closed_at column if it doesn't exist
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'support_tickets' AND column_name = 'closed_at') THEN
            ALTER TABLE support_tickets ADD COLUMN closed_at TIMESTAMP WITH TIME ZONE;
        END IF;
        
        -- Add ticket_number column if it doesn't exist
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'support_tickets' AND column_name = 'ticket_number') THEN
            ALTER TABLE support_tickets ADD COLUMN ticket_number VARCHAR(50);
        END IF;
    ELSE
        -- Create the support_tickets table if it doesn't exist
        CREATE TABLE support_tickets (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            subject VARCHAR(255) NOT NULL,
            priority VARCHAR(50) NOT NULL,
            category VARCHAR(100) NOT NULL DEFAULT 'General',
            description TEXT NOT NULL,
            status VARCHAR(50) NOT NULL DEFAULT 'Open',
            restaurant_id INTEGER NOT NULL,
            user_id UUID NOT NULL,
            ticket_number VARCHAR(50),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            resolved_at TIMESTAMP WITH TIME ZONE,
            closed_at TIMESTAMP WITH TIME ZONE
        );
        
        -- Add foreign key constraints separately
        ALTER TABLE support_tickets ADD CONSTRAINT support_tickets_restaurant_id_fkey
            FOREIGN KEY (restaurant_id) REFERENCES restaurants(id);
        
        ALTER TABLE support_tickets ADD CONSTRAINT support_tickets_user_id_fkey
            FOREIGN KEY (user_id) REFERENCES users(id);
    END IF;
END
$$;

DO $$
BEGIN     
    -- Fix any inconsistencies in the migration
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'support_tickets' AND column_name = 'created_by') THEN
        -- If both created_by and user_id exist, we need to handle the migration
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'support_tickets' AND column_name = 'user_id') THEN
            -- Both columns exist, do nothing as we'll keep using user_id
            NULL;
        ELSE
            -- Only created_by exists, rename it to user_id
            ALTER TABLE support_tickets RENAME COLUMN created_by TO user_id;
        END IF;
    END IF;
END
$$;

-- Now create or update the support_messages table
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'support_messages') THEN
        CREATE TABLE support_messages (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            ticket_id UUID NOT NULL,
            user_id UUID,
            message TEXT NOT NULL,
            is_staff BOOLEAN DEFAULT FALSE,
            user_name VARCHAR(255),
            attachments JSONB DEFAULT '[]'::jsonb,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- Add foreign key constraints
        ALTER TABLE support_messages ADD CONSTRAINT support_messages_ticket_id_fkey
            FOREIGN KEY (ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE;
            
        ALTER TABLE support_messages ADD CONSTRAINT support_messages_user_id_fkey
            FOREIGN KEY (user_id) REFERENCES users(id);
    ELSE
        -- If the table exists, ensure it has all the necessary columns
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'support_messages' AND column_name = 'attachments') THEN
            ALTER TABLE support_messages ADD COLUMN attachments JSONB DEFAULT '[]'::jsonb;
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'support_messages' AND column_name = 'user_name') THEN
            ALTER TABLE support_messages ADD COLUMN user_name VARCHAR(255);
        END IF;
    END IF;
END
$$;

-- Now handle the ticket_messages table
DO $$
BEGIN
    -- Drop existing ticket_messages table if it exists to avoid conflicts
    DROP TABLE IF EXISTS ticket_messages;
    
    -- Create the ticket_messages table
    CREATE TABLE ticket_messages (
        id SERIAL PRIMARY KEY,
        ticket_id UUID NOT NULL,
        user_id UUID NOT NULL,
        message TEXT NOT NULL,
        is_staff BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    -- Add foreign key constraints separately
    ALTER TABLE ticket_messages ADD CONSTRAINT ticket_messages_ticket_id_fkey
        FOREIGN KEY (ticket_id) REFERENCES support_tickets(id);
        
    ALTER TABLE ticket_messages ADD CONSTRAINT ticket_messages_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES users(id);
    
    -- Copy data from support_messages if it exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'support_messages') THEN
        BEGIN
            INSERT INTO ticket_messages (ticket_id, user_id, message, created_at)
            SELECT ticket_id, user_id, content, created_at 
            FROM support_messages
            WHERE ticket_id IS NOT NULL AND user_id IS NOT NULL;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not copy data from support_messages: %', SQLERRM;
        END;
    END IF;
END
$$;

-- Finally, handle the ticket_attachments table
DO $$
BEGIN
    -- Drop existing ticket_attachments table if it exists to avoid conflicts
    DROP TABLE IF EXISTS ticket_attachments;
    
    -- Create the ticket_attachments table
    CREATE TABLE ticket_attachments (
        id SERIAL PRIMARY KEY,
        ticket_id UUID NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        file_path VARCHAR(255) NOT NULL,
        file_type VARCHAR(100),
        file_size INTEGER,
        uploaded_by UUID NOT NULL,
        uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    -- Add foreign key constraints separately
    ALTER TABLE ticket_attachments ADD CONSTRAINT ticket_attachments_ticket_id_fkey
        FOREIGN KEY (ticket_id) REFERENCES support_tickets(id);
        
    ALTER TABLE ticket_attachments ADD CONSTRAINT ticket_attachments_uploaded_by_fkey
        FOREIGN KEY (uploaded_by) REFERENCES users(id);
END
$$;
