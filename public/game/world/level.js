// Level system - Arrowfall
import { PALETTE, TILE } from '../constants.js';

export class Level {
  constructor(data) {
    this.name = data.name || 'Arena';
    this.tileSize = data.tileSize || TILE;
    this.width = data.width || 20;
    this.height = data.height || 11;
    this.spawns = data.spawns || { p1: [32, 128], p2: [288, 128] };
    this.solids = data.solids || [];
  }

  worldToTile(x, y) {
    const tx = Math.floor(x / this.tileSize);
    const ty = Math.floor(y / this.tileSize);
    return { tx, ty };
  }

  isSolid(tx, ty) {
    if (ty < 0 || ty >= this.height || tx < 0 || tx >= this.width) {
      return true; // Out of bounds is solid
    }
    return this.solids[ty] && this.solids[ty][tx] === true;
  }

  checkCollision(x, y, width, height) {
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

  resolveCollision(entity) {
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
        entity.onGround = true;
      }
    }
  }

  checkOnGround(entity) {
    const { x, y, width, height } = entity;
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
    const { x, y, width, height } = entity;
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

  render(ctx) {
    ctx.fillStyle = PALETTE.bg1;
    for (let ty = 0; ty < this.height; ty++) {
      for (let tx = 0; tx < this.width; tx++) {
        if (this.isSolid(tx, ty)) {
          ctx.fillRect(
            tx * this.tileSize,
            ty * this.tileSize,
            this.tileSize,
            this.tileSize
          );
        }
      }
    }
  }
}
