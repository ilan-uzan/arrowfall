// Arrowfall Game Constants
export const PALETTE = {
  bg0: "#0d0f1a",      // deep graphite
  bg1: "#151a2b",      // elevated panels
  ink: "#e6eaf3",      // primary UI text
  sub: "#a5adcb",      // secondary text
  accent: "#7df9ff",   // neon cyan
  accent2: "#ff6b6b",  // neon red (hits)
  accent3: "#ffd166",  // gold (powerups)
  player1: "#9b5de5",  // purple
  player2: "#00f5d4",  // cyan
  player3: "#f15bb5",  // pink
  player4: "#fee440",  // yellow
  arrow: "#e0e0e0",    // light gray
  spike: "#b23a48"     // red
};

export const TILE = 16;                    // Base tile size
export const VIEW = { w: 320, h: 180 };   // Logical resolution
export const CSS_SCALE = 3;                // Display scale

// Physics Constants
export const TILE_SIZE = 16;                // Base tile size (same as TILE)
export const STEP = 1 / 120;               // Fixed timestep (120 FPS) - use this everywhere physics runs
export const GRAVITY = 1300;               // px/s^2
export const MOVE_ACC = 2500;              // px/s^2
export const MAX_VEL_X = 180;              // px/s
export const JUMP_VEL = -380;              // px/s
export const WALL_SLIDE_MAX = 60;          // px/s
export const COYOTE_MS = 100; // Increased for more forgiving jump timing
export const JUMP_BUFFER_MS = 150; // Increased buffer for better responsiveness

// Anti-bounce constants
export const GROUND_FRICTION = 0.15;       // Ground friction per step (tuned for 120Hz)
export const AIR_DRAG = 0.01;              // Air drag per step
export const PENETRATION_SLOP = 0.08;     // Minimum overlap to resolve (in pixels)
export const SLEEP_EPS = 0.02;             // Minimum velocity to zero out jitter (px/step)

// Arrow Constants
export const ARROW_SPEED = 380;            // px/s
export const START_ARROWS = 3;
export const MAX_ARROWS = 5;

// Input Constants
export const DEADZONE = 0.15; // Standard deadzone for smooth control

// Game Rules
export const WINS_TO_VICTORY = 3;          // best-of-5 (first to 3)
export const FIXED_DT = STEP;              // Alias for STEP (backward compatibility)

// Debug flag for physics instrumentation
export const DEBUG_PHYSICS = false;        // Set to true to enable physics debug overlays

// Player Colors
export const PLAYER_COLORS = [
  PALETTE.player1,
  PALETTE.player2,
  PALETTE.player3,
  PALETTE.player4
];

// Gamepad Button Mappings
export const GAMEPAD_BUTTONS = {
  JUMP: 0,        // A (Xbox) / Cross × (PS5)
  SHOOT: 2,       // X (Xbox) / Square ☐ (PS5)
  PAUSE: 9,       // Start (Xbox) / Options (PS5)
  COLOR_LEFT: 4,  // LB (Xbox) / L1 (PS5)
  COLOR_RIGHT: 5  // RB (Xbox) / R1 (PS5)
};

// D-Pad (for menu navigation)
export const DPAD = {
  LEFT: 14,
  RIGHT: 15,
  UP: 12,
  DOWN: 13
};

