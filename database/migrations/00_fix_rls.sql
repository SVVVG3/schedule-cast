-- Drop existing policies first
DROP POLICY IF EXISTS "Users can view their own data" ON public.users;
DROP POLICY IF EXISTS "Users can update their own data" ON public.users;

-- Create more permissive policies for testing
CREATE POLICY "Allow all reads on users" ON public.users
  FOR SELECT USING (true);
  
CREATE POLICY "Allow all updates on users" ON public.users
  FOR UPDATE USING (true);
  
CREATE POLICY "Allow all inserts on users" ON public.users
  FOR INSERT WITH CHECK (true); 