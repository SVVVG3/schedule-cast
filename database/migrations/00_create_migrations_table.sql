-- Create a table to track applied migrations
CREATE TABLE IF NOT EXISTS public._migrations (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create a function to execute raw SQL (needed for migrations)
CREATE OR REPLACE FUNCTION public.exec(sql TEXT)
RETURNS VOID AS $$
BEGIN
  EXECUTE sql;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 