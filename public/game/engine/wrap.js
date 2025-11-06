// World Wrapping Utilities - Toroidal Arena
import { WORLD_WIDTH, WORLD_HEIGHT, WRAP_X, WRAP_Y } from '../config/LevelConfig.js';

/**
 * Wrap a position to the toroidal world
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @returns {{x: number, y: number}} Wrapped position
 */
export function wrapPosition(x, y) {
  let wrappedX = x;
  let wrappedY = y;
  
  if (WRAP_X) {
    wrappedX = ((x % WORLD_WIDTH) + WORLD_WIDTH) % WORLD_WIDTH;
  }
  
  if (WRAP_Y) {
    wrappedY = ((y % WORLD_HEIGHT) + WORLD_HEIGHT) % WORLD_HEIGHT;
  }
  
  return { x: wrappedX, y: wrappedY };
}

/**
 * Get ghost offset positions for rendering entities near edges
 * @param {number} x - Entity X position
 * @param {number} y - Entity Y position
 * @param {number} width - Entity width
 * @param {number} height - Entity height
 * @returns {Array<{x: number, y: number}>} Array of ghost offsets
 */
export function getGhostOffsets(x, y, width, height) {
  const offsets = [];
  const edgeThreshold = Math.max(width, height) * 2; // Render ghosts if within 2x entity size of edge
  
  // Check if entity is near left edge
  if (WRAP_X && x < edgeThreshold) {
    offsets.push({ x: WORLD_WIDTH, y: 0 });
  }
  // Check if entity is near right edge
  if (WRAP_X && x + width > WORLD_WIDTH - edgeThreshold) {
    offsets.push({ x: -WORLD_WIDTH, y: 0 });
  }
  // Check if entity is near top edge
  if (WRAP_Y && y < edgeThreshold) {
    offsets.push({ x: 0, y: WORLD_HEIGHT });
  }
  // Check if entity is near bottom edge
  if (WRAP_Y && y + height > WORLD_HEIGHT - edgeThreshold) {
    offsets.push({ x: 0, y: -WORLD_HEIGHT });
  }
  // Check corners
  if (WRAP_X && WRAP_Y) {
    if (x < edgeThreshold && y < edgeThreshold) {
      offsets.push({ x: WORLD_WIDTH, y: WORLD_HEIGHT });
    }
    if (x + width > WORLD_WIDTH - edgeThreshold && y < edgeThreshold) {
      offsets.push({ x: -WORLD_WIDTH, y: WORLD_HEIGHT });
    }
    if (x < edgeThreshold && y + height > WORLD_HEIGHT - edgeThreshold) {
      offsets.push({ x: WORLD_WIDTH, y: -WORLD_HEIGHT });
    }
    if (x + width > WORLD_WIDTH - edgeThreshold && y + height > WORLD_HEIGHT - edgeThreshold) {
      offsets.push({ x: -WORLD_WIDTH, y: -WORLD_HEIGHT });
    }
  }
  
  return offsets;
}

/**
 * Check if a position needs wrapping
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @returns {boolean} True if position is out of bounds
 */
export function needsWrapping(x, y) {
  if (WRAP_X && (x < 0 || x >= WORLD_WIDTH)) return true;
  if (WRAP_Y && (y < 0 || y >= WORLD_HEIGHT)) return true;
  return false;
}

