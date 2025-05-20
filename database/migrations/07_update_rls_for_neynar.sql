-- Migration: Update Row Level Security policies for SIWN authentication
-- Description: Modifying RLS policies to work with Sign In With Neynar authentication

-- First, drop the existing RLS policies
DROP POLICY IF EXISTS "Users can insert their own scheduled casts" ON public.scheduled_casts;
DROP POLICY IF EXISTS "Users can update their own scheduled casts" ON public.scheduled_casts;
DROP POLICY IF EXISTS "Users can delete their own scheduled casts" ON public.scheduled_casts;
DROP POLICY IF EXISTS "Users can view their own scheduled casts" ON public.scheduled_casts;

-- Create new policies that use fid instead of auth.uid()
-- Create policy to allow users to see only their own scheduled casts
CREATE POLICY "Users can view their own scheduled casts" ON public.scheduled_casts
  FOR SELECT USING (fid = (SELECT fid FROM public.users WHERE id = user_id));

-- Create policy to allow users to insert their own scheduled casts
CREATE POLICY "Users can insert their own scheduled casts" ON public.scheduled_casts
  FOR INSERT WITH CHECK (true); -- Temporarily allow all inserts (we'll validate in the API)

-- Create policy to allow users to update their own scheduled casts
CREATE POLICY "Users can update their own scheduled casts" ON public.scheduled_casts
  FOR UPDATE USING (fid = (SELECT fid FROM public.users WHERE id = user_id));

-- Create policy to allow users to delete their own scheduled casts
CREATE POLICY "Users can delete their own scheduled casts" ON public.scheduled_casts
  FOR DELETE USING (fid = (SELECT fid FROM public.users WHERE id = user_id)); 