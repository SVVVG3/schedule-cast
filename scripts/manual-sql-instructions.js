require('dotenv').config({ path: '.env.local' });
const fs = require('fs');

// Check for required env variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

if (!supabaseUrl) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable. Please check your .env.local file.');
  process.exit(1);
}

// Function to provide migration instructions
function provideInstructions() {
  try {
    console.log('To set up the exec_sql function and run migrations, follow these steps:');
    console.log('');
    console.log('1. Visit your Supabase Dashboard SQL Editor:');
    
    // Extract project ID from URL
    const projectId = supabaseUrl.split('//')[1].split('.')[0];
    const sqlEditorUrl = `https://supabase.com/dashboard/project/${projectId}/sql/new`;
    
    console.log(`   ${sqlEditorUrl}`);
    console.log('');
    console.log('2. Copy and paste the following SQL into the editor:');
    console.log('');
    console.log(`CREATE OR REPLACE FUNCTION public.exec_sql(query text)
RETURNS void AS $$
BEGIN
  EXECUTE query;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;`);
    console.log('');
    console.log('3. Click "Run" to create the function');
    console.log('');
    console.log('4. Now run these SQL statements one by one:');
    console.log('');
    
    // Print out the contents of each migration file
    console.log('--- File: 00_create_migrations_table.sql ---');
    console.log(fs.readFileSync('database/migrations/00_create_migrations_table.sql', 'utf8'));
    console.log('');
    
    console.log('--- File: 01_create_users_table.sql ---');
    console.log(fs.readFileSync('database/migrations/01_create_users_table.sql', 'utf8'));
    console.log('');
    
    console.log('--- File: 02_create_scheduled_casts_table.sql ---');
    console.log(fs.readFileSync('database/migrations/02_create_scheduled_casts_table.sql', 'utf8'));
    console.log('');
    
    console.log('--- File: 00_fix_rls.sql ---');
    console.log(fs.readFileSync('database/migrations/00_fix_rls.sql', 'utf8'));
    console.log('');
    
    console.log('5. After running all migrations, restart your Next.js server:');
    console.log('   npm run dev');
    
  } catch (error) {
    console.error('Unexpected error:', error);
    process.exit(1);
  }
}

provideInstructions(); 