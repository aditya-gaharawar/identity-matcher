-- Reference Images Table
CREATE TABLE IF NOT EXISTS reference_images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id INTEGER NOT NULL,
  image_cid VARCHAR(255) NOT NULL UNIQUE,
  image_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMESTAMP 'now',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMESTAMP 'now'
);

-- Identity Records Table
CREATE TABLE IF NOT EXISTS identity_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_address VARCHAR(42) NOT NULL,
  profile_id INTEGER,
  hashed_url VARCHAR(255) NOT NULL,
  ipfs_cid VARCHAR(255) NOT NULL,
  match_score INTEGER CHECK (match_score >= 0 AND match_score <= 100),
  verification_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMESTAMP 'now',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMESTAMP 'now'
);

-- Verification Requests Table (for audit trail)
CREATE TABLE IF NOT EXISTS verification_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_address VARCHAR(42) NOT NULL,
  ipfs_cid VARCHAR(255) NOT NULL,
  verification_status VARCHAR(20) NOT NULL DEFAULT 'pending',
  match_score INTEGER CHECK (match_score >= 0 AND match_score <= 100),
  matched_profile_id INTEGER,
  ai_analysis TEXT,
  blockchain_tx_hash VARCHAR(66),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMESTAMP 'now',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMESTAMP 'now'
);

--- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_reference_images_profile_id ON reference_images(profile_id);
CREATE INDEX IF NOT EXISTS idx_identity_records_user_address ON identity_records(user_address);
CREATE INDEX IF NOT EXISTS idx_identity_records_hashed_url ON identity_records(hashed_url);
CREATE INDEX IF NOT EXISTS idx_verification_requests_user_address ON verification_requests(user_address);

-- Row Level Security (RLS) Policies
ALTER TABLE reference_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE identity_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_requests ENABLE ROW LEVEL SECURITY;

-- Policy for reference_images - only insertable by service_role, readable by all
CREATE POLICY "Reference images are viewable by everyone" ON reference_images
  FOR SELECT USING (true);

CREATE POLICY "Only service role can insert reference images" ON reference_images
  FOR INSERT WITH CHECK (current_setting('app.config.role') = 'service_role');

CREATE POLICY "Only service role can update reference images" ON reference_images
  FOR UPDATE USING (current_setting('app.config.role') = 'service_role');

CREATE POLICY "Only service role can delete reference images" ON reference_images
  FOR DELETE USING (current_setting('app.config.role') = 'service_role');

-- Policy for identity_records - users can read their own records
CREATE POLICY "Users can view own identity records" ON identity_records
  FOR SELECT USING (user_address = current_setting('app.current_user_address', true)::text);

CREATE POLICY "Public can insert identity records" ON identity_records
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update own identity records" ON identity_records
  FOR UPDATE USING (user_address = current_setting('app.current_user_address', true)::text);

-- Policy for verification_requests - users can read their own requests
CREATE POLICY "Users can view own verification requests" ON verification_requests
  FOR SELECT USING (user_address = current_setting('app.current_user_address', true)::text);

CREATE POLICY "Public can insert verification requests" ON verification_requests
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update own verification requests" ON verification_requests
  FOR UPDATE USING (user_address = current_setting('app.current_user_address', true)::text);

-- Updated at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMESTAMP 'now';
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_reference_images_updated_at BEFORE UPDATE ON reference_images
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_identity_records_updated_at BEFORE UPDATE ON identity_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_verification_requests_updated_at BEFORE UPDATE ON verification_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
