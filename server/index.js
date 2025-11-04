const express = require('express');
const path = require('path');
const { initDatabase, saveMatch, getLeaderboard } = require('./db/db');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// EJS setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Routes
app.get('/', (req, res) => {
  res.render('index');
});

app.get('/leaderboard', async (req, res) => {
  try {
    const matches = await getLeaderboard(20);
    res.render('leaderboard', { matches });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.render('leaderboard', { matches: [], error: error.message });
  }
});

// API Routes
app.post('/api/match', async (req, res) => {
  try {
    const { winner, loser, winner_kos, loser_kos, roundsToWin } = req.body;

    // Validation
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

app.get('/api/leaderboard', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const matches = await getLeaderboard(limit);
    res.json({ rows: matches });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: error.message });
  }
});

// Initialize database on startup
initDatabase().catch(console.error);

app.listen(PORT, () => {
  console.log(`Arrowfall server running on http://localhost:${PORT}`);
});

