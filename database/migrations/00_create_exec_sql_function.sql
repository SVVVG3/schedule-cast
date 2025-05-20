-- Create exec_sql function to allow running arbitrary SQL
-- This is used by our migration script

CREATE OR REPLACE FUNCTION public.exec_sql(query text)
RETURNS void AS $$
BEGIN
  EXECUTE query;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 