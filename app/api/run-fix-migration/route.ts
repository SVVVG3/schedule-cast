import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import fs from 'fs';
import path from 'path';

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  console.log("Checking scheduled_casts table schema...");
  
  try {
    // First, let's check the actual columns in the table to determine the correct column name
    const { data: schemaData, error: schemaError } = await supabase
      .from('scheduled_casts')
      .select('*')
      .limit(1);
    
    if (schemaError) {
      console.error("Error checking schema:", schemaError);
      return NextResponse.json({
        success: false,
        message: "Failed to check table schema",
        error: schemaError.message
      }, { status: 500 });
    }
    
    // Log the column names for debugging
    const columns = schemaData && schemaData.length > 0 ? Object.keys(schemaData[0]) : [];
    console.log("Found columns:", columns);
    
    // Check for potential time column names
    const timeColumnCandidates = ['scheduled_time', 'schedule_time', 'scheduled_at', 'schedule_at', 'scheduled_for'];
    const timeColumn = columns.find(col => timeColumnCandidates.includes(col)) || 'created_at';
    
    console.log(`Using time column: ${timeColumn}`);
    
    // Try to update the casts directly with the correct column name
    const { error } = await supabase
      .from('scheduled_casts')
      .update({ 
        posted: true, 
        posted_at: new Date().toISOString() 
      })
      .lte(timeColumn, new Date().toISOString())
      .eq('posted', false);
    
    if (error) {
      console.error("Error running fix migration:", error);
      
      // If we failed with our best guess, try a more generic approach
      // Just update all records that are not posted
      const { error: fallbackError } = await supabase
        .from('scheduled_casts')
        .update({ 
          posted: true, 
          posted_at: new Date().toISOString() 
        })
        .eq('posted', false);
      
      if (fallbackError) {
        return NextResponse.json({
          success: false,
          message: "Failed to run fix migration",
          error: fallbackError.message
        }, { status: 500 });
      }
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
      message: "Fix migration completed successfully",
      columns
    });
    
  } catch (error) {
    console.error("Error running fix migration:", error);
    return NextResponse.json({
      success: false,
      message: "Internal server error while running fix migration"
    }, { status: 500 });
  }
} 