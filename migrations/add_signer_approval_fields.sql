-- Add signer approval fields to the users table
-- This migration adds fields to track signer status and approval URLs

-- First check if columns exist before adding them
DO $$
BEGIN
    -- Add signer_approval_url column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'signer_approval_url'
    ) THEN
        ALTER TABLE users 
        ADD COLUMN signer_approval_url TEXT;
    END IF;
    
    -- Add signer_status column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'signer_status'
    ) THEN
        ALTER TABLE users 
        ADD COLUMN signer_status TEXT DEFAULT 'generated';
    END IF;
    
    -- Add needs_signer_approval column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'needs_signer_approval'
    ) THEN
        ALTER TABLE users 
        ADD COLUMN needs_signer_approval BOOLEAN DEFAULT FALSE;
    END IF;
    
    -- Add last_signer_check column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'last_signer_check'
    ) THEN
        ALTER TABLE users 
        ADD COLUMN last_signer_check TIMESTAMPTZ;
    END IF;
END
$$; 