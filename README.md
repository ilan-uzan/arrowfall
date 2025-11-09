# 🏹 Arrowfall
## Hackathon Presentation - Developers Institute Second Hackathon
### By Ilan Uzan

<div align="center">
  <img src="arrowfall_icon.png" alt="Arrowfall Icon" width="200" />
  
  **🌐 Play Now**: [arrowfall.netlify.app](https://arrowfall.netlify.app)
  
  **⚠️ Controller Required**: PS5 or Xbox controller needed - no keyboard support
</div>

---

## 📖 Table of Contents

1. [Game Concept & Inspiration](#game-concept--inspiration)
2. [Game Overview](#game-overview)
3. [Game Modes](#game-modes)
4. [Tech Stack](#tech-stack)
5. [Architecture & Implementation](#architecture--implementation)
6. [Key Technical Features](#key-technical-features)
7. [Game Mechanics](#game-mechanics)
8. [Database Schema](#database-schema)
9. [Project Structure](#project-structure)
10. [Technical Challenges & Solutions](#technical-challenges--solutions)
11. [Controls](#controls)
12. [Quick Start](#quick-start)
13. [Performance & Optimization](#performance--optimization)
14. [Visual Design](#visual-design)
15. [Future Enhancements](#future-enhancements)
16. [API Documentation](#api-documentation)
17. [Learning Outcomes](#learning-outcomes)

---

## 🎮 Game Concept & Inspiration

### The Idea

**Arrowfall** is a fast-paced, local multiplayer archer brawler inspired by **TowerFall Ascension** - a beloved indie game known for its tight controls, strategic combat, and chaotic multiplayer fun. The goal was to recreate that same feeling of intense, skill-based competition in a browser-based game using modern web technologies.

### Why This Game?

- **Accessibility**: Browser-based means no downloads - just connect controllers and play
- **Local Multiplayer**: Brings friends together for couch co-op action
- **Technical Challenge**: Building a game engine from scratch teaches core concepts
- **Controller-First**: Modern gamepads provide superior control compared to keyboard
- **Unique Twist**: Toroidal (wrapping) world adds strategic depth

### Core Design Philosophy

1. **Instant Responsiveness**: Every input should feel immediate - no latency
2. **Fair Competition**: Consistent physics ensures skill matters more than luck
3. **Visual Clarity**: Pixel-perfect rendering makes every action readable
4. **Simple Rules**: Easy to learn, hard to master

---

## 🎮 Game Overview

**Arrowfall** is a 2D arena brawler where players control archers in a fast-paced combat arena. The game features:

- **Genre**: 2D Platform Fighter / Arena Brawler
- **Players**: 2-4 local multiplayer (Versus) or 1 player vs AI (Survival)
- **Style**: Pixel-art retro aesthetic with modern web tech
- **Unique Feature**: Toroidal world - seamless edge wrapping creates infinite arena feel
- **Platform**: Browser-based (Chrome/Edge recommended)
- **Input**: Controller-only (PS5/Xbox)

### Gameplay Flow

```
Title Screen → Mode Select → (Lobby for Versus) → Arena → Results → Repeat
```

---

## 🎯 Game Modes

### Versus Mode (2-4 Players)

**How It Works:**
- Players connect controllers and press A/× to join
- Each player selects a color/cape variation
- Match begins with 3-2-1-GO countdown
- Last player standing wins the round
- First to 3 wins takes the match
- **Double-KO Rule**: If last two players die simultaneously, round replays (no point awarded)

**Features:**
- Real-time scoreboard showing wins per player
- Round-by-round elimination
- Instant respawn for next round
- Match results screen with winner announcement

### Survival Mode (1 Player vs 2 NPCs)

**How It Works:**
- Single player faces off against 2 AI-controlled archers
- Defeat both NPCs to advance to next wave
- NPCs get progressively more difficult each wave:
  - **Reaction time**: Decreases from 260ms to 120ms minimum
  - **Aim accuracy**: Jitter reduces from ±10px to ±2px
  - **Movement speed**: Increases by 4% per wave
  - **Arrow speed**: Increases by 3% per wave
- Player death ends the run
- Highest wave reached is saved to database

**AI Behavior:**
- **Patrol**: NPCs move back and forth independently
- **Aim**: Stop and aim when player is in line-of-sight
- **Shoot**: Fire arrows with wave-scaled accuracy
- **Evade**: Jump away when player gets too close
- **Retrieve**: Collect arrows when low on ammo

---

## 🛠️ Tech Stack

### Backend

**Node.js + Express.js (ESM)**
- **Why**: Simple, fast server for API endpoints
- **Usage**: Serves static files and handles REST API calls
- **Modules**: ES6 modules (`type: "module"` in package.json)

**Supabase (PostgreSQL)**
- **Why**: Managed PostgreSQL with built-in auth and RLS
- **Usage**: Stores scores, survival runs, and player profiles
- **Integration**: Supabase JS client + MCP for schema management
- **Security**: Row Level Security (RLS) policies protect data

**Environment Variables**
- `SUPABASE_URL`: Project API URL
- `SUPABASE_ANON_KEY`: Public key for client-side
- `SUPABASE_SERVICE_ROLE_KEY`: Server-side key (never exposed)
- `PORT`: Server port (default: 3000)

### Frontend

**Vanilla JavaScript (ES6 Modules)**
- **Why**: No build step, no framework overhead, full control
- **Structure**: Modular ES6 imports/exports
- **Performance**: Direct DOM/Canvas access, no virtual DOM

**HTML5 Canvas 2D**
- **Why**: Pixel-perfect rendering, full control over drawing
- **Resolution**: 320×180 logical, displayed at 3× scale (960×540)
- **Rendering**: Custom render pipeline with draw order control
- **Pixel-Perfect**: `imageSmoothingEnabled = false` for crisp pixels

**Browser Gamepad API**
- **Why**: Native controller support, no libraries needed
- **Support**: Xbox, PS5, generic XInput controllers
- **Features**: Hot-plug detection, deadzone handling, button mapping

**Fixed Timestep Physics**
- **Update Rate**: 120 FPS (1/120 second steps)
- **Rendering**: Interpolated for smooth visuals at any framerate
- **Consistency**: Same physics behavior regardless of display FPS

### Database (Supabase)

**Tables:**
- `scores`: Versus match scores
- `survival_runs`: Survival mode high scores
- `profiles`: Player profiles (optional)

**Management:**
- Schema created via Supabase MCP (Model Context Protocol)
- RLS policies for secure data access
- Server-side API endpoints for data insertion

---

## 🏗️ Architecture & Implementation

### System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Browser (Client)                      │
│  ┌──────────────────────────────────────────────────┐   │
│  │         HTML5 Canvas + JavaScript                │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐       │   │
│  │  │  Input   │→ │  Game    │→ │  Render  │       │   │
│  │  │  Router  │  │  Loop    │  │  System  │       │   │
│  │  └──────────┘  └──────────┘  └──────────┘       │   │
│  │       ↓              ↓              ↓          │   │
│  │  Gamepad API    Physics Engine   Canvas 2D      │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                          ↕ HTTP/REST
┌─────────────────────────────────────────────────────────┐
│              Node.js + Express (Server)                 │
│  ┌──────────────────────────────────────────────────┐   │
│  │         Static File Server + API Routes          │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐      │   │
│  │  │   GET    │  │   POST    │  │   POST    │      │   │
│  │  │  /index  │  │ /api/score│  │ /api/run │      │   │
│  │  └──────────┘  └──────────┘  └──────────┘      │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                          ↕ Supabase Client
┌─────────────────────────────────────────────────────────┐
│              Supabase (PostgreSQL Database)              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │  scores  │  │survival_  │  │ profiles │             │
│  │  table   │  │  runs     │  │  table   │             │
│  └──────────┘  └──────────┘  └──────────┘             │
└─────────────────────────────────────────────────────────┘
```

### Game Loop Architecture

```
┌─────────────────────────────────────────────────┐
│         RequestAnimationFrame Loop               │
│  ┌───────────────────────────────────────────┐  │
│  │  Accumulator += frameTime                 │  │
│  │  while (accumulator >= STEP) {            │  │
│  │    ┌─────────────────────────────────┐   │  │
│  │    │  UPDATE (120 FPS Fixed Step)    │   │  │
│  │    │  ├─ Input Polling               │   │  │
│  │    │  ├─ Physics Update              │   │  │
│  │    │  ├─ Entity Updates               │   │  │
│  │    │  ├─ Collision Detection         │   │  │
│  │    │  └─ State Management            │   │  │
│  │    └─────────────────────────────────┘   │  │
│  │    accumulator -= STEP                    │  │
│  │  }                                         │  │
│  │  ┌─────────────────────────────────┐      │  │
│  │  │  RENDER (Variable FPS)          │      │  │
│  │  │  alpha = accumulator / STEP       │      │  │
│  │  │  ├─ Clear Canvas                 │      │  │
│  │  │  ├─ Draw World                   │      │  │
│  │  │  ├─ Draw Entities (interpolated) │      │  │
│  │  │  ├─ Draw Particles               │      │  │
│  │  │  └─ Draw UI                      │      │  │
│  │  └─────────────────────────────────┘      │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

### Code Organization

**Scene-Based Architecture:**
- Each game state is a separate scene class
- Scene manager handles transitions
- Scenes handle their own update/render logic

**Entity-Component Pattern:**
- Entities (Player, Arrow, NPC) are self-contained
- Each entity has update() and render() methods
- Physics system operates on entities generically

**Separation of Concerns:**
- **Physics**: Movement, gravity, collision resolution
- **Input**: Controller polling and action mapping
- **Rendering**: Canvas drawing with proper layering
- **Game Logic**: Round system, scoring, state management

---

## 🎨 Key Technical Features

### 1. Fixed Timestep Physics Engine

**Implementation:**
- Accumulator pattern: `accumulator += frameTime`
- Fixed step: `STEP = 1/120` (120 FPS)
- Max substeps: 5 (prevents spiral of death)
- Interpolation: `alpha = accumulator / STEP` for smooth rendering

**Physics Constants:**
```javascript
GRAVITY = 1300 px/s²
MOVE_ACC = 2500 px/s²
MAX_VEL_X = 180 px/s
JUMP_VEL = -380 px/s
COYOTE_MS = 100ms
JUMP_BUFFER_MS = 150ms
```

**Features:**
- **Coyote Time**: 100ms window to jump after leaving platform
- **Jump Buffering**: 150ms window to press jump before landing
- **Wall-Slide**: Reduced fall speed when holding against wall
- **Wall-Jump**: Jump off walls with horizontal boost
- **Zero-Bounce Collision**: Entities stick to surfaces, no bouncing

**Collision Resolution:**
- One-axis-at-a-time resolution (X then Y)
- Exact overlap calculation
- Position snapping to prevent tunneling
- Normal velocity zeroing (no bounce)

### 2. Toroidal World System

**How It Works:**
- World dimensions: 320×180 pixels
- Entities wrap using modulo: `x = ((x % width) + width) % width`
- Ghost rendering: Entities near edges render copies on opposite side
- Wrapped collision: Checks both main and ghost positions

**Implementation:**
```javascript
// Position wrapping
wrapPosition(x, y) {
  wrappedX = ((x % WORLD_WIDTH) + WORLD_WIDTH) % WORLD_WIDTH;
  wrappedY = ((y % WORLD_HEIGHT) + WORLD_HEIGHT) % WORLD_HEIGHT;
  return { x: wrappedX, y: wrappedY };
}

// Ghost rendering
getGhostOffsets(x, y, width, height) {
  // Returns array of offsets for entities near edges
  // Renders copies on opposite side for seamless wrapping
}
```

**Benefits:**
- Infinite arena feel
- No edge camping
- Strategic depth (arrows wrap around)
- Smooth visual experience

### 3. Controller Input System

**Architecture:**
```
GamepadManager (polling)
    ↓
InputRouter (mapping + deadzone)
    ↓
Action Objects (normalized)
    ↓
Entity Updates (player movement)
```

**Features:**
- **Multi-Controller**: Up to 4 gamepads simultaneously
- **Hot-Plug**: Controllers can connect/disconnect anytime
- **Deadzone Scaling**: Smooth analog stick control
- **Universal Mapping**: Xbox/PS5 work identically
- **Single-Frame Detection**: Prevents input spam in menus

**Button Mapping:**
- **Jump**: Button 0 (A/Xbox, ×/PS5)
- **Shoot**: Button 2 (X/Xbox, ☐/PS5)
- **Pause**: Button 9 (Start/Xbox, Options/PS5)
- **Move**: Left Stick X or D-Pad Left/Right
- **Deadzone**: 0.15 (15% threshold)

**Input Processing:**
```javascript
// Deadzone scaling
if (Math.abs(stickX) > DEADZONE) {
  const sign = stickX > 0 ? 1 : -1;
  const magnitude = (Math.abs(stickX) - DEADZONE) / (1 - DEADZONE);
  axisX = sign * magnitude; // Maps [DEADZONE, 1] to [0, 1]
}
```

### 4. AI System (Survival Mode)

**Finite State Machine:**
```
PATROL → AIM → SHOOT → EVADE → RETRIEVE → PATROL
```

**State Behaviors:**

**PATROL:**
- Move back and forth independently
- Change direction at walls or after 3 seconds
- Speed scales with wave: `MAX_VEL_X * 0.7 * (1 + wave * 0.04)`

**AIM:**
- Stop moving
- Face player
- Wait for reaction delay: `max(120ms, 260ms - wave * 10ms)`
- Check line-of-sight before shooting

**SHOOT:**
- Fire arrow with aim jitter: `±max(2px, 10px - wave * 0.6px)`
- Arrow speed scales: `ARROW_SPEED * (1 + wave * 0.03)`
- Return to PATROL after shooting

**EVADE:**
- Jump away when player is too close (< 80px)
- Move in opposite direction from player
- Only one jump per evade state

**RETRIEVE:**
- Find nearest embedded arrow
- Move toward arrow
- Jump if arrow is above
- Pick up arrow when close (< 24px)

**Line-of-Sight Detection:**
- Bresenham's line algorithm through tiles
- Checks if path is clear before shooting
- Handles wrapped coordinates

### 5. Collision System

**AABB (Axis-Aligned Bounding Box) Detection:**
```javascript
checkAABB(rect1, rect2) {
  return rect1.x < rect2.x + rect2.width &&
         rect1.x + rect1.width > rect2.x &&
         rect1.y < rect2.y + rect2.height &&
         rect1.y + rect1.height > rect2.y;
}
```

**One-Axis Resolution:**
- Resolve X-axis collisions first
- Then resolve Y-axis collisions
- Prevents tunneling and jitter

**Zero-Bounce Physics:**
- No velocity inversion on collision
- Exact overlap resolution
- Position snapping to prevent penetration
- Normal velocity zeroing (entities stick to surfaces)

**Penetration Slop:**
- `PENETRATION_SLOP = 0.08px` - ignore tiny overlaps
- Prevents jitter from floating-point errors

**Sleep Threshold:**
- `SLEEP_EPS = 0.02 px/step` - zero out jitter velocities
- Prevents micro-movements

### 6. Rendering System

**Draw Order (Back to Front):**
1. Background (solid color)
2. World tiles
3. Embedded arrows (stuck in walls)
4. NPCs
5. Players
6. Active arrows (flying)
7. Particles
8. UI/HUD

**Ghost Rendering:**
- Entities within 2× size of edge render copies
- Prevents visual popping when wrapping
- Only visual - physics uses single position

**Screen Effects:**
- **Screen Shake**: Camera offset on hits/deaths
- **Hit Flash**: White flash on arrow impact
- **Particles**: Death explosions, arrow trails
- **No Audio**: Visual feedback only

---

## 🎮 Game Mechanics

### Movement System

**Horizontal Movement:**
- Acceleration-based (not instant velocity)
- Ground friction: 15% per step (120Hz)
- Air drag: 1% per step
- Max speed: 180 px/s

**Jumping:**
- **Instant Execution**: Jump happens on same frame button pressed
- **Coyote Time**: 100ms window after leaving platform
- **Jump Buffer**: 150ms window before landing
- **Wall-Jump**: Jump off walls with horizontal boost
- **No Cooldowns**: Can jump repeatedly instantly

**Wall Mechanics:**
- **Wall-Slide**: Fall speed capped at 60 px/s when holding against wall
- **Wall-Jump**: Jump off wall with 80% max speed boost
- **Wall Detection**: Checks tile collision on left/right sides

**Ground Detection:**
- Checks tiles directly below entity
- Tolerance: 4 pixels (allows for small gaps)
- Updates every frame for accurate state

### Combat System

**Arrows:**
- **Start**: 3 arrows
- **Max**: 5 arrows
- **Speed**: 380 px/s (scales with wave in Survival)
- **Embedding**: Arrows stick in walls when they hit
- **Pickup**: Walk near embedded arrow to collect (16px radius)
- **Trajectory**: Maintains velocity when wrapping

**Death Conditions:**
- **Arrow Hit**: Instant elimination
- **Stomp**: Falling on enemy from above (vy > 220 px/s)
- **No Lives**: One hit = death

**Stomp Detection:**
- Player must be falling fast (vy > 220 px/s)
- Player's feet must overlap enemy's head area
- Player gets slight upward bounce after stomp

### Arena Layout

**Single Map Design:**
- **Size**: 20×11 tiles (320×176 pixels)
- **Tile Size**: 16×16 pixels
- **Layout**: TowerFall-style with:
  - Raised side platforms (top)
  - Central lower pit
  - Bottom platforms (lower)
  - Partial side walls for wall-sliding

**Spawn Points:**
- 4 player spawns (far apart)
- 2 NPC spawns (for Survival mode)
- Spawns positioned on platforms (not in air)

---

## 📊 Database Schema

### Supabase Tables

**`scores` Table:**
```sql
CREATE TABLE scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mode TEXT NOT NULL CHECK (mode IN ('versus', 'survival')),
  value INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**`survival_runs` Table:**
```sql
CREATE TABLE survival_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wave INTEGER NOT NULL,
  duration_seconds INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**`profiles` Table (Optional):**
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username TEXT UNIQUE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Row Level Security (RLS)

**Policies:**
- **scores**: Public read, authenticated insert
- **survival_runs**: Public read, authenticated insert
- **profiles**: User can read/update own profile

**Implementation:**
- Created via Supabase MCP
- Server uses service role key for inserts
- Client uses anon key for reads

---

## 🚀 Project Structure

```
arrowfall/
├── server.js                    # Express server entry point
├── package.json                 # Dependencies & scripts
├── .env                         # Environment variables (not in repo)
├── routes/
│   └── api.js                   # REST API endpoints
│       ├── GET /api/health      # Health check
│       ├── POST /api/score      # Save score
│       └── POST /api/run        # Save survival run
├── db/
│   └── supabase.js              # Supabase client initialization
├── public/
│   ├── index.html               # Game entry point
│   ├── styles.css               # Global styles
│   └── game/
│       ├── main.js              # Game boot + scene management
│       ├── config/
│       │   └── LevelConfig.js   # World dimensions & wrap settings
│       ├── scenes/              # Game state scenes
│       │   ├── title.js         # Main menu
│       │   ├── modeSelect.js    # Mode selection
│       │   ├── lobby.js         # Player join screen (Versus)
│       │   ├── versus.js        # Multiplayer mode
│       │   ├── survival.js      # Single-player mode
│       │   └── results.js      # Match results screen
│       └── engine/
│           ├── loop.js          # Fixed timestep game loop
│           ├── world.js          # Arena layout & tile collision
│           ├── physics.js       # Movement, gravity, collision resolution
│           ├── collisions.js    # AABB collision detection
│           ├── render.js        # Canvas rendering pipeline
│           ├── fx.js            # Particles & screen effects
│           ├── wrap.js          # Toroidal wrapping utilities
│           ├── constants.js     # Game constants
│           ├── input/
│           │   ├── gamepad.js   # Gamepad API wrapper
│           │   └── router.js   # Input routing & mapping
│           └── entities/
│               ├── player.js    # Player entity
│               ├── arrow.js     # Arrow projectile
│               └── npc.js       # NPC AI entity
└── README.md                    # This file
```

### Key Files Explained

**`server.js`**
- Express server setup
- Serves static files from `/public`
- API routes for score tracking
- Environment variable loading

**`public/game/main.js`**
- Game class initialization
- Scene management
- Game loop setup
- Input router initialization

**`public/game/engine/physics.js`**
- Core physics system
- Gravity, movement, collision resolution
- Jump mechanics
- Ground/wall detection

**`public/game/engine/loop.js`**
- Fixed timestep accumulator
- Interpolated rendering
- Max substep capping

**`public/game/engine/input/router.js`**
- Gamepad polling
- Button/axis mapping
- Deadzone scaling
- Action normalization

---

## 🎯 Technical Challenges & Solutions

### Challenge 1: Fixed Timestep Physics

**Problem:**
Variable framerate causes inconsistent physics behavior - same input produces different results at different FPS.

**Solution:**
Implemented accumulator-based fixed timestep loop:
```javascript
accumulator += frameTime;
while (accumulator >= STEP) {
  update(STEP);  // Always use fixed STEP
  accumulator -= STEP;
}
render(accumulator / STEP);  // Interpolate for smooth visuals
```

**Result:**
- Consistent physics at any display FPS
- Smooth rendering through interpolation
- Predictable gameplay behavior

### Challenge 2: Infinite Bounce Bug

**Problem:**
Characters bounced uncontrollably when touching walls/floors, creating unplayable physics.

**Root Causes:**
- Multiple ground state checks causing flickering
- Velocity inversions on collision (bounce effect)
- Position snapping happening multiple times
- Complex locking systems causing delays

**Solution:**
Complete physics rewrite with:
- **Single ground check** at start of update
- **Zero-bounce collision**: Zero normal velocity, don't invert
- **One-axis resolution**: X then Y, exact overlap
- **Penetration slop**: Ignore tiny overlaps (< 0.08px)
- **Sleep threshold**: Zero jitter velocities (< 0.02 px/step)
- **Ground friction**: 15% per step when grounded

**Result:**
- Smooth, stable physics
- No bouncing or jitter
- Responsive controls

### Challenge 3: Toroidal World Wrapping

**Problem:**
Seamless edge wrapping without visual popping or collision bugs.

**Solution:**
- **Modulo wrapping**: `x = ((x % width) + width) % width`
- **Ghost rendering**: Entities near edges render copies on opposite side
- **Wrapped collision**: Check both main and ghost positions
- **Arrow wrapping**: Maintains trajectory when crossing edges

**Result:**
- Seamless visual experience
- Correct collision detection across boundaries
- Strategic depth (arrows wrap around)

### Challenge 4: Controller Input Latency

**Problem:**
Jumping had noticeable latency - button press didn't execute immediately.

**Root Causes:**
- Jump check happened AFTER physics update
- Single-frame button detection expired before jump executed
- Complex jump conditions with multiple timers

**Solution:**
- **Jump check BEFORE physics**: Execute immediately when button pressed
- **Raw button state**: Use `jumpHeld` instead of single-frame `jump`
- **Jump check INSIDE physics**: Right after ground state check
- **Fallback check**: After physics update as safety net
- **No cooldowns**: Instant repeated jumping

**Result:**
- Truly instant jump execution
- Zero latency - jump happens on same frame button pressed
- Responsive, smooth controls

### Challenge 5: Independent NPC AI

**Problem:**
NPCs moved identically, creating predictable and boring behavior.

**Solution:**
- **ID-based initialization**: `patrolDirection = (id % 2 === 0) ? 1 : -1`
- **Randomized evade**: Add randomness to evade direction
- **Independent state machines**: Each NPC has own state timer
- **Unique decision-making**: Different patrol patterns per NPC

**Result:**
- NPCs behave independently
- More challenging and interesting gameplay
- Feels like fighting real players

### Challenge 6: Ground Movement Issues

**Problem:**
Players couldn't move horizontally on ground without jumping.

**Root Causes:**
- Ground state not initialized correctly
- Physics update order issues
- Velocity zeroing blocking movement

**Solution:**
- Proper ground state initialization
- Check ground state BEFORE movement
- Only zero velocity when actually touching walls/floors
- Ground friction applied correctly

**Result:**
- Smooth horizontal movement on ground
- Proper air vs ground movement differences
- Responsive controls

---

## 🎮 Controls

### Xbox Controller
- **Left Stick** or **D-Pad Left/Right** → Move
- **A Button** → Jump
- **X Button** → Shoot Arrow
- **Start Button** → Pause / Join Game
- **LB/RB** → Change Color (in lobby)

### PS5 Controller (DualSense)
- **Left Stick** or **D-Pad Left/Right** → Move
- **Cross (×)** → Jump
- **Square (☐)** → Shoot Arrow
- **Options** → Pause / Join Game
- **L1/R1** → Change Color (in lobby)

### Menu Navigation
- **Left Stick** or **D-Pad** → Navigate menus
- **A / Cross (×)** → Select option

**Note**: Keyboard input is completely disabled - this is a controller-only game.

---

## 🚀 Quick Start

### Play Online (Recommended)

1. Visit **[arrowfall.netlify.app](https://arrowfall.netlify.app)**
2. Connect a PS5 or Xbox controller via USB or Bluetooth
3. Press **A / Cross (×)** to start
4. Select game mode and play!

### Run Locally

**Prerequisites:**
- Node.js 18+ installed
- PS5 or Xbox controller
- Supabase account (for database)

**Setup:**

```bash
# Clone repository
git clone https://github.com/ilan-uzan/arrowfall.git
cd arrowfall

# Install dependencies
npm install

# Create .env file
cat > .env << EOF
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
PORT=3000
EOF

# Start server
npm start

# Open browser to http://localhost:3000
# Connect controller and press A/× to join!
```

**Database Setup:**

The database schema is managed via Supabase MCP. The tables (`scores`, `survival_runs`, `profiles`) should be created automatically when the server starts, or you can create them manually in Supabase dashboard.

---

## 📈 Performance & Optimization

### Target Performance

- **Rendering**: 60 FPS (variable, interpolated)
- **Physics**: 120 FPS (fixed timestep)
- **Input**: Polled every frame
- **Memory**: Minimal allocations (reuse objects)

### Optimization Techniques

**1. Object Pooling:**
- Reuse arrow objects instead of creating new ones
- Particle systems reuse particle objects

**2. Efficient Collision:**
- Tile-based collision (O(1) tile lookup)
- Early exit on collision detection
- Only check relevant tiles

**3. Rendering Optimization:**
- Draw only visible entities
- Skip rendering dead entities
- Batch similar draw calls

**4. Fixed Timestep:**
- Consistent physics regardless of FPS
- Prevents frame-dependent bugs
- Smooth interpolation for visuals

**5. No External Dependencies:**
- Vanilla JavaScript = no framework overhead
- Direct Canvas API = maximum performance
- Minimal bundle size

### Performance Metrics

- **Bundle Size**: < 50KB (minified)
- **Load Time**: < 1 second
- **Memory Usage**: < 50MB during gameplay
- **CPU Usage**: < 10% on modern hardware

---

## 🎨 Visual Design

### Resolution & Scaling

- **Logical Resolution**: 320×180 pixels
- **Display Scale**: 3× (960×540 pixels)
- **Pixel Perfect**: `imageSmoothingEnabled = false`
- **Aspect Ratio**: 16:9

### Color Palette

```javascript
PALETTE = {
  bg0: "#0d0f1a",      // Deep graphite background
  bg1: "#151a2b",      // Elevated panels
  ink: "#e6eaf3",      // Primary UI text
  sub: "#a5adcb",      // Secondary text
  accent: "#7df9ff",   // Neon cyan
  accent2: "#ff6b6b",  // Neon red (hits)
  accent3: "#ffd166",  // Gold (powerups)
  player1: "#9b5de5",  // Purple
  player2: "#00f5d4",  // Cyan
  player3: "#f15bb5",  // Pink
  player4: "#fee440",  // Yellow
}
```

### Visual Effects

**Particles:**
- Death explosions (colored by player color)
- Arrow trails
- Hit sparks

**Screen Effects:**
- Screen shake on hits/deaths
- Hit flash (white overlay)
- Round transition effects

**UI Elements:**
- Scoreboard (top-center)
- Wave counter (Survival mode)
- Round countdown (3-2-1-GO)
- Match results screen

**No Audio:**
- Visual feedback only
- Screen shake and particles provide feedback
- Keeps bundle size small

---

## 🔮 Future Enhancements

### Planned Features

1. **Additional Arenas**
   - Multiple map layouts
   - Different strategic layouts
   - Map selection screen

2. **Power-Ups**
   - Explosive arrows (area damage)
   - Shield (temporary invincibility)
   - Quiver refill (instant arrow reload)

3. **Online Multiplayer**
   - WebSocket-based networking
   - Matchmaking system
   - Lag compensation

4. **Leaderboards**
   - Global high scores
   - Player profiles
   - Statistics tracking

5. **Replay System**
   - Record match data
   - Playback system
   - Share replays

6. **Controller Remapping**
   - Custom button mapping UI
   - Save preferences
   - Multiple preset layouts

---

## 📝 API Documentation

### Endpoints

**GET `/api/health`**
- Health check endpoint
- Returns: `{ status: "ok" }`

**POST `/api/score`**
- Save versus match score
- Body: `{ mode: "versus", value: 3 }`
- Returns: Created score object

**POST `/api/run`**
- Save survival mode run
- Body: `{ wave: 5, duration_seconds: 120 }`
- Returns: Created run object

### Error Handling

- All endpoints return JSON
- Error responses: `{ error: "message" }`
- Server-side validation
- Supabase error handling

---

## 🎓 Learning Outcomes

### Technical Skills Demonstrated

1. **Game Engine Architecture**
   - Custom physics system
   - Fixed timestep game loops
   - Entity-component pattern
   - Scene management

2. **Physics Programming**
   - Gravity and acceleration
   - Collision detection (AABB)
   - Collision resolution
   - Platformer mechanics

3. **Input Systems**
   - Gamepad API integration
   - Multi-device support
   - Deadzone handling
   - Input buffering

4. **AI Programming**
   - Finite state machines
   - Line-of-sight detection
   - Dynamic difficulty scaling
   - Independent behavior systems

5. **Rendering**
   - Canvas 2D API
   - Draw order management
   - Interpolation
   - Particle systems

6. **Database Integration**
   - Supabase setup
   - RESTful API design
   - Row Level Security
   - Schema management

7. **Performance Optimization**
   - Fixed timestep physics
   - Efficient collision detection
   - Object reuse
   - Minimal allocations

### Problem-Solving Process

This project involved solving numerous technical challenges:
- Debugging physics bugs (bouncing, movement issues)
- Implementing complex systems (toroidal world, AI)
- Optimizing for performance
- Creating responsive controls

Each challenge required:
- Deep analysis of the problem
- Research into game development techniques
- Iterative testing and refinement
- Documentation of solutions

---

## 👨‍💻 Developer

**Ilan Uzan**  
Developers Institute - Second Hackathon

**GitHub**: [github.com/ilan-uzan/arrowfall](https://github.com/ilan-uzan/arrowfall)

**Live Demo**: [arrowfall.netlify.app](https://arrowfall.netlify.app)

---

## 📄 License

MIT License - Feel free to use this code for learning purposes.

---

## 🙏 Acknowledgments

**Inspiration:**
- **TowerFall Ascension** by Matt Makes Games - The original inspiration for this project

**Technologies:**
- **Supabase** - Amazing backend-as-a-service platform
- **Express.js** - Simple and powerful web framework
- **Browser Gamepad API** - Native controller support

**Community:**
- Developers Institute for the hackathon opportunity
- Open source game development resources

---

## 🎯 Hackathon Presentation Notes

### Demo Script (2 minutes)

1. **Introduction (10s)**
   - "Arrowfall - a browser-based TowerFall-style archer brawler"

2. **Live Demo - Versus Mode (40s)**
   - Show controller connection
   - Demonstrate smooth movement and jumping
   - Show arrow combat and wrapping
   - Demonstrate stomp kills

3. **Survival Mode (30s)**
   - Show AI behavior
   - Demonstrate wave progression
   - Show difficulty scaling

4. **Technical Highlights (30s)**
   - Fixed timestep physics
   - Toroidal world wrapping
   - Controller-only input
   - Supabase integration

5. **Closing (10s)**
   - "Playable at arrowfall.netlify.app"
   - "Controller required - PS5 or Xbox"

### Key Points to Emphasize

- **Zero latency controls** - instant jump response
- **Smooth physics** - no bouncing or jitter
- **Toroidal world** - unique wrapping mechanic
- **Controller-first** - designed for gamepads
- **Browser-based** - no downloads needed
- **Full-stack** - Node.js + Express + Supabase

---

**Built with ❤️ for the Developers Institute Second Hackathon**
