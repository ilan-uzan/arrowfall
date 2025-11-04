// Level system for managing tile-based collision
export class Level {
  constructor(data) {
    this.name = data.name;
    this.tileSize = data.tileSize;
    this.width = data.width;
    this.height = data.height;
    this.spawns = data.spawns;
    this.solids = data.solids;
  }

  // Get tile coordinates from world coordinates
  worldToTile(x, y) {
    const tx = Math.floor(x / this.tileSize);
    const ty = Math.floor(y / this.tileSize);
    return { tx, ty };
  }

  // Check if a tile is solid
  isSolid(tx, ty) {
    if (ty < 0 || ty >= this.height || tx < 0 || tx >= this.width) {
      return true; // Out of bounds is solid
    }
    return this.solids[ty][tx] === true;
  }

  // AABB collision check with tiles
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

  // Resolve collision by separating entity from tiles
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

  // Check if entity is on ground
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

  // Check if entity is touching wall
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

  // Render level (for debugging/visualization)
  render(ctx) {
    ctx.fillStyle = '#242635';
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

