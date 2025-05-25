-- Migration: Add SIWF credential columns to users table
-- Description: Adding columns needed to store Frame SDK authentication data

-- Add SIWF credential columns to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS siwf_message TEXT,
ADD COLUMN IF NOT EXISTS siwf_signature TEXT,
ADD COLUMN IF NOT EXISTS siwf_expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS siwf_is_active BOOLEAN DEFAULT FALSE;

-- Add missing columns that API routes expect
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS signer_status TEXT,
ADD COLUMN IF NOT EXISTS signer_approval_url TEXT,
ADD COLUMN IF NOT EXISTS needs_signer_approval BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS last_signer_check TIMESTAMP WITH TIME ZONE;

-- Add helpful comment
COMMENT ON COLUMN public.users.siwf_message IS 'Sign-In With Farcaster message from Frame SDK';
COMMENT ON COLUMN public.users.siwf_signature IS 'Sign-In With Farcaster signature from Frame SDK';
COMMENT ON COLUMN public.users.siwf_expires_at IS 'When the SIWF credentials expire';
COMMENT ON COLUMN public.users.siwf_is_active IS 'Whether the SIWF credentials are currently active'; 