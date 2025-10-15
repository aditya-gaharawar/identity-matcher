import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Reference images table interface
export interface ReferenceImage {
  id: string;
  profile_id: number;
  image_cid: string;
  image_url: string;
  created_at: string;
}

// Identity verification records
export interface IdentityRecord {
  id: string;
  user_address: string;
  profile_id: number;
  hashed_url: string;
  ipfs_cid: string;
  match_score: number;
  verification_status: 'pending' | 'verified' | 'rejected';
  created_at: string;
}
