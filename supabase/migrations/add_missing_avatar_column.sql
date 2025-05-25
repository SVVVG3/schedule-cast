-- Migration: Add missing avatar column to users table
-- Description: Adding the avatar column that the API routes expect

-- Add avatar column to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS avatar TEXT;

-- Add helpful comment
COMMENT ON COLUMN public.users.avatar IS 'User profile picture URL from Farcaster'; 