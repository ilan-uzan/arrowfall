const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://bnkkcumuvzzkxofxdatz.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJua2tjdW11dnp6a3hvZnhkYXR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyNjQ0NDUsImV4cCI6MjA3Nzg0MDQ0NX0.pWVKbxVcog3p1tqNZk_3ZIzLxbbLBQk1Ny-W6q28dQo';

const supabase = createClient(supabaseUrl, supabaseKey);

// Initialize database schema
async function initDatabase() {
  try {
    // Check if table exists by trying to query it
    const { error } = await supabase
      .from('matches')
      .select('id')
      .limit(1);

    if (error && error.code === '42P01') {
      // Table doesn't exist, need to create it via SQL
      console.log('Matches table does not exist. Please create it via Supabase dashboard or SQL editor.');
      console.log('SQL to run:');
      console.log(`
CREATE TABLE IF NOT EXISTS matches (
  id SERIAL PRIMARY KEY,
  winner TEXT NOT NULL,
  loser TEXT NOT NULL,
  winner_kos INTEGER DEFAULT 0,
  loser_kos INTEGER DEFAULT 0,
  rounds_to_win INTEGER DEFAULT 5,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
      `);
    } else {
      console.log('Database initialized successfully');
    }
  } catch (err) {
    console.error('Database initialization error:', err);
  }
}

async function saveMatch(matchData) {
  const { winner, loser, winner_kos = 0, loser_kos = 0, rounds_to_win = 5 } = matchData;

  const { data, error } = await supabase
    .from('matches')
    .insert([
      {
        winner: winner.trim().substring(0, 32),
        loser: loser.trim().substring(0, 32),
        winner_kos,
        loser_kos,
        rounds_to_win
      }
    ])
    .select();

  if (error) {
    throw new Error(`Failed to save match: ${error.message}`);
  }

  return data[0];
}

async function getLeaderboard(limit = 20) {
  const { data, error } = await supabase
    .from('matches')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to fetch leaderboard: ${error.message}`);
  }

  return data || [];
}

module.exports = {
  supabase,
  initDatabase,
  saveMatch,
  getLeaderboard
};

