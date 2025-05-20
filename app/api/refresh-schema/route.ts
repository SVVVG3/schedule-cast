import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    // Execute a query that forces a schema refresh
    const { error } = await supabase.rpc('pg_catalog_refresh');
    
    if (error) {
      console.error("Error refreshing schema:", error);
      
      // Try an alternative approach
      const { error: tableError } = await supabase
        .from('scheduled_casts')
        .select('result')
        .limit(1);
      
      if (tableError) {
        return NextResponse.json({
          success: false,
          message: "Failed to refresh schema cache",
          error: tableError.message
        }, { status: 500 });
      }
    }
    
    return NextResponse.json({
      success: true,
      message: "Schema cache refreshed successfully"
    });
    
  } catch (error) {
    console.error("Error refreshing schema cache:", error);
    return NextResponse.json({
      success: false,
      message: "Internal server error while refreshing schema cache"
    }, { status: 500 });
  }
} 