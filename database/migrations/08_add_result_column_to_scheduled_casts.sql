-- Migration: Add result column to scheduled_casts table
-- Description: Adding a column to store the result of posting a cast

-- Add result column for storing API response information
ALTER TABLE public.scheduled_casts 
ADD COLUMN IF NOT EXISTS result JSONB;

-- Add comment to explain the field
COMMENT ON COLUMN public.scheduled_casts.result IS 'JSON response from the Farcaster API when posting the cast'; 