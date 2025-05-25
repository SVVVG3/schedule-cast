-- Create user_signers table to store Frame SDK signIn credentials
CREATE TABLE user_signers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  fid INTEGER NOT NULL UNIQUE,
  siwf_message TEXT NOT NULL,
  siwf_signature TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true
);

-- Create scheduled_casts table
CREATE TABLE scheduled_casts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_fid INTEGER NOT NULL,
  cast_content TEXT NOT NULL,
  scheduled_time TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'posted', 'failed', 'cancelled')),
  cast_hash TEXT, -- Stores the hash of the posted cast
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (user_fid) REFERENCES user_signers(fid) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX idx_user_signers_fid ON user_signers(fid);
CREATE INDEX idx_user_signers_active ON user_signers(is_active) WHERE is_active = true;
CREATE INDEX idx_scheduled_casts_user_fid ON scheduled_casts(user_fid);
CREATE INDEX idx_scheduled_casts_scheduled_time ON scheduled_casts(scheduled_time);
CREATE INDEX idx_scheduled_casts_status ON scheduled_casts(status);
CREATE INDEX idx_scheduled_casts_due ON scheduled_casts(scheduled_time, status) WHERE status = 'pending';

-- Add RLS (Row Level Security) policies
ALTER TABLE user_signers ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_casts ENABLE ROW LEVEL SECURITY;

-- Users can only access their own signer data
CREATE POLICY "Users can view own signer data" ON user_signers
  FOR SELECT USING (true); -- We'll handle auth in API layer

CREATE POLICY "Users can insert own signer data" ON user_signers
  FOR INSERT WITH CHECK (true); -- We'll handle auth in API layer

CREATE POLICY "Users can update own signer data" ON user_signers
  FOR UPDATE USING (true); -- We'll handle auth in API layer

-- Users can only access their own scheduled casts
CREATE POLICY "Users can view own scheduled casts" ON scheduled_casts
  FOR SELECT USING (true); -- We'll handle auth in API layer

CREATE POLICY "Users can insert own scheduled casts" ON scheduled_casts
  FOR INSERT WITH CHECK (true); -- We'll handle auth in API layer

CREATE POLICY "Users can update own scheduled casts" ON scheduled_casts
  FOR UPDATE USING (true); -- We'll handle auth in API layer

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_user_signers_updated_at 
  BEFORE UPDATE ON user_signers 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scheduled_casts_updated_at 
  BEFORE UPDATE ON scheduled_casts 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 