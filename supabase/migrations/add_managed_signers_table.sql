-- Create managed_signers table to store Neynar managed signer credentials
-- This is separate from user_signers which stores SIWF authentication data
CREATE TABLE managed_signers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  fid INTEGER NOT NULL,
  signer_uuid TEXT NOT NULL UNIQUE,
  public_key TEXT,
  signer_approval_url TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'revoked')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  approved_at TIMESTAMP WITH TIME ZONE,
  FOREIGN KEY (fid) REFERENCES user_signers(fid) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX idx_managed_signers_fid ON managed_signers(fid);
CREATE INDEX idx_managed_signers_uuid ON managed_signers(signer_uuid);
CREATE INDEX idx_managed_signers_status ON managed_signers(status);
CREATE INDEX idx_managed_signers_approved ON managed_signers(fid, status) WHERE status = 'approved';

-- Add RLS (Row Level Security) policies
ALTER TABLE managed_signers ENABLE ROW LEVEL SECURITY;

-- Users can only access their own managed signer data
CREATE POLICY "Users can view own managed signer data" ON managed_signers
  FOR SELECT USING (true); -- We'll handle auth in API layer

CREATE POLICY "Users can insert own managed signer data" ON managed_signers  
  FOR INSERT WITH CHECK (true); -- We'll handle auth in API layer

CREATE POLICY "Users can update own managed signer data" ON managed_signers
  FOR UPDATE USING (true); -- We'll handle auth in API layer

-- Create trigger for updated_at
CREATE TRIGGER update_managed_signers_updated_at 
  BEFORE UPDATE ON managed_signers 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update scheduled_casts table to optionally reference managed signer
-- Add column for managed signer UUID (optional - for tracking which signer was used)
ALTER TABLE scheduled_casts ADD COLUMN managed_signer_uuid TEXT REFERENCES managed_signers(signer_uuid) ON DELETE SET NULL; 