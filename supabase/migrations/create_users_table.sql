-- Migration: Create missing users table
-- Description: Creating the users table that all API routes expect but is missing from current schema

-- Create users table to store Farcaster user data
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

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create policies for access (using service role for now, since we handle auth in API layer)
CREATE POLICY "Allow all operations on users" ON public.users
  FOR ALL USING (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS users_fid_idx ON public.users (fid);
CREATE INDEX IF NOT EXISTS users_username_idx ON public.users (username);
CREATE INDEX IF NOT EXISTS users_delegated_idx ON public.users (delegated);
CREATE INDEX IF NOT EXISTS users_signer_uuid_idx ON public.users (signer_uuid);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON public.users
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add comments to explain the table structure
COMMENT ON TABLE public.users IS 'Stores Farcaster user data and authentication information';
COMMENT ON COLUMN public.users.fid IS 'Farcaster ID - unique identifier for each user';
COMMENT ON COLUMN public.users.signer_uuid IS 'Neynar managed signer UUID for automated posting';
COMMENT ON COLUMN public.users.signer_public_key IS 'Public key of mnemonic-derived signer';
COMMENT ON COLUMN public.users.delegated IS 'Whether the user has approved the signer via Warpcast'; 