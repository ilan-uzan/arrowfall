# Arrowfall

A 2-player local HTML5 Canvas arena game built for hackathon. Jump, dash, and fire arrows to KO your opponent in this TowerFall-inspired battle!

## Tech Stack

- **Backend**: Node.js, Express.js
- **Frontend**: HTML5 Canvas, JavaScript (ES6 modules), CSS
- **Templating**: EJS
- **Database**: Supabase (PostgreSQL)
- **Game Engine**: Custom Canvas-based engine

## Features

- **Local Multiplayer**: 2-4 players (keyboard + gamepad support)
- **Survival Mode**: Single-player mode with NPCs
- **Physics**: Coyote time, jump buffering, wall-slide
- **Arrow Combat**: Limited arrows, pickup mechanics, wall embedding
- **Round System**: Best-of-5 rounds with match tracking
- **Leaderboard**: Match history stored in Supabase
- **NPCs**: Scripted enemies with classic game design (no AI)

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
│   ├── index.html             # Game canvas page
│   ├── styles.css             # Global styles
│   └── game/
│       ├── engine.js           # Main game engine
│       ├── constants.js        # Game constants & Visual Bible
│       ├── audio.js            # Web Audio API manager
│       ├── entities/
│       │   ├── Player.js      # Player entity
│       │   ├── Arrow.js       # Arrow entity
│       │   └── NPC.js          # NPC entity (scripted)
│       ├── scenes/
│       │   ├── SceneManager.js      # Scene system
│       │   ├── TitleScene.js        # Title screen
│       │   ├── CharacterSelectScene.js  # Character select
│       │   ├── ArenaScene.js         # Multiplayer arena
│       │   ├── SurvivalScene.js     # Single-player survival
│       │   └── ResultsScene.js       # Match results
│       ├── input/
│       │   └── InputRouter.js # Unified keyboard + gamepad
│       └── world/
│           ├── level.js       # Level system
│           └── levels.json    # Level data
├── package.json
└── README.md
```

## Game Modes

### Local Multiplayer
- Title Screen → "Play" → Character Select
- 2-4 players can join (keyboard + gamepad)
- Best-of-5 rounds match system
- First to 5 wins takes the match

### Survival Mode
- Title Screen → "Survival" → Single-player
- Fight waves of NPCs
- 3 lives, score tracking
- Waves increase in difficulty
- NPCs use scripted behaviors (classic game design)

## Development

### Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon

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

