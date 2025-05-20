-- Migration: Add fid and signer_uuid columns to scheduled_casts table
-- Description: Adding fields to support the new SIWN (Sign in with Neynar) authentication

-- Add fid column for storing the user's Farcaster ID
ALTER TABLE public.scheduled_casts 
ADD COLUMN IF NOT EXISTS fid INTEGER;

-- Add signer_uuid column for storing the user's Neynar signer UUID
ALTER TABLE public.scheduled_casts 
ADD COLUMN IF NOT EXISTS signer_uuid TEXT;

-- Add comments to explain the fields
COMMENT ON COLUMN public.scheduled_casts.fid IS 'The Farcaster ID of the user who created the cast';
COMMENT ON COLUMN public.scheduled_casts.signer_uuid IS 'The Neynar signer UUID for this user';

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS scheduled_casts_fid_idx ON public.scheduled_casts (fid);
CREATE INDEX IF NOT EXISTS scheduled_casts_signer_uuid_idx ON public.scheduled_casts (signer_uuid); 