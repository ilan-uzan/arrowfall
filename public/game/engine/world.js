// World - Single TowerFall-style Arena (Toroidal)
import { TILE, PALETTE } from './constants.js';
import { wrapPosition } from './wrap.js';

export class World {
  constructor() {
    this.tileSize = TILE;
    this.width = 20;  // tiles
    this.height = 11; // tiles
    this.spawns = this.createSpawnPoints();
    this.solids = this.createArenaLayout();
  }

  createArenaLayout() {
    // TowerFall-style arena: side platforms, central pit, high ledges
    const solids = [];
    
    for (let y = 0; y < this.height; y++) {
      const row = [];
      for (let x = 0; x < this.width; x++) {
        let solid = false;
        
        // Top and bottom walls
        if (y === 0 || y === this.height - 1) {
          solid = true;
        }
        // Left platform (raised)
        else if (y === 2 && (x < 5 || x >= this.width - 5)) {
          solid = true;
        }
        // Right platform (raised)
        else if (y === 2 && (x >= this.width - 5)) {
          solid = true;
        }
        // Bottom platforms (lower)
        else if (y === 8 && (x < 7 || x >= this.width - 7)) {
          solid = true;
        }
        // Side walls (partial)
        else if ((x === 0 || x === this.width - 1) && y > 2 && y < 8) {
          solid = true;
        }
        
        row.push(solid);
      }
      solids.push(row);
    }
    
    return solids;
  }

  createSpawnPoints() {
    // Spawn positions: entity's top-left corner
    // Platform at tile 8 (y=128) - entity height 14, so spawn at y=128-14=114
    // Platform at tile 2 (y=32) - entity height 14, so spawn at y=32-14=18
    // Bottom wall at tile 10 (y=160) - entity height 14, so spawn at y=160-14=146
    return {
      p1: { x: 32, y: 114 },      // Left platform (tile 8, feet on platform)
      p2: { x: 288, y: 114 },     // Right platform (tile 8, feet on platform)
      p3: { x: 160, y: 18 },      // Top center (tile 2, feet on platform)
      p4: { x: 160, y: 146 },     // Bottom center (tile 10, feet on bottom wall)
      npc1: { x: 96, y: 114 },    // NPC spawn 1 (tile 8, feet on platform)
      npc2: { x: 224, y: 114 }    // NPC spawn 2 (tile 8, feet on platform)
    };
  }

  worldToTile(x, y) {
    return {
      tx: Math.floor(x / this.tileSize),
      ty: Math.floor(y / this.tileSize)
    };
  }

  isSolid(tx, ty) {
    // Wrap tile coordinates for toroidal world
    const wrappedTx = ((tx % this.width) + this.width) % this.width;
    const wrappedTy = ((ty % this.height) + this.height) % this.height;
    return this.solids[wrappedTy]?.[wrappedTx] === true;
  }

  checkCollision(x, y, width, height) {
    if (!width || !height || width <= 0 || height <= 0) return false;
    
    const leftTile = Math.floor(Math.max(0, x) / this.tileSize);
    const rightTile = Math.floor((x + width) / this.tileSize);
    const topTile = Math.floor(Math.max(0, y) / this.tileSize);
    const bottomTile = Math.floor((y + height) / this.tileSize);

    for (let ty = topTile; ty <= bottomTile; ty++) {
      for (let tx = leftTile; tx <= rightTile; tx++) {
        if (this.isSolid(tx, ty)) {
          return true;
        }
      }
    }
    return false;
  }

  checkOnGround(entity) {
    if (!entity) return false;
    
    const x = entity.x || 0;
    const y = entity.y || 0;
    const width = entity.width || 12;
    const height = entity.height || 14;
    
    const bottomY = y + height;
    const leftTile = Math.floor(x / this.tileSize);
    const rightTile = Math.floor((x + width) / this.tileSize);
    const tileBelow = Math.floor((bottomY + 1) / this.tileSize);

    for (let tx = leftTile; tx <= rightTile; tx++) {
      if (this.isSolid(tx, tileBelow)) {
        return true;
      }
    }
    return false;
  }

  checkTouchingWall(entity, direction) {
    if (!entity || !direction) return false;
    
    const x = entity.x || 0;
    const y = entity.y || 0;
    const width = entity.width || 12;
    const height = entity.height || 14;
    
    const leftTile = Math.floor(x / this.tileSize);
    const rightTile = Math.floor((x + width) / this.tileSize);
    const topTile = Math.floor(y / this.tileSize);
    const bottomTile = Math.floor((y + height) / this.tileSize);

    if (direction === 'left') {
      const tileLeft = Math.floor((x - 1) / this.tileSize);
      for (let ty = topTile; ty <= bottomTile; ty++) {
        if (this.isSolid(tileLeft, ty)) {
          return true;
        }
      }
    } else if (direction === 'right') {
      const tileRight = Math.floor((x + width + 1) / this.tileSize);
      for (let ty = topTile; ty <= bottomTile; ty++) {
        if (this.isSolid(tileRight, ty)) {
          return true;
        }
      }
    }
    return false;
  }

  resolveCollision(entity) {
    if (!entity) return;
    
    const x = entity.x || 0;
    const y = entity.y || 0;
    const width = entity.width || 12;
    const height = entity.height || 14;
    
    if (width <= 0 || height <= 0) return;
    
    // Get current tile positions
    const leftTile = Math.floor(x / this.tileSize);
    const rightTile = Math.floor((x + width) / this.tileSize);
    const topTile = Math.floor(y / this.tileSize);
    const bottomTile = Math.floor((y + height) / this.tileSize);

    // Check horizontal collisions FIRST (before vertical)
    // Only resolve if actually moving in that direction
    for (let ty = topTile; ty <= bottomTile; ty++) {
      if (this.isSolid(leftTile, ty)) {
        // Push out to the right
        entity.x = (leftTile + 1) * this.tileSize;
        // Only stop if moving left
        if (entity.vx !== undefined && entity.vx < 0) {
          entity.vx = 0;
        }
        // Update touching wall
        entity.touchingWall.left = true;
      }
      if (this.isSolid(rightTile, ty)) {
        // Push out to the left
        entity.x = rightTile * this.tileSize - width;
        // Only stop if moving right
        if (entity.vx !== undefined && entity.vx > 0) {
          entity.vx = 0;
        }
        // Update touching wall
        entity.touchingWall.right = true;
      }
    }

    // Check vertical collisions AFTER horizontal
    for (let tx = leftTile; tx <= rightTile; tx++) {
      if (this.isSolid(tx, topTile)) {
        // Push down
        entity.y = (topTile + 1) * this.tileSize;
        // Only stop if moving up
        if (entity.vy !== undefined && entity.vy < 0) {
          entity.vy = 0;
        }
      }
      if (this.isSolid(tx, bottomTile)) {
        // Push up
        entity.y = bottomTile * this.tileSize - height;
        // Only stop if moving down
        if (entity.vy !== undefined && entity.vy > 0) {
          entity.vy = 0;
        }
        // Mark as on ground
        if (entity.onGround !== undefined) {
          entity.onGround = true;
        }
      }
    }
    
    // Note: Bounds clamping removed - wrapping is handled in physics system
  }

  // Line of sight check (for NPC AI) - handles wrapped coordinates
  hasLineOfSight(x1, y1, x2, y2) {
    // Wrap coordinates for toroidal world
    const wrapped1 = wrapPosition(x1, y1);
    const wrapped2 = wrapPosition(x2, y2);
    
    const dx = wrapped2.x - wrapped1.x;
    const dy = wrapped2.y - wrapped1.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const steps = Math.ceil(dist / this.tileSize);
    
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = wrapped1.x + dx * t;
      const y = wrapped1.y + dy * t;
      const { tx, ty } = this.worldToTile(x, y);
      if (this.isSolid(tx, ty)) {
        return false;
      }
    }
    return true;
  }

  render(ctx) {
    // Draw tiles
    ctx.fillStyle = PALETTE.bg1;
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.solids[y][x]) {
          ctx.fillRect(x * this.tileSize, y * this.tileSize, this.tileSize, this.tileSize);
        }
      }
    }
    
    // Draw tile outlines
    ctx.strokeStyle = PALETTE.sub;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.3;
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.solids[y][x]) {
          ctx.strokeRect(x * this.tileSize, y * this.tileSize, this.tileSize, this.tileSize);
        }
      }
    }
    ctx.globalAlpha = 1.0;
  }
}

