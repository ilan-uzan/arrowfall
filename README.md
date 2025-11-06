# Arrowfall

A fast-paced local multiplayer archer brawler inspired by TowerFall Ascension. Controller-only browser game with Versus and Survival modes.

## 🎮 Features

- **Versus Mode**: 2-4 players local multiplayer (controller-only)
- **Survival Mode**: 1 player vs 2 NPC archers with escalating difficulty
- **Controller Support**: Xbox, PS5, generic XInput controllers
- **Physics**: Coyote time, jump buffering, wall-slide mechanics
- **Arrow Combat**: Limited arrows (3 start, 5 max), pickup mechanics, wall embedding
- **Round System**: Best-of-5 rounds (first to 3 wins)
- **Database**: Supabase integration for scores and survival runs

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Create .env file
echo "SUPABASE_URL=your_supabase_url" > .env
echo "SUPABASE_SERVICE_ROLE_KEY=your_service_key" >> .env
echo "PORT=3000" >> .env

# Start server
npm start

# Open http://localhost:3000
```

## 🎯 Controls (Controller-Only)

### Xbox / PS5 Controller
- **Left Stick** or **D-Pad** - Move
- **A / Cross (×)** - Jump
- **X / Square (☐)** or **RT / R2** - Shoot
- **Start / Options** - Pause / Join Game
- **LB / L1** or **RB / R1** - Change Color (in lobby)

### Menu Navigation
- **Left Stick** or **D-Pad** - Navigate
- **A / Cross (×)** - Select

## 📁 Project Structure

```
arrowfall/
├── server.js              # Express server
├── routes/
│   └── api.js             # API routes (scores, runs)
├── db/
│   └── supabase.js        # Supabase client
├── public/
│   ├── index.html         # Entry point
│   ├── styles.css         # Global styles
│   └── game/
│       ├── main.js        # Game boot + scene router
│       ├── scenes/         # Game scenes
│       │   ├── title.js
│       │   ├── modeSelect.js
│       │   ├── lobby.js
│       │   ├── versus.js
│       │   ├── survival.js
│       │   └── results.js
│       └── engine/
│           ├── loop.js    # Fixed timestep game loop
│           ├── world.js   # Arena (single map)
│           ├── physics.js # Movement & collision
│           ├── collisions.js
│           ├── render.js  # Rendering pipeline
│           ├── fx.js      # Particles, screen shake
│           ├── constants.js
│           ├── input/
│           │   ├── gamepad.js
│           │   └── router.js
│           └── entities/
│               ├── player.js
│               ├── arrow.js
│               └── npc.js
└── package.json
```

## 🎯 Game Rules

- **Arena**: Single TowerFall-style map (16×16 tiles, 320×180 logical)
- **Arrows**: Start with 3, max 5. Arrows stick in walls and can be picked up
- **Death**: Instant death by arrow hit or stomp
- **Double-KO**: If last two players die same frame, no one scores; replay round
- **Versus**: Best-of-5 (first to 3 wins)
- **Survival**: Fight waves of 2 NPCs; difficulty scales each wave

## 🗄️ Database (Supabase)

Tables created via Supabase MCP:
- `scores` - Versus and survival scores
- `survival_runs` - Survival mode runs (wave, duration)
- `profiles` - User profiles (optional)

## 🛠️ Tech Stack

- **Server**: Node.js + Express (ESM)
- **Frontend**: Plain JavaScript (ES6 modules)
- **Database**: Supabase (PostgreSQL)
- **Rendering**: Canvas 2D (pixel-perfect)
- **Input**: Browser Gamepad API

## 📝 API Endpoints

- `GET /api/health` - Health check
- `POST /api/score` - Save score (mode: 'versus' | 'survival', value: number)
- `POST /api/run` - Save survival run (wave, duration_seconds)

## 🎨 Visuals

- Pixel art style (3× scale, 320×180 logical resolution)
- Minimal palette (dark background + bright player colors)
- Draw order: BG → tiles → stuck arrows → NPCs → players → active arrows → particles → HUD
- Visual FX: particles, screen shake, hit flash (no audio)

## 🧪 Development

```bash
# Development mode (auto-reload)
npm run dev

# Production mode
npm start
```

## 📄 License

MIT
