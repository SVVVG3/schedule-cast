// Script to apply database migrations to Supabase
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local if it exists
try {
  const dotenv = require('dotenv');
  dotenv.config({ path: '.env.local' });
} catch (e) {
  console.log('No dotenv package installed, skipping .env.local loading');
}

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY).');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration(filePath) {
  try {
    const sqlContent = fs.readFileSync(filePath, 'utf8');
    console.log(`Applying migration: ${path.basename(filePath)}`);
    
    // Split the SQL file into separate statements
    // This is a simple approach and might not work for complex SQL files
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);
    
    // Apply each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`Executing statement ${i + 1}/${statements.length}...`);
      
      // Use the PostgREST RPC endpoint to execute the SQL
      // https://postgrest.org/en/stable/api.html#stored-procedures
      const { error } = await supabase.rpc('exec_sql', { sql: statement });
      
      if (error) {
        // If the exec_sql function doesn't exist, we'll need to use the Supabase dashboard
        console.error(`Error executing statement: ${error.message}`);
        console.error('Please execute this migration manually using the Supabase dashboard SQL editor.');
        console.log('SQL Statement:');
        console.log(statement);
        return false;
      }
    }
    
    console.log(`Successfully applied migration: ${path.basename(filePath)}`);
    return true;
  } catch (error) {
    console.error(`Error reading or applying migration ${path.basename(filePath)}:`, error);
    return false;
  }
}

async function main() {
  const migrationFile = process.argv[2];
  
  if (!migrationFile) {
    console.error('Please provide a migration file path as an argument.');
    process.exit(1);
  }
  
  const fullPath = path.resolve(migrationFile);
  
  if (!fs.existsSync(fullPath)) {
    console.error(`Migration file not found: ${fullPath}`);
    process.exit(1);
  }
  
  const success = await applyMigration(fullPath);
  
  if (!success) {
    console.error('Migration failed - please apply it manually through the Supabase dashboard.');
    process.exit(1);
  }
  
  console.log('Migration completed successfully');
}

main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
}); 