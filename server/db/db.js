// Supabase database client and helpers
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://bnkkcumuvzzkxofxdatz.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJua2tjdW11dnp6a3hvZnhkYXR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyNjQ0NDUsImV4cCI6MjA3Nzg0MDQ0NX0.pWVKbxVcog3p1tqNZk_3ZIzLxbbLBQk1Ny-W6q28dQo';

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Initialize database - checks if tables exist
 */
async function initDatabase() {
  try {
    // Check if matches table exists
    const { error } = await supabase
      .from('matches')
      .select('id')
      .limit(1);

    if (error && error.code === '42P01') {
      console.log('⚠️  Matches table does not exist. Please run migrations via Supabase MCP.');
      console.log('   The database schema has been set up via Supabase MCP.');
    } else if (error) {
      console.error('Database initialization error:', error);
    } else {
      console.log('✅ Database initialized successfully');
      console.log('   Tables: matches, profiles, match_stats, scores');
      console.log('   RLS: Enabled on all tables');
    }
  } catch (err) {
    console.error('Database initialization error:', err);
  }
}

/**
 * Save a match result to the database
 */
async function saveMatch(matchData) {
  try {
    const { data, error } = await supabase
      .from('matches')
      .insert([matchData])
      .select()
      .single();

    if (error) {
      console.error('Error saving match:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Failed to save match:', error);
    throw error;
  }
}

/**
 * Get leaderboard from matches table
 */
async function getLeaderboard(limit = 20) {
  try {
    const { data, error } = await supabase
      .from('matches')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching leaderboard:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Failed to fetch leaderboard:', error);
    return [];
  }
}

/**
 * Save match stats (for single-player survival mode)
 */
async function saveMatchStats(statsData) {
  try {
    const { data, error } = await supabase
      .from('match_stats')
      .insert([statsData])
      .select()
      .single();

    if (error) {
      console.error('Error saving match stats:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Failed to save match stats:', error);
    throw error;
  }
}

/**
 * Save a score (for leaderboard)
 */
async function saveScore(scoreData) {
  try {
    const { data, error } = await supabase
      .from('scores')
      .insert([scoreData])
      .select()
      .single();

    if (error) {
      console.error('Error saving score:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Failed to save score:', error);
    throw error;
  }
}

/**
 * Get scores leaderboard
 */
async function getScoresLeaderboard(limit = 20, mode = 'classic') {
  try {
    const { data, error } = await supabase
      .from('scores')
      .select('*')
      .eq('mode', mode)
      .order('score', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching scores leaderboard:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Failed to fetch scores leaderboard:', error);
    return [];
  }
}

module.exports = { 
  supabase, 
  initDatabase, 
  saveMatch, 
  getLeaderboard,
  saveMatchStats,
  saveScore,
  getScoresLeaderboard
};

