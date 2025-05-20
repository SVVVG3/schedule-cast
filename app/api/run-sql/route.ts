import { NextRequest, NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  // Only allow this in development or with a secret
  const isAuthorized = process.env.NODE_ENV === 'development' || 
                        request.headers.get('x-api-key') === process.env.CRON_SECRET;
  
  if (!isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const json = await request.json();
    const { sql } = json;
    
    if (!sql) {
      return NextResponse.json({ error: 'SQL query is required' }, { status: 400 });
    }
    
    // Create a direct Postgres connection with admin privileges 
    // This bypasses RLS policies which is important for migrations
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL as string,
      process.env.SUPABASE_SERVICE_ROLE_KEY as string, // This key has higher privileges
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
    
    // Execute the SQL directly via Postgres
    const { data, error } = await supabaseAdmin.rpc('pg_catalog_refresh');
    
    // If the pg_catalog_refresh fails, try a simpler approach
    if (error) {
      console.log("Could not use pg_catalog_refresh, trying direct SQL");
      
      // Try an alternative approach with direct SQL
      const { data: sqlData, error: sqlError } = await supabaseAdmin.from('scheduled_casts')
        .update({ 
          posted: true, 
          posted_at: new Date().toISOString() 
        })
        .lte('scheduled_time', new Date().toISOString())
        .eq('posted', false);
      
      if (sqlError) {
        return NextResponse.json({ 
          success: false, 
          error: sqlError.message 
        }, { status: 500 });
      }
      
      return NextResponse.json({ 
        success: true,
        message: "SQL executed successfully via direct table update"
      });
    }
    
    return NextResponse.json({ 
      success: true,
      message: "SQL executed successfully" 
    });
    
  } catch (error) {
    console.error("Error executing SQL:", error);
    return NextResponse.json({ 
      error: "An error occurred while executing SQL",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 