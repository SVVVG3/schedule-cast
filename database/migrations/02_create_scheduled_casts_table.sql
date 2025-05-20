-- Create scheduled_casts table to store pending casts
CREATE TABLE IF NOT EXISTS public.scheduled_casts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  channel_id TEXT, -- Optional channel to post to
  posted BOOLEAN DEFAULT false,
  posted_at TIMESTAMP WITH TIME ZONE,
  error TEXT, -- Store any posting errors
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.scheduled_casts ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to see only their own scheduled casts
CREATE POLICY "Users can view their own scheduled casts" ON public.scheduled_casts
  FOR SELECT USING (auth.uid() = user_id);

-- Create policy to allow users to insert their own scheduled casts
CREATE POLICY "Users can insert their own scheduled casts" ON public.scheduled_casts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create policy to allow users to update their own scheduled casts
CREATE POLICY "Users can update their own scheduled casts" ON public.scheduled_casts
  FOR UPDATE USING (auth.uid() = user_id);

-- Create policy to allow users to delete their own scheduled casts
CREATE POLICY "Users can delete their own scheduled casts" ON public.scheduled_casts
  FOR DELETE USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE TRIGGER update_scheduled_casts_updated_at
BEFORE UPDATE ON public.scheduled_casts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column(); 