// Supabase client - Server-side only
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('⚠️  Supabase credentials not found. Game will run without database.');
}

export const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
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

