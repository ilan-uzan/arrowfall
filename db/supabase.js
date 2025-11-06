// Supabase client - Server-side only
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

// Use service role key if available, otherwise fall back to anon key
const supabaseKey = supabaseServiceKey || supabaseAnonKey;

if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️  Supabase credentials not found. Game will run without database.');
  console.warn('   Please set SUPABASE_URL and SUPABASE_ANON_KEY (or SUPABASE_SERVICE_ROLE_KEY) in .env file');
}

export const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null;

// Initialize database (call MCP to create tables)
export async function initDatabase() {
  if (!supabase) {
    console.log('⚠️  Database not configured - running without persistence');
    return;
  }
  
  console.log('✅ Supabase client initialized');
  // Note: Schema creation is handled via Supabase MCP
  // Tables will be created through MCP calls, not here
}

