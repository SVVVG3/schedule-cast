-- Migration: Migrate SIWF data from user_signers to users table
-- Description: Copy Frame SDK authentication data to consolidated users table

-- Update users table with SIWF data from user_signers
UPDATE public.users 
SET 
  siwf_message = us.siwf_message,
  siwf_signature = us.siwf_signature,
  siwf_expires_at = us.expires_at,
  siwf_is_active = us.is_active,
  updated_at = now()
FROM public.user_signers us 
WHERE users.fid = us.fid;

-- Verify the migration worked
-- (This is a comment for manual verification)
-- SELECT fid, username, siwf_message IS NOT NULL as has_siwf_data FROM users WHERE fid IN (SELECT DISTINCT fid FROM user_signers); 