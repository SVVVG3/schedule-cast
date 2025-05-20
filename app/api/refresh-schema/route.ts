import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  console.log("Attempting to refresh schema cache...");
  
  try {
    // Attempt multiple approaches to refresh the schema cache
    const attempts = [];
    
    // Attempt 1: Try a simple SELECT on the result column
    try {
      const { error: attempt1Error } = await supabase
        .from('scheduled_casts')
        .select('result')
        .limit(1);
      
      attempts.push({ method: "select-result", success: !attempt1Error, error: attempt1Error?.message });
    } catch (err) {
      attempts.push({ method: "select-result", success: false, error: "Exception occurred" });
    }
    
    // Attempt 2: Try a simple SELECT on all columns
    try {
      const { error: attempt2Error } = await supabase
        .from('scheduled_casts')
        .select('*')
        .limit(1);
      
      attempts.push({ method: "select-all", success: !attempt2Error, error: attempt2Error?.message });
    } catch (err) {
      attempts.push({ method: "select-all", success: false, error: "Exception occurred" });
    }
    
    // Attempt 3: Try a simple update on a non-existent record
    try {
      const { error: attempt3Error } = await supabase
        .from('scheduled_casts')
        .update({ 
          result: JSON.stringify({ refresh_attempt: true }) 
        })
        .eq('id', '00000000-0000-0000-0000-000000000000'); // A UUID that won't exist
      
      attempts.push({ method: "update-nonexistent", success: !attempt3Error || !attempt3Error.message.includes('result'), error: attempt3Error?.message });
    } catch (err) {
      attempts.push({ method: "update-nonexistent", success: false, error: "Exception occurred" });
    }
    
    // If any attempt succeeded or we didn't get a 'column not found' error, consider it a success
    const anySuccess = attempts.some(a => a.success);
    const allResultErrors = attempts.every(a => a.error && a.error.includes('result'));
    
    console.log("Schema refresh attempts:", attempts);
    
    if (anySuccess) {
      return NextResponse.json({
        success: true,
        message: "Schema cache refresh attempt completed",
        attempts
      });
    } else if (allResultErrors) {
      return NextResponse.json({
        success: false,
        message: "All refresh attempts failed with column errors",
        attempts
      }, { status: 500 });
    } else {
      return NextResponse.json({
        success: false,
        message: "Schema refresh attempts completed with mixed results",
        attempts
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error("Error in schema cache refresh:", error);
    return NextResponse.json({
      success: false,
      message: "Internal server error during schema refresh"
    }, { status: 500 });
  }
} 