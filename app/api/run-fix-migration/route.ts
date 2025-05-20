import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import fs from 'fs';
import path from 'path';

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    // We'll run the SQL directly against the scheduled_casts table
    console.log("Running fix migration...");
    
    // Try to update the casts directly
    const { error } = await supabase
      .from('scheduled_casts')
      .update({ 
        posted: true, 
        posted_at: new Date().toISOString() 
      })
      .lte('scheduled_time', new Date().toISOString())
      .eq('posted', false);
    
    if (error) {
      console.error("Error running fix migration:", error);
      return NextResponse.json({
        success: false,
        message: "Failed to run fix migration",
        error: error.message
      }, { status: 500 });
    }
    
    // Also try to refresh the schema cache
    try {
      await supabase
        .from('scheduled_casts')
        .select('result')
        .limit(1);
      
      console.log("Schema cache refresh attempt completed");
    } catch (cacheErr) {
      console.log("Schema cache refresh attempt error (non-critical):", cacheErr);
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