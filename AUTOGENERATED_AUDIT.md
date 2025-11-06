# Arrowfall Codebase Audit
Generated: 2025-01-05

## Summary
Complete rebuild required: transitioning from Node.js/Express backend to frontend-only Vite + TypeScript architecture.

---

## ✅ KEEP (Refactor to TypeScript)

### Core Game Logic
- **public/game/entities/Player.js** → `src/game/entities/player.ts`
  - Keep: physics, movement, coyote time, jump buffer, wall-slide
  - Refactor: remove audio calls, TypeScript conversion

- **public/game/entities/Arrow.js** → `src/game/entities/arrow.ts`
  - Keep: arrow physics, wall embedding, collision
  - Refactor: TypeScript conversion

- **public/game/entities/NPC.js** → `src/game/entities/npc.ts`
  - Keep: AI state machine (patrol, aim, shoot, evade, retrieve)
  - Refactor: improve AI, add wave scaling, TypeScript conversion

### Input System
- **public/game/input/InputRouter.js** → `src/game/input/router.ts`
  - Keep: gamepad polling, button mapping, deadzone handling
  - Refactor: remove keyboard entirely, TypeScript, simplify API
  - Update: button mapping per spec (0=Jump, 2=Shoot, 9=Pause)

### World/Level
- **public/game/world/level.js** → `src/game/world.ts`
  - Keep: tile collision, AABB checks
  - Refactor: single hardcoded arena, remove JSON loading

- **public/game/world/levels.json** → DELETE (hardcode arena)

### Constants
- **public/game/constants.js** → `src/game/constants.ts`
  - Keep: physics constants, palette, view dimensions
  - Update: START_ARROWS = 3, MAX_ARROWS = 5, WINS_TO_VICTORY = 3
  - Update: GRAVITY = 1300, MOVE_ACC = 2500, MAX_VEL_X = 180, JUMP_VEL = -380

### Core Engine Structure
- **public/game/engine.js** → `src/game/engine.ts`
  - Refactor: fixed timestep (60 FPS) + interpolated render
  - Remove: audio system
  - Simplify: single loop architecture

### Scenes (Keep Core Logic)
- **public/game/scenes/TitleScene.js** → `src/scenes/TitleScene.tsx`
- **public/game/scenes/ArenaScene.js** → `src/scenes/ArenaScene.tsx`
- **public/game/scenes/SurvivalScene.js** → `src/scenes/SurvivalScene.tsx`
- **public/game/scenes/ResultsScene.js** → `src/scenes/ResultsScene.tsx`
- **public/game/scenes/SceneManager.js** → `src/scenes/SceneManager.ts`

### UI Assets
- **public/styles.css** → `src/styles.css` (keep, update for TailwindCSS)
- **public/index.html** → `index.html` (Vite template)

---

## ❌ DELETE

### Server/Backend (Entire)
- **server/** (entire directory)
  - `server/index.js` - Express server
  - `server/db/db.js` - Supabase client
  - `server/views/index.ejs` - EJS template
  - `server/views/leaderboard.ejs` - Leaderboard page

### Audio System
- **public/game/audio.js** - DELETE entirely
- All audio calls in entities/scenes → remove

### Unused Scenes
- **public/game/scenes/SettingsScene.js** - DELETE (no settings needed)
- **public/game/scenes/CharacterSelectScene.js** - DELETE (replace with simple lobby)

### Dependencies
- `express` - DELETE
- `ejs` - DELETE
- `@supabase/supabase-js` - DELETE
- `dotenv` - DELETE
- `nodemon` - DELETE

### Package Files
- `package.json` - REPLACE (new Vite + TypeScript config)
- `package-lock.json` - DELETE (will regenerate)

---

## 🔄 REFACTOR

### Engine Architecture
**Current:** Variable timestep, scene-based rendering
**Target:** Fixed timestep (60 FPS) + interpolated render

```
src/game/engine.ts
  - Fixed update loop: 1/60s per step
  - Interpolated render: smooth visuals between updates
  - Single unified loop
```

### Input System
**Current:** Gamepad + keyboard (keyboard removed)
**Target:** Pure gamepad only, simplified API

```
src/game/input/router.ts
  - Poll gamepads each frame
  - Normalize to ActionState type
  - Hot-plug support
  - Join system: button 0 pressed = join
```

### State Management
**Current:** Scene-based state
**Target:** Zustand store or singleton

```
src/store/gameStore.ts
  - Mode: 'title' | 'versus' | 'survival'
  - Players: Player[]
  - Round state
  - Scores
```

### Physics
**Current:** Mixed in entities
**Target:** Centralized physics system

```
src/game/physics.ts
  - AABB collision
  - Gravity, movement
  - Wall slide/jump
```

### Collision Detection
**Current:** Scattered in scenes
**Target:** Centralized system

```
src/game/collisions.ts
  - Arrow vs Player
  - Stomp detection
  - Arrow pickup
```

### Rendering
**Current:** Scene-based
**Target:** Unified render pipeline

```
src/game/render.ts
  - Draw order: BG → tiles → arrows → NPCs → players → particles → HUD
  - Pixel-perfect (imageSmoothingEnabled = false)
```

### Effects
**Current:** Basic particles
**Target:** Enhanced effects system

```
src/game/fx.ts
  - Particles
  - Screen shake
  - Hit flash
  - No audio
```

---

## 📁 NEW STRUCTURE

```
arrowfall/
├── src/
│   ├── main.tsx              # Entry point
│   ├── index.html            # Vite template
│   ├── styles.css            # Global styles
│   ├── ui/                   # UI components (if needed)
│   ├── scenes/               # Scene components
│   │   ├── TitleScene.tsx
│   │   ├── ModeSelectScene.tsx
│   │   ├── LobbyScene.tsx
│   │   ├── ArenaScene.tsx
│   │   ├── ResultsScene.tsx
│   │   └── SceneManager.ts
│   ├── game/
│   │   ├── engine.ts         # Fixed timestep loop
│   │   ├── world.ts          # Arena definition
│   │   ├── physics.ts        # Physics engine
│   │   ├── collisions.ts     # Collision detection
│   │   ├── render.ts         # Rendering pipeline
│   │   ├── fx.ts             # Effects (particles, shake)
│   │   ├── rng.ts            # Random number utilities
│   │   ├── constants.ts      # Game constants
│   │   ├── input/
│   │   │   ├── gamepad.ts    # Gamepad API wrapper
│   │   │   └── router.ts     # Input router
│   │   └── entities/
│   │       ├── player.ts
│   │       ├── arrow.ts
│   │       └── npc.ts
│   └── store/
│       └── gameStore.ts      # Zustand or singleton
├── tests/
│   ├── round-logic.spec.ts
│   ├── controller.spec.ts
│   └── npc.spec.ts
├── package.json              # Vite + TypeScript
├── tsconfig.json
├── vite.config.ts
└── README.md
```

---

## 🎯 IMPLEMENTATION PRIORITY

1. **Audit & Delete** ✅ (this document)
2. **Setup Vite + TypeScript** - Initialize new project structure
3. **Constants & Types** - Define all TypeScript types
4. **Input System** - Pure gamepad router
5. **Physics & Collisions** - Centralized systems
6. **World** - Single hardcoded arena
7. **Entities** - Player, Arrow, NPC (refactored)
8. **Engine** - Fixed timestep loop
9. **Render** - Unified pipeline
10. **Scenes** - Title → Mode Select → Lobby → Arena → Results
11. **Versus Mode** - 2-4 players, best-of-5, double-KO
12. **Survival Mode** - 1P vs 2 NPCs, waves, difficulty scaling
13. **FX & Polish** - Particles, screen shake, HUD
14. **Tests** - Unit tests for core logic

---

## ✅ ACCEPTANCE CRITERIA CHECKLIST

- [ ] No keyboard input code remains
- [ ] No audio files or WebAudio code
- [ ] No server/backend code
- [ ] No Supabase dependencies
- [ ] Vite + TypeScript project runs cleanly
- [ ] Xbox/PS5 controllers work out-of-the-box
- [ ] Versus mode: 2-4 players, best-of-5, double-KO replay
- [ ] Survival mode: 1P vs 2 NPCs, waves, scaling difficulty
- [ ] 60 FPS fixed timestep
- [ ] Pixel-perfect rendering
- [ ] Single arena, TowerFall-style
- [ ] Tests pass

---

## 📝 NOTES

- All physics constants updated per spec
- START_ARROWS = 3, MAX_ARROWS = 5
- WINS_TO_VICTORY = 3 (best-of-5)
- No networking, no database, no server
- Pure frontend game, controller-only
- TypeScript for type safety
- Vite for fast dev/build

