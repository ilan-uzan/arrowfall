# Arrowfall

A 2-player local HTML5 Canvas arena game built for hackathon. Jump, dash, and fire arrows to KO your opponent in this TowerFall-inspired battle!

## Tech Stack

- **Backend**: Node.js, Express.js
- **Frontend**: HTML5 Canvas, JavaScript (ES6 modules), CSS
- **Templating**: EJS
- **Database**: Supabase (PostgreSQL)
- **Game Engine**: Custom Canvas-based engine

## Features

- 2-player local multiplayer (keyboard + gamepad support)
- Physics-based movement with coyote time and jump buffering
- Arrow combat system with pickup mechanics
- Stomp KO mechanics
- Best-of-5 rounds match system
- Leaderboard with match history
- Gamepad support (PS5/Xbox controllers)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/ilan-uzan/arrowfall.git
cd arrowfall
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env` file in the root directory:
```
SUPABASE_URL=https://bnkkcumuvzzkxofxdatz.supabase.co
SUPABASE_KEY=your_supabase_key_here
PORT=3000
```

4. Initialize the database:
The Supabase table has been created via MCP. The `matches` table is already set up in your Supabase database.

If you need to recreate it manually, run this SQL in your Supabase SQL editor:
```sql
CREATE TABLE IF NOT EXISTS matches (
  id SERIAL PRIMARY KEY,
  winner TEXT NOT NULL,
  loser TEXT NOT NULL,
  winner_kos INTEGER DEFAULT 0,
  loser_kos INTEGER DEFAULT 0,
  rounds_to_win INTEGER DEFAULT 5,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```


5. Start the development server:
```bash
npm run dev
```

6. Open your browser and navigate to:
```
http://localhost:3000
```

## Controls

### Player 1 (Keyboard)
- **A/D** - Move left/right
- **W** or **Space** - Jump
- **F** - Shoot arrow
- **E** - Pickup arrow
- **Esc** - Pause (future feature)

### Player 2 (Gamepad)
- **Left Stick** - Move
- **A/Cross** - Jump
- **X/Square** or **R2** - Shoot/Pickup
- **B/Circle** - Dash (future feature)
- **START/OPTIONS** - Join game (press when prompted)

### Player 2 (Keyboard Fallback)
- **Arrow Keys** - Move/Jump
- **/** - Shoot
- **.** - Pickup

## Gameplay

1. **Objective**: Be the first player to win 5 rounds
2. **Movement**: 
   - Jump with coyote time (allows jump shortly after leaving a platform)
   - Wall slide reduces fall speed when touching a wall
   - Smooth acceleration and friction-based movement
3. **Combat**:
   - Start each round with 3 arrows
   - Arrows embed in walls/floors and can be picked up
   - Maximum 5 arrows per player
   - Stomp attacks (falling fast on opponent's head) result in instant KO
4. **Round System**:
   - Best-of-5 rounds
   - First to 5 wins takes the match
   - Match point banner appears at 4 wins

## API Endpoints

### POST `/api/match`
Save a match result to the database.

**Request Body:**
```json
{
  "winner": "Player 1",
  "loser": "Player 2",
  "winner_kos": 0,
  "loser_kos": 0,
  "roundsToWin": 5
}
```

**Response:**
```json
{
  "ok": true,
  "match": { ... }
}
```

### GET `/api/leaderboard?limit=10`
Get recent match results.

**Response:**
```json
{
  "rows": [
    {
      "id": 1,
      "winner": "Player 1",
      "loser": "Player 2",
      "winner_kos": 5,
      "loser_kos": 3,
      "rounds_to_win": 5,
      "created_at": "2025-01-15T10:30:00Z"
    }
  ]
}
```

## Project Structure

```
arrowfall/
├── server/
│   ├── index.js              # Express server & API routes
│   ├── db/
│   │   └── db.js             # Supabase client
│   └── views/
│       ├── index.ejs         # Landing page
│       └── leaderboard.ejs   # Leaderboard page
├── public/
│   ├── index.html            # Game canvas page
│   ├── styles.css            # Global styles
│   └── game/
│       ├── main.js            # Game loop & state machine
│       ├── input.js           # Input manager
│       ├── gamepad.js         # Gamepad manager
│       ├── physics.js         # Physics utilities
│       ├── ui.js              # UI manager
│       ├── entities/
│       │   ├── player.js      # Player entity
│       │   └── arrow.js       # Arrow entity
│       └── world/
│           ├── level.js       # Level system
│           └── levels.json    # Level data
├── package.json
├── .env.example
└── README.md
```

## Two-Minute Demo Script

1. **Introduction** (10 seconds)
   - "Arrowfall is a 2-player local arena game built with Node.js, Express, and HTML5 Canvas. It's inspired by TowerFall and features arrow combat with physics-based movement."

2. **Landing Page** (15 seconds)
   - Open `http://localhost:3000`
   - Show landing page with controls explanation
   - Click "Play" button

3. **Gamepad Setup** (20 seconds)
   - Show join overlay for Player 2
   - Click "Add Controller" button
   - Press START/OPTIONS on gamepad to join
   - Demonstrate Player 1 moving with keyboard

4. **Gameplay** (45 seconds)
   - Play one quick round
   - Show jumping with coyote time
   - Demonstrate wall sliding
   - Fire arrows and show embedding
   - Pick up an embedded arrow
   - Perform a stomp KO or arrow KO
   - Show round transition and win banners

5. **Match End** (20 seconds)
   - Show match end modal after 5 wins
   - Enter player names
   - Click "Save Result"
   - Navigate to Leaderboard page

6. **Closing** (10 seconds)
   - "The game uses Supabase for persistence, has clean modular code, and supports both keyboard and gamepad input. Check out the GitHub repo for the full codebase."

## Development

### Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm run init:db` - Initialize database (prints SQL if needed)

### Code Style

- ES6 modules for game code
- Clean separation of concerns (entities, systems, UI)
- Commented code for complex logic
- Modular architecture for maintainability

## Notes

- Gamepad rumble may vary by browser/OS (Chrome recommended)
- The game runs at 60 FPS with fixed timestep physics
- Level design is simple 2-platform arenas (can be extended)
- Database schema is minimal (matches table only)

## Future Enhancements

- Multiple level selection
- Dash ability with cooldown
- Power-ups (shield, triple-shot, dash-refresh)
- Best-of-3 toggle option
- Wraparound screen edges
- Control rebinding UI
- Sound effects and music
- Particle effects for KO animations

## License

MIT

## Author

Built for hackathon at Developers Institute.

