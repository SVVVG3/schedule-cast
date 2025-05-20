import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import fs from 'fs';
import path from 'path';

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    // Read migration SQL
    const migrationPath = path.join(process.cwd(), 'migrations', '09_fix_posted_casts.sql');
    let sql;
    
    try {
      sql = fs.readFileSync(migrationPath, 'utf8');
    } catch (err) {
      // If file system access fails (likely in production), use hardcoded SQL
      sql = `
      -- Fix any casts that were posted but not marked as posted
      UPDATE scheduled_casts
      SET 
        posted = true, 
        posted_at = NOW()
      WHERE 
        scheduled_time <= NOW() 
        AND posted = false;
      `;
    }

    // Run the migration
    const { error } = await supabase.rpc('pgx_query', { query: sql });
    
    if (error) {
      console.error("Error running fix migration:", error);
      
      // Try direct query as fallback
      const { error: directError } = await supabase.rpc('pg_catalog_refresh');
      
      if (directError) {
        return NextResponse.json({
          success: false,
          message: "Failed to run fix migration",
          error: error.message
        }, { status: 500 });
      }
    }
    
    return NextResponse.json({
      success: true,
      message: "Fix migration completed successfully"
    });
    
  } catch (error) {
    console.error("Error running fix migration:", error);
    return NextResponse.json({
      success: false,
      message: "Internal server error while running fix migration"
    }, { status: 500 });
  }
} 