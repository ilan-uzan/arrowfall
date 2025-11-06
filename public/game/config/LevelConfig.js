// Level Configuration - World Dimensions & Wrapping
import { VIEW } from '../engine/constants.js';

// World dimensions (in pixels)
export const WORLD_WIDTH = VIEW.w;   // 320px
export const WORLD_HEIGHT = VIEW.h;  // 180px

// Wrapping configuration
export const WRAP_X = true;
export const WRAP_Y = true;

// Wrap immunity period (ms) - prevents rapid wrapping
export const WRAP_IMMUNITY_MS = 100;

