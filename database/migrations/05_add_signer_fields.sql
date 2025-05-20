-- Migration: Add signer_public_key and delegated fields to users table
-- Description: Adding fields to support mnemonic-based signer registration and delegation

-- Add signer_public_key column for storing the public key of registered signers
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS signer_public_key TEXT;

-- Add delegated boolean column to track if the user has delegated the signer
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS delegated BOOLEAN DEFAULT FALSE;

-- Add comment to explain the fields
COMMENT ON COLUMN public.users.signer_public_key IS 'The public key of the mnemonic-derived signer for this user';
COMMENT ON COLUMN public.users.delegated IS 'Whether the user has delegated (approved) the signer via Warpcast';

-- Index for faster lookups on the delegated field (helps with filtering in cron job)
CREATE INDEX IF NOT EXISTS users_delegated_idx ON public.users (delegated); 