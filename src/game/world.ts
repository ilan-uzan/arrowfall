// World - Single TowerFall-style Arena
import { TILE, PALETTE, VIEW } from './constants.js';

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SpawnPoint {
  x: number;
  y: number;
}

export class World {
  readonly tileSize: number = TILE;
  readonly width: number = 20;  // tiles
  readonly height: number = 11; // tiles
  readonly spawns: Map<string, SpawnPoint>;
  private solids: boolean[][];

  constructor() {
    this.solids = this.createArenaLayout();
    this.spawns = this.createSpawnPoints();
  }

  private createArenaLayout(): boolean[][] {
    // TowerFall-style arena: side platforms, central pit, high ledges
    const solids: boolean[][] = [];
    
    for (let y = 0; y < this.height; y++) {
      const row: boolean[] = [];
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

  private createSpawnPoints(): Map<string, SpawnPoint> {
    const spawns = new Map<string, SpawnPoint>();
    
    // Four spawn points, far apart
    spawns.set('p1', { x: 32, y: 128 });      // Left platform
    spawns.set('p2', { x: 288, y: 128 });     // Right platform
    spawns.set('p3', { x: 160, y: 48 });      // Top center
    spawns.set('p4', { x: 160, y: 144 });     // Bottom center
    
    // NPC spawns (for survival mode)
    spawns.set('npc1', { x: 96, y: 128 });
    spawns.set('npc2', { x: 224, y: 128 });
    
    return spawns;
  }

  worldToTile(x: number, y: number): { tx: number; ty: number } {
    return {
      tx: Math.floor(x / this.tileSize),
      ty: Math.floor(y / this.tileSize)
    };
  }

  isSolid(tx: number, ty: number): boolean {
    if (ty < 0 || ty >= this.height || tx < 0 || tx >= this.width) {
      return true; // Out of bounds is solid
    }
    return this.solids[ty]?.[tx] === true;
  }

  checkCollision(x: number, y: number, width: number, height: number): boolean {
    const leftTile = Math.floor(x / this.tileSize);
    const rightTile = Math.floor((x + width) / this.tileSize);
    const topTile = Math.floor(y / this.tileSize);
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

  checkOnGround(entity: Bounds): boolean {
    const { x, y, width } = entity;
    const bottomY = y + (entity.height || 0);
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

  checkTouchingWall(entity: Bounds, direction: 'left' | 'right'): boolean {
    const { x, y, width, height } = entity;
    const leftTile = Math.floor(x / this.tileSize);
    const rightTile = Math.floor((x + width) / this.tileSize);
    const topTile = Math.floor(y / this.tileSize);
    const bottomTile = Math.floor((y + (height || 0)) / this.tileSize);

    if (direction === 'left') {
      const tileLeft = Math.floor((x - 1) / this.tileSize);
      for (let ty = topTile; ty <= bottomTile; ty++) {
        if (this.isSolid(tileLeft, ty)) {
          return true;
        }
      }
    } else {
      const tileRight = Math.floor((x + width + 1) / this.tileSize);
      for (let ty = topTile; ty <= bottomTile; ty++) {
        if (this.isSolid(tileRight, ty)) {
          return true;
        }
      }
    }
    return false;
  }

  resolveCollision(entity: { x: number; y: number; width: number; height: number; vx: number; vy: number; onGround?: boolean }): void {
    const { x, y, width, height } = entity;
    const leftTile = Math.floor(x / this.tileSize);
    const rightTile = Math.floor((x + width) / this.tileSize);
    const topTile = Math.floor(y / this.tileSize);
    const bottomTile = Math.floor((y + height) / this.tileSize);

    // Check horizontal collision
    for (let ty = topTile; ty <= bottomTile; ty++) {
      if (this.isSolid(leftTile, ty)) {
        entity.x = (leftTile + 1) * this.tileSize;
        entity.vx = 0;
      }
      if (this.isSolid(rightTile, ty)) {
        entity.x = rightTile * this.tileSize - width;
        entity.vx = 0;
      }
    }

    // Check vertical collision
    for (let tx = leftTile; tx <= rightTile; tx++) {
      if (this.isSolid(tx, topTile)) {
        entity.y = (topTile + 1) * this.tileSize;
        entity.vy = 0;
      }
      if (this.isSolid(tx, bottomTile)) {
        entity.y = bottomTile * this.tileSize - height;
        entity.vy = 0;
        if (entity.onGround !== undefined) {
          entity.onGround = true;
        }
      }
    }
  }

  // Line of sight check (for NPC AI)
  hasLineOfSight(x1: number, y1: number, x2: number, y2: number): boolean {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const steps = Math.ceil(dist / this.tileSize);
    
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = x1 + dx * t;
      const y = y1 + dy * t;
      const { tx, ty } = this.worldToTile(x, y);
      if (this.isSolid(tx, ty)) {
        return false;
      }
    }
    return true;
  }

  render(ctx: CanvasRenderingContext2D): void {
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

