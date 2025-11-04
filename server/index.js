// Express server for Arrowfall
const express = require('express');
const path = require('path');
const { initDatabase, saveMatch, getLeaderboard } = require('./db/db');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Routes
app.get('/', (req, res) => {
  res.render('index');
});

app.get('/leaderboard', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const rows = await getLeaderboard(limit);
    res.render('leaderboard', { matches: rows });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.render('leaderboard', { matches: [], error: 'Failed to load leaderboard' });
  }
});

// API Routes
app.post('/api/match', async (req, res) => {
  try {
    const { winner, loser, winner_kos = 0, loser_kos = 0, roundsToWin = 5 } = req.body;
    
    if (!winner || !loser) {
      return res.status(400).json({ error: 'Winner and loser names are required' });
    }

    const matchData = {
      winner: winner.trim().substring(0, 32),
      loser: loser.trim().substring(0, 32),
      winner_kos: parseInt(winner_kos) || 0,
      loser_kos: parseInt(loser_kos) || 0,
      rounds_to_win: parseInt(roundsToWin) || 5
    };

    const result = await saveMatch(matchData);
    res.json({ ok: true, match: result });
  } catch (error) {
    console.error('Error saving match:', error);
    res.status(500).json({ error: 'Failed to save match' });
  }
});

app.get('/api/leaderboard', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const rows = await getLeaderboard(limit);
    res.json({ rows });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// Initialize database
initDatabase().catch(console.error);

// Start server
app.listen(PORT, () => {
  console.log(`Arrowfall server running on http://localhost:${PORT}`);
});

