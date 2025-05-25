-- Migration: Drop redundant user tables after consolidation
-- Description: Remove user_signers and managed_signers tables since data is now in users table

-- Drop user_signers table (data migrated to users table)
DROP TABLE IF EXISTS public.user_signers CASCADE;

-- Drop managed_signers table (was empty, no data to migrate)  
DROP TABLE IF EXISTS public.managed_signers CASCADE;

-- Add comment documenting the consolidation
COMMENT ON TABLE public.users IS 'Consolidated user table containing profile data, SIWF credentials, and signer information. Replaces user_signers and managed_signers tables.'; 