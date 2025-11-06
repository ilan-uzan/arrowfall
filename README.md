# Arrowfall

A fast-paced local multiplayer archer brawler inspired by TowerFall Ascension. Battle with arrows, wall-jump, and dodge in pixel-perfect retro arenas.

## 🎮 Features

- **Local Multiplayer**: 2-4 players (keyboard + gamepad)
- **Survival Mode**: Single-player with NPCs (scripted behaviors)
- **Controller Support**: PS5, Xbox, 3rd party Bluetooth controllers
- **Physics**: Coyote time, jump buffering, wall-slide mechanics
- **Arrow Combat**: Limited arrows, pickup mechanics, wall embedding
- **Round System**: Best-of-5 rounds with match tracking
- **Leaderboard**: Match history stored in Supabase

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Create .env file
echo "SUPABASE_URL=https://bnkkcumuvzzkxofxdatz.supabase.co" > .env
echo "SUPABASE_KEY=your_key_here" >> .env
echo "PORT=3000" >> .env

# Start server
npm run dev

# Open http://localhost:3000
```

## 🎯 Controls (PS5 Controller Only)

### PS5 DualSense Controller
- **Left Stick** or **D-Pad** - Move
- **Cross (X)** - Jump
- **Square** or **R2** - Shoot
- **Options** - Pause / Join Game

### Menu Navigation
- **Left Stick** or **D-Pad** - Navigate
- **Cross (X)** - Select

## 📁 Project Structure

```
arrowfall/
├── server/
│   ├── index.js          # Express server & API
│   ├── db/db.js          # Supabase client
│   └── views/            # EJS templates
├── public/
│   ├── index.html        # Game page
│   ├── styles.css        # Global styles
│   └── game/
│       ├── engine.js     # Main game engine
│       ├── constants.js  # Visual Bible constants
│       ├── audio.js      # Web Audio API
│       ├── entities/     # Player, Arrow, NPC
│       ├── scenes/       # Title, Arena, Settings, etc.
│       ├── input/        # InputRouter (keyboard + gamepad)
│       └── world/        # Level system
└── README.md
```

## 🎨 Settings

Access Settings from the title screen to:
- View connected controllers (PS5/Xbox/3rd party Bluetooth)
- See keyboard controls
- See gamepad controls

## 🎮 Game Modes

### Local Multiplayer
1. Title Screen → "Play"
2. Character Select → 2-4 players join
3. Arena → Fight to 5 wins
4. Results → Match summary

### Survival Mode
1. Title Screen → "Survival"
2. Fight waves of NPCs
3. 3 lives, score tracking
4. Waves increase in difficulty

## 🛠️ Tech Stack

- **Backend**: Node.js, Express.js
- **Frontend**: HTML5 Canvas, JavaScript (ES6 modules)
- **Database**: Supabase (PostgreSQL)
- **Templating**: EJS
- **Audio**: Web Audio API

## 📝 API Endpoints

- `POST /api/match` - Save match result
- `GET /api/leaderboard` - Get match history
- `GET /leaderboard` - Leaderboard page

## 🎯 Development

```bash
npm run dev    # Development with nodemon
npm start      # Production server
```

## 📄 License

MIT

## 👤 Author

Built for hackathon by ilan-uzan
