-- Migration: Create missing users table (SAFE VERSION)
-- Description: Creating the users table with IF NOT EXISTS checks to handle partial applications

-- Create users table to store Farcaster user data (only if it doesn't exist)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fid INTEGER UNIQUE NOT NULL, -- Farcaster ID
  username TEXT, -- Farcaster username
  display_name TEXT, -- Farcaster display name
  custody_address TEXT, -- Ethereum wallet address
  avatar TEXT, -- Avatar URL
  signer_uuid TEXT, -- Signer UUID for Neynar API
  signer_public_key TEXT, -- Public key of registered signers
  delegated BOOLEAN DEFAULT FALSE, -- Whether user has delegated signer
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable Row Level Security (only if not already enabled)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists, then create new one
DROP POLICY IF EXISTS "Allow all operations on users" ON public.users;
CREATE POLICY "Allow all operations on users" ON public.users
  FOR ALL USING (true);

-- Create indexes for performance (only if they don't exist)
CREATE INDEX IF NOT EXISTS users_fid_idx ON public.users (fid);
CREATE INDEX IF NOT EXISTS users_username_idx ON public.users (username);
CREATE INDEX IF NOT EXISTS users_delegated_idx ON public.users (delegated);
CREATE INDEX IF NOT EXISTS users_signer_uuid_idx ON public.users (signer_uuid);

-- Create updated_at trigger function (replace if exists)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists, then create new one
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON public.users
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add comments to explain the table structure
COMMENT ON TABLE public.users IS 'Stores Farcaster user data and authentication information';
COMMENT ON COLUMN public.users.fid IS 'Farcaster ID - unique identifier for each user';
COMMENT ON COLUMN public.users.signer_uuid IS 'Neynar managed signer UUID for automated posting';
COMMENT ON COLUMN public.users.signer_public_key IS 'Public key of mnemonic-derived signer';
COMMENT ON COLUMN public.users.delegated IS 'Whether the user has approved the signer via Warpcast'; 