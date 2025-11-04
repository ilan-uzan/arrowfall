// Visual Bible Constants - Arrowfall
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
export const CSS_SCALE = 3;               // Display scale
export const GRAVITY = 1300;              // px/s^2
export const MOVE_ACC = 2400;             // px/s^2
export const MAX_SPEED = 180;             // px/s
export const JUMP_VEL = -360;             // px/s
export const WALL_SLIDE_MAX = 60;         // px/s
export const COYOTE_MS = 80;
export const JUMP_BUFFER_MS = 100;
export const ARROW_SPEED = 360;           // px/s
export const START_ARROWS = 5;
export const ROUND_TARGET_WINS = 5;

export const SCENES = {
  TITLE: 'title',
  CHARACTER_SELECT: 'characterSelect',
  ARENA: 'arena',
  RESULTS: 'results',
  SURVIVAL: 'survival',
  SETTINGS: 'settings'
};

export const PLAYER_COLORS = [
  PALETTE.player1,
  PALETTE.player2,
  PALETTE.player3,
  PALETTE.player4
];

