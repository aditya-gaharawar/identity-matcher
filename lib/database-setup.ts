import { supabase } from './supabase';

// SQL statements converted to Supabase operations
export async function setupDatabase() {
  try {
    console.log('Setting up database...');

    // Try to create tables one by one
    const tables = [
      {
        name: 'reference_images',
        sql: `
          CREATE TABLE IF NOT EXISTS reference_images (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            profile_id INTEGER NOT NULL,
            image_cid VARCHAR(255) NOT NULL UNIQUE,
            image_url TEXT NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMESTAMP 'now',
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMESTAMP 'now'
          )
        `
      },
      {
        name: 'identity_records',
        sql: `
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
          )
        `
      },
      {
        name: 'verification_requests',
        sql: `
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
          )
        `
      }
    ];

    for (const table of tables) {
      try {
        const { error } = await supabase.rpc('exec', { sql: table.sql });
        if (error) {
          console.log(`Table ${table.name} might already exist or error:`, error.message);
        } else {
          console.log(`✅ Created table: ${table.name}`);
        }
      } catch (e) {
        console.log(`⚠️ Table ${table.name} setup skipped (likely exists)`);
      }
    }

    // Test a simple query to see if tables exist
    try {
      const { data, error } = await supabase.from('reference_images').select('count(*)');
      if (error) {
        console.error('❌ Database not properly set up:', error.message);
        return false;
      }
      console.log('✅ Database tables are ready!');
      return true;
    } catch (e) {
      console.error('❌ Database connection error:', e);
      return false;
    }

  } catch (error) {
    console.error('❌ Database setup failed:', error);
    return false;
  }
}
