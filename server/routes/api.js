const express = require('express');
const router = express.Router();
const { saveMatch, getLeaderboard } = require('../db');

router.post('/match', async (req, res) => {
  try {
    const { winner, loser, winner_kos, loser_kos, roundsToWin } = req.body;

    if (!winner || !loser || typeof winner !== 'string' || typeof loser !== 'string') {
      return res.status(400).json({ error: 'Winner and loser names are required' });
    }

    if (winner.trim().length === 0 || loser.trim().length === 0) {
      return res.status(400).json({ error: 'Winner and loser names cannot be empty' });
    }

    const match = await saveMatch({
      winner: winner.trim(),
      loser: loser.trim(),
      winner_kos: parseInt(winner_kos) || 0,
      loser_kos: parseInt(loser_kos) || 0,
      rounds_to_win: parseInt(roundsToWin) || 5
    });

    res.json({ ok: true, match });
  } catch (error) {
    console.error('Error saving match:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/leaderboard', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const matches = await getLeaderboard(limit);
    res.json({ rows: matches });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

