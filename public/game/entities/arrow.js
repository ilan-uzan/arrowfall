// Arrow entity that can be fired and picked up
export class Arrow {
  constructor(x, y, vx, vy, ownerId) {
    this.x = x;
    this.y = y;
    this.width = 8;
    this.height = 8;
    this.vx = vx;
    this.vy = vy;
    this.ownerId = ownerId;
    this.embedded = false;
    this.active = true;
  }

  update(dt, level) {
    if (!this.active || this.embedded) return;

    // Apply gravity
    const arrowGravity = 280; // px/s^2
    this.vy += arrowGravity * dt;

    // Update position
    const oldX = this.x;
    const oldY = this.y;
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Check collision with level
    if (level.checkCollision(this.x, this.y, this.width, this.height)) {
      // Embed in wall/floor
      this.embedded = true;
      this.vx = 0;
      this.vy = 0;
      // Snap to grid
      const tileSize = level.tileSize;
      this.x = Math.floor(this.x / tileSize) * tileSize;
      this.y = Math.floor(this.y / tileSize) * tileSize;
    }

    // Check bounds
    const levelWidth = level.width * level.tileSize;
    const levelHeight = level.height * level.tileSize;
    if (this.x < 0 || this.x > levelWidth || this.y < 0 || this.y > levelHeight) {
      this.active = false;
    }
  }

  // Check collision with player
  checkPlayerCollision(player) {
    if (!this.active || this.embedded || player.id === this.ownerId || player.dead) {
      return false;
    }

    const playerBounds = player.getBounds();
    return (
      this.x < playerBounds.x + playerBounds.width &&
      this.x + this.width > playerBounds.x &&
      this.y < playerBounds.y + playerBounds.height &&
      this.y + this.height > playerBounds.y
    );
  }

  // Check collision with pickup range
  checkPickupCollision(player) {
    if (!this.embedded || !this.active) {
      return false;
    }

    const pickupRange = 16; // pixels
    const dx = player.x + player.width / 2 - (this.x + this.width / 2);
    const dy = player.y + player.height / 2 - (this.y + this.height / 2);
    const dist = Math.sqrt(dx * dx + dy * dy);

    return dist < pickupRange;
  }

  // Remove arrow
  remove() {
    this.active = false;
  }

  // Render arrow
  render(ctx) {
    if (!this.active) return;

    if (this.embedded) {
      // Draw as pickup item
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(this.x + this.width / 2, this.y + this.height / 2, 6, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Draw as flying arrow
      ctx.fillStyle = '#7dd3fc';
      ctx.save();
      ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
      const angle = Math.atan2(this.vy, this.vx);
      ctx.rotate(angle);
      ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
      ctx.restore();
    }
  }

  // Get bounds
  getBounds() {
    return {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height
    };
  }
}

