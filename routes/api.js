// API Routes
import express from 'express';
import { supabase } from '../db/supabase.js';

export const router = express.Router();

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Save score (versus or survival)
router.post('/score', async (req, res) => {
  try {
    const { user_id, mode, value } = req.body;
    
    if (!mode || typeof value !== 'number') {
      return res.status(400).json({ error: 'mode and value are required' });
    }
    
    if (!['versus', 'survival'].includes(mode)) {
      return res.status(400).json({ error: 'mode must be "versus" or "survival"' });
    }
    
    if (!supabase) {
      return res.json({ ok: true, message: 'Database not configured' });
    }
    
    const { data, error } = await supabase
      .from('scores')
      .insert({ user_id, mode, value })
      .select()
      .single();
    
    if (error) {
      console.error('Error saving score:', error);
      return res.status(500).json({ error: 'Failed to save score' });
    }
    
    res.json({ ok: true, data });
  } catch (error) {
    console.error('Error in /api/score:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Save survival run
router.post('/run', async (req, res) => {
  try {
    const { user_id, wave, duration_seconds } = req.body;
    
    if (!wave || !duration_seconds) {
      return res.status(400).json({ error: 'wave and duration_seconds are required' });
    }
    
    if (!supabase) {
      return res.json({ ok: true, message: 'Database not configured' });
    }
    
    const { data, error } = await supabase
      .from('survival_runs')
      .insert({ user_id, wave, duration_seconds })
      .select()
      .single();
    
    if (error) {
      console.error('Error saving run:', error);
      return res.status(500).json({ error: 'Failed to save run' });
    }
    
    res.json({ ok: true, data });
  } catch (error) {
    console.error('Error in /api/run:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

