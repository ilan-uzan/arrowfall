# 🏹 Arrowfall
## Hackathon Presentation - Developers Institute
### By Ilan Uzan

---

## 🎮 Game Overview

**Arrowfall** is a fast-paced local multiplayer archer brawler inspired by TowerFall Ascension. Built entirely for browser play with game controller support, it features tight platforming mechanics, strategic arrow combat, and a unique toroidal (wrapping) arena system.

### Core Concept
- **Genre**: 2D Arena Brawler
- **Players**: 2-4 local multiplayer (Versus) or 1 player vs AI (Survival)
- **Style**: Pixel-art retro aesthetic with modern web technologies
- **Unique Feature**: Toroidal world - players and projectiles wrap seamlessly across screen edges

---

## 🎯 Game Modes

### Versus Mode
- **2-4 Players** local multiplayer
- **Best-of-5** rounds (first to 3 wins)
- **Instant Death** - one hit eliminates a player
- **Double-KO Rule** - if last two players die simultaneously, round replays
- **Controller-Only** - no keyboard support, pure gamepad experience

### Survival Mode
- **1 Player** vs **2 NPC Archers**
- **Wave-Based** difficulty scaling
- **Escalating Challenge** - NPCs get faster, more accurate, and react quicker each wave
- **Score Tracking** - highest wave reached saved to database

---

## 🛠️ Technical Architecture

### Tech Stack

**Backend:**
- **Node.js** + **Express** (ESM modules)
- **Supabase** (PostgreSQL) for persistent data
- **RESTful API** for score tracking

**Frontend:**
- **Vanilla JavaScript** (ES6 modules) - no frameworks
- **HTML5 Canvas 2D** for pixel-perfect rendering
- **Browser Gamepad API** for controller input
- **Fixed Timestep Physics** (120 FPS update loop)

**Database:**
- **Supabase** tables: `scores`, `survival_runs`, `profiles`
- **Row Level Security (RLS)** policies for data access
- **MCP Integration** for schema management

---

## 🎨 Key Technical Features

### 1. Fixed Timestep Physics Engine
- **120 FPS** update loop for consistent physics
- **Interpolated rendering** for smooth visuals at any framerate
- **Coyote time** (80ms) and **jump buffering** (100ms) for responsive controls
- **Wall-slide** and **wall-jump** mechanics

### 2. Toroidal World System
- **Seamless wrapping** - entities crossing screen edges reappear on opposite side
- **Ghost rendering** - entities near edges render copies to prevent visual popping
- **Wrapped collision detection** - collisions work correctly across boundaries
- **Arrows maintain trajectory** when wrapping

### 3. Controller Input System
- **Multi-controller support** - up to 4 gamepads simultaneously
- **Hot-plug detection** - controllers can connect/disconnect during gameplay
- **Deadzone scaling** - smooth analog stick control with proper deadzone handling
- **Universal mapping** - Xbox, PS5, and generic XInput controllers work identically
- **Single-frame press detection** - prevents input spam in menus

### 4. AI System (Survival Mode)
- **Finite State Machine** - NPCs cycle through: Patrol → Aim → Shoot → Evade → Retrieve
- **Line-of-sight detection** - NPCs only shoot when player is visible
- **Dynamic difficulty** - reaction time, aim accuracy, and speed scale with wave number
- **Independent behavior** - each NPC has unique patrol patterns and decision-making

### 5. Collision System
- **AABB (Axis-Aligned Bounding Box)** collision detection
- **One-axis-at-a-time** resolution to prevent tunneling
- **Stomp detection** - players can eliminate enemies by falling on them
- **Arrow embedding** - arrows stick in walls and can be picked up

---

## 🎮 Game Mechanics

### Movement
- **Horizontal acceleration** with air/ground friction differences
- **Wall-sliding** - slower fall speed when holding against a wall
- **Wall-jumping** - jump off walls for advanced movement
- **Coyote time** - brief window to jump after leaving a platform
- **Jump buffering** - press jump slightly early, it executes when landing

### Combat
- **Limited arrows** - start with 3, max 5
- **Arrow pickup** - collect missed arrows from walls
- **Instant death** - one arrow hit or stomp eliminates player
- **Stomp kills** - fall on enemies from above to eliminate them

### Arena
- **Single map** - TowerFall-style layout with platforms and ledges
- **16×16 pixel tiles** - pixel-perfect collision
- **320×180 logical resolution** - displayed at 3× scale (960×540)
- **Toroidal wrapping** - seamless edge wrapping for infinite arena feel

---

## 📊 Database Schema

### Tables (Supabase)

**`scores`**
- `id` (uuid, primary key)
- `mode` (text: 'versus' | 'survival')
- `value` (integer: score/wave number)
- `created_at` (timestamp)

**`survival_runs`**
- `id` (uuid, primary key)
- `wave` (integer: highest wave reached)
- `duration_seconds` (integer: time survived)
- `created_at` (timestamp)

**`profiles`** (optional)
- `id` (uuid, primary key)
- `username` (text)
- `created_at` (timestamp)

---

## 🚀 Project Structure

```
arrowfall/
├── server.js                 # Express server entry point
├── routes/
│   └── api.js                # REST API endpoints
├── db/
│   └── supabase.js           # Supabase client initialization
├── public/
│   ├── index.html            # Game entry point
│   ├── styles.css            # Global styles
│   └── game/
│       ├── main.js            # Game boot + scene management
│       ├── config/
│       │   └── LevelConfig.js # World dimensions & wrap settings
│       ├── scenes/            # Game state scenes
│       │   ├── title.js       # Main menu
│       │   ├── modeSelect.js  # Mode selection
│       │   ├── lobby.js       # Player join screen
│       │   ├── versus.js      # Multiplayer mode
│       │   ├── survival.js    # Single-player mode
│       │   └── results.js     # Match results
│       └── engine/
│           ├── loop.js        # Fixed timestep game loop
│           ├── world.js       # Arena layout & collision
│           ├── physics.js     # Movement & gravity
│           ├── collisions.js  # AABB collision detection
│           ├── render.js     # Canvas rendering pipeline
│           ├── fx.js          # Particles & screen effects
│           ├── wrap.js        # Toroidal wrapping utilities
│           ├── constants.js   # Game constants
│           ├── input/
│           │   ├── gamepad.js # Gamepad API wrapper
│           │   └── router.js  # Input routing & mapping
│           └── entities/
│               ├── player.js  # Player entity
│               ├── arrow.js   # Arrow projectile
│               └── npc.js     # NPC AI entity
└── package.json
```

---

## 🎯 Technical Challenges & Solutions

### Challenge 1: Fixed Timestep Physics
**Problem**: Variable framerate causes inconsistent physics behavior  
**Solution**: Implemented accumulator-based fixed timestep loop (120 FPS) with interpolated rendering

### Challenge 2: Toroidal World Wrapping
**Problem**: Seamless edge wrapping without visual popping or collision bugs  
**Solution**: 
- Modulo-based position wrapping
- Ghost rendering for entities near edges
- Wrapped collision detection checking ghost positions

### Challenge 3: Controller Input Handling
**Problem**: Different controllers (Xbox, PS5) have different button mappings  
**Solution**: Unified input router with deadzone scaling and universal button mapping

### Challenge 4: Independent NPC AI
**Problem**: NPCs were moving identically, not independently  
**Solution**: ID-based patrol direction initialization and randomized evade behavior

### Challenge 5: Ground Movement
**Problem**: Players couldn't move on ground without jumping  
**Solution**: Proper ground state initialization and physics update order

---

## 🎮 Controls

### Xbox / PS5 Controller
- **Left Stick** or **D-Pad** → Move
- **A / Cross (×)** → Jump
- **X / Square (☐)** or **RT / R2** → Shoot Arrow
- **Start / Options** → Pause / Join Game
- **LB / L1** or **RB / R1** → Change Color (lobby)

### Menu Navigation
- **Left Stick** or **D-Pad** → Navigate
- **A / Cross (×)** → Select

---

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Create .env file with Supabase credentials
echo "SUPABASE_URL=your_supabase_url" > .env
echo "SUPABASE_SERVICE_ROLE_KEY=your_service_key" >> .env
echo "PORT=3000" >> .env

# Start server
npm start

# Open http://localhost:3000
# Connect game controllers and press A/× to join!
```

---

## 📈 Performance

- **Target**: 60 FPS rendering
- **Physics**: 120 FPS fixed timestep updates
- **Rendering**: Canvas 2D with pixel-perfect scaling
- **Input**: Polled every frame for responsive controls
- **No external dependencies** beyond Express and Supabase client

---

## 🎨 Visual Design

- **Resolution**: 320×180 logical (960×540 displayed at 3× scale)
- **Style**: Pixel-art retro aesthetic
- **Palette**: Dark backgrounds with bright player colors
- **Effects**: Particle systems, screen shake, hit flash
- **No audio** - visual feedback only

---

## 🏆 Features Implemented

✅ **Fixed timestep physics** (120 FPS)  
✅ **Toroidal world wrapping**  
✅ **Multi-controller support** (Xbox, PS5, generic)  
✅ **Versus mode** (2-4 players)  
✅ **Survival mode** (1P vs 2 NPCs)  
✅ **AI system** with state machine  
✅ **Stomp mechanics**  
✅ **Arrow pickup system**  
✅ **Round/match system**  
✅ **Supabase integration**  
✅ **Score tracking**  
✅ **Particle effects**  
✅ **Screen shake**  

---

## 🔮 Future Enhancements

- Additional arena maps
- Power-ups (explosive arrows, shields, quiver refills)
- Online multiplayer support
- Leaderboards with user profiles
- Replay system
- Custom controller remapping UI

---

## 📝 API Endpoints

- `GET /api/health` - Health check
- `POST /api/score` - Save score (mode: 'versus' | 'survival', value: number)
- `POST /api/run` - Save survival run (wave, duration_seconds)

---

## 🎓 Learning Outcomes

This project demonstrates:
- **Game engine architecture** - custom physics and rendering systems
- **Fixed timestep game loops** - frame-independent physics
- **Controller input handling** - multi-device gamepad support
- **AI programming** - finite state machines for NPC behavior
- **Collision detection** - AABB with wrapped coordinate support
- **Database integration** - Supabase with RLS policies
- **Performance optimization** - efficient rendering and update cycles

---

## 👨‍💻 Developer

**Ilan Uzan**  
Developers Institute - Second Hackathon

---

## 📄 License

MIT

---

## 🙏 Acknowledgments

Inspired by **TowerFall Ascension** by Matt Makes Games. Built with modern web technologies for the browser gaming experience.
