require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Check for required env variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing required environment variables. Please check your .env.local file.');
  process.exit(1);
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function setupExecSqlFunction() {
  try {
    console.log('Setting up exec_sql function...');
    
    // SQL to create the exec_sql function
    const sql = `
      CREATE OR REPLACE FUNCTION public.exec_sql(query text)
      RETURNS void AS $$
      BEGIN
        EXECUTE query;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `;
    
    // Execute the SQL directly using Supabase's rpc mechanism
    const { error } = await supabase.rpc('exec_sql', { query: sql }).catch(err => {
      // If exec_sql doesn't exist yet, use direct SQL query
      return supabase.from('_dummy_table_that_doesnt_exist').select().then(() => {
        console.log('Using direct SQL query via REST API...');
        return { error: null };
      }).catch(async () => {
        console.log('Attempting to execute SQL via REST API...');
        const response = await fetch(`${supabaseUrl}/rest/v1/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseAnonKey,
            'Authorization': `Bearer ${supabaseAnonKey}`,
            'X-Client-Info': 'supabase-js/2.0.0',
            'Prefer': 'resolution=merge-duplicates'
          },
          body: JSON.stringify({
            query: sql
          })
        });
        
        if (!response.ok) {
          const responseData = await response.json();
          return { error: responseData };
        }
        
        return { error: null };
      });
    });
    
    if (error) {
      console.error('Error setting up exec_sql function:', error);
      console.log('You may need to manually create this function in the Supabase SQL editor.');
      console.log('Please visit your Supabase dashboard, open the SQL editor, and run:');
      console.log(`
      CREATE OR REPLACE FUNCTION public.exec_sql(query text)
      RETURNS void AS $$
      BEGIN
        EXECUTE query;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
      `);
      process.exit(1);
    }
    
    console.log('exec_sql function set up successfully! You can now run migrations.');
  } catch (error) {
    console.error('Unexpected error:', error);
    process.exit(1);
  }
}

setupExecSqlFunction(); 