import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * API endpoint to run the signer approval fields migration
 */
export async function POST(request: Request) {
  try {
    console.log('[migrate/add-signer-fields] Running migration to add signer approval fields');
    
    const migrations = [
      {
        name: 'signer_approval_url',
        sql: `ALTER TABLE users ADD COLUMN IF NOT EXISTS signer_approval_url TEXT;`
      },
      {
        name: 'signer_status', 
        sql: `ALTER TABLE users ADD COLUMN IF NOT EXISTS signer_status TEXT DEFAULT 'generated';`
      },
      {
        name: 'needs_signer_approval',
        sql: `ALTER TABLE users ADD COLUMN IF NOT EXISTS needs_signer_approval BOOLEAN DEFAULT FALSE;`
      },
      {
        name: 'last_signer_check',
        sql: `ALTER TABLE users ADD COLUMN IF NOT EXISTS last_signer_check TIMESTAMPTZ;`
      }
    ];
    
    const results = [];
    
    // Execute each migration individually
    for (const migration of migrations) {
      try {
        console.log(`[migrate] Adding column: ${migration.name}`);
        
        // Use .rpc to execute raw SQL
        const { error } = await supabase.rpc('exec', { 
          sql: migration.sql 
        });
        
        if (error) {
          // If the RPC doesn't work, try using the SQL directly
          console.log(`[migrate] RPC failed for ${migration.name}, trying direct SQL execution`);
          
          // Try executing the SQL through a different method
          const { error: directError } = await supabase
            .from('users')
            .select('id')
            .limit(1);
          
          if (directError) {
            throw new Error(`Failed to access users table: ${directError.message}`);
          }
          
          // Since we can't execute DDL directly, we'll need to do this differently
          console.log(`[migrate] Cannot execute DDL through client for ${migration.name}`);
          results.push({
            column: migration.name,
            success: false,
            error: 'DDL execution not supported through client',
            sql: migration.sql
          });
        } else {
          results.push({
            column: migration.name,
            success: true
          });
        }
      } catch (migrationError) {
        console.error(`[migrate] Error with ${migration.name}:`, migrationError);
        results.push({
          column: migration.name,
          success: false,
          error: (migrationError as Error).message,
          sql: migration.sql
        });
      }
    }
    
    // Check if all migrations succeeded
    const allSucceeded = results.every(r => r.success);
    
    if (!allSucceeded) {
      return NextResponse.json({
        success: false,
        message: 'Migration partially failed - please run the SQL manually in Supabase dashboard',
        results: results,
        manual_sql: migrations.map(m => m.sql).join('\n'),
        instructions: 'Copy the manual_sql and run it in your Supabase SQL Editor dashboard'
      });
    }
    
    console.log('[migrate/add-signer-fields] Migration completed successfully');
    
    return NextResponse.json({
      success: true,
      message: 'Signer approval fields migration completed successfully',
      results: results
    });
  } catch (error) {
    console.error('[migrate/add-signer-fields] Unexpected error:', error);
    
    // Provide manual SQL as fallback
    const manualSQL = `
-- Run this SQL in your Supabase SQL Editor dashboard:
ALTER TABLE users ADD COLUMN IF NOT EXISTS signer_approval_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS signer_status TEXT DEFAULT 'generated';
ALTER TABLE users ADD COLUMN IF NOT EXISTS needs_signer_approval BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_signer_check TIMESTAMPTZ;
`;
    
    return NextResponse.json({
      success: false,
      error: `Migration failed: ${(error as Error).message}`,
      manual_sql: manualSQL,
      instructions: 'Please run the manual_sql in your Supabase SQL Editor dashboard'
    }, { status: 500 });
  }
} 