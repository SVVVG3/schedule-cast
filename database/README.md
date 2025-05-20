# Database Migrations

This directory contains SQL migrations for the Supabase database used by Schedule-Cast.

## Migration Files

The migrations are numbered and should be applied in sequence:

1. `00_create_migrations_table.sql` - Creates a table to track applied migrations
2. `00_create_exec_sql_function.sql` - Creates a function for running arbitrary SQL
3. `00_fix_rls.sql` - Fixes row-level security settings
4. `01_create_users_table.sql` - Creates the users table
5. `02_create_scheduled_casts_table.sql` - Creates the scheduled_casts table
6. `05_add_signer_fields.sql` - Adds signer-related fields to the users table
7. `06_add_fid_and_signer_to_scheduled_casts.sql` - Adds fid and signer_uuid columns to scheduled_casts table
8. `07_update_rls_for_neynar.sql` - Updates Row Level Security policies for SIWN authentication
9. `08_add_result_column_to_scheduled_casts.sql` - Adds result column to store API responses

## How to Apply Migrations

### Using the Supabase Dashboard

1. Go to the [Supabase Dashboard](https://app.supabase.io)
2. Select your project
3. Go to the SQL Editor
4. Copy and paste the migration file content
5. Execute the SQL

### Using the Migration Script

We've created a Node.js script to help apply migrations:

```bash
# Install dependencies if needed
npm install dotenv @supabase/supabase-js

# Run the migration script for a specific file
node scripts/apply-migration.js database/migrations/07_update_rls_for_neynar.sql
```

Make sure you have the following environment variables set in your `.env.local` file:
```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_KEY=your-service-role-key
```

## Troubleshooting

If you encounter the error "Could not find the 'fid' column of 'scheduled_casts' in the schema cache", make sure to apply the `06_add_fid_and_signer_to_scheduled_casts.sql` migration.

If you encounter the error "new row violates row-level security policy for table 'scheduled_casts'", make sure to apply the `07_update_rls_for_neynar.sql` migration.

After applying migrations, you may need to restart your application for the changes to take effect. 