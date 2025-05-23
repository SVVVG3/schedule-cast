import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * API endpoint to run the signer approval fields migration
 */
export async function POST(request: Request) {
  try {
    console.log('[migrate/add-signer-fields] Running migration to add signer approval fields');
    
    const migrationSQL = `
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
$$;`;
    
    // Execute the migration
    const { error } = await supabase.rpc('exec_sql', { sql: migrationSQL });
    
    if (error) {
      console.error('[migrate/add-signer-fields] Migration failed:', error);
      return NextResponse.json(
        { error: `Migration failed: ${error.message}` },
        { status: 500 }
      );
    }
    
    console.log('[migrate/add-signer-fields] Migration completed successfully');
    
    return NextResponse.json({
      success: true,
      message: 'Signer approval fields migration completed successfully'
    });
  } catch (error) {
    console.error('[migrate/add-signer-fields] Unexpected error:', error);
    return NextResponse.json(
      { error: `Migration failed: ${(error as Error).message}` },
      { status: 500 }
    );
  }
} 