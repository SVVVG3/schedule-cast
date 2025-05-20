import { NextResponse } from 'next/server';
import { readdirSync, readFileSync } from 'fs';
import path from 'path';
import { supabase } from '@/lib/supabase';

// This is a development-only endpoint to apply migrations
// In production, you would use Supabase migrations or similar tools
export async function POST(request: Request) {
  // Basic security check - require a secret key
  const { key } = await request.json();
  const adminKey = process.env.MIGRATION_SECRET_KEY;

  if (key !== adminKey) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const migrationDir = path.join(process.cwd(), 'database', 'migrations');
    const migrationFiles = readdirSync(migrationDir)
      .filter(file => file.endsWith('.sql'))
      .sort(); // Sort to ensure order

    const results = [];

    for (const file of migrationFiles) {
      const filePath = path.join(migrationDir, file);
      const sql = readFileSync(filePath, 'utf8');
      
      // Execute the SQL
      const { error } = await supabase.from('_migrations').select('*').eq('name', file).single();

      // Skip if already applied (checking if it exists in our _migrations table)
      if (!error) {
        results.push({ file, status: 'skipped' });
        continue;
      }

      // Apply the migration
      const { error: sqlError } = await supabase.rpc('exec', { sql });

      if (sqlError) {
        return NextResponse.json(
          { error: `Migration failed: ${file}`, details: sqlError.message },
          { status: 500 }
        );
      }

      // Record the migration as applied
      await supabase.from('_migrations').insert({ name: file });
      
      results.push({ file, status: 'applied' });
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json(
      { error: 'Migration failed', details: (error as Error).message },
      { status: 500 }
    );
  }
} 