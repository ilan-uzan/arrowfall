// Express server for Arrowfall
import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { initDatabase } from './db/supabase.js';
import { router as apiRouter } from './routes/api.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(join(__dirname, 'public')));
app.use('/api', apiRouter);

// Routes
app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'public', 'index.html'));
});

// Initialize database
initDatabase().catch(console.error);

// Start server
app.listen(PORT, () => {
  console.log(`Arrowfall server running on http://localhost:${PORT}`);
});

