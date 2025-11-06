// Arrow Entity
import { PALETTE } from '../constants.js';

export class Arrow {
  constructor(x, y, vx, vy, ownerId) {
    this.x = x;
    this.y = y;
    this.width = 8;
    this.height = 2;
    this.vx = vx;
    this.vy = vy;
    this.ownerId = ownerId;
    this.embedded = false;
    this.active = true;
    this.trail = [];
  }

  update(dt, world) {
    if (!this.active || this.embedded || !world) return;

    // Validate dt
    if (!dt || dt <= 0 || dt > 0.1) {
      dt = 1/60;
    }

    try {
      // Apply gravity
      const arrowGravity = 280;
      this.vy += arrowGravity * dt;

      // Update position
      const oldX = this.x;
      const oldY = this.y;
      this.x += this.vx * dt;
      this.y += this.vy * dt;

      // Add to trail
      if (!this.trail) {
        this.trail = [];
      }
      this.trail.push({ x: oldX, y: oldY });
      if (this.trail.length > 3) {
        this.trail.shift();
      }

      // Check collision with world
      if (world.checkCollision && world.checkCollision(this.x, this.y, this.width, this.height)) {
        // Embed in wall/floor
        this.embedded = true;
        this.vx = 0;
        this.vy = 0;
        // Snap to grid
        if (world.tileSize) {
          this.x = Math.floor(this.x / world.tileSize) * world.tileSize;
          this.y = Math.floor(this.y / world.tileSize) * world.tileSize;
        }
      }

      // Check bounds
      if (world.width && world.tileSize) {
        const worldWidth = world.width * world.tileSize;
        const worldHeight = world.height * world.tileSize;
        if (this.x < 0 || this.x > worldWidth || this.y < 0 || this.y > worldHeight) {
          this.active = false;
        }
      }
    } catch (error) {
      console.error('Error updating arrow:', error);
      this.active = false;
    }
  }

  remove() {
    this.active = false;
  }

  getBounds() {
    return {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
      ownerId: this.ownerId
    };
  }

  render(ctx) {
    if (!this.active) return;

    if (this.embedded) {
      // Draw as pickup item (pulsing)
      ctx.fillStyle = PALETTE.arrow;
      ctx.globalAlpha = 0.8;
      ctx.fillRect(this.x, this.y, this.width, this.height);
      ctx.globalAlpha = 1.0;
    } else {
      // Draw arrow with trail
      ctx.strokeStyle = PALETTE.arrow;
      ctx.lineWidth = 1;
      
      // Draw trail
      if (this.trail.length > 1) {
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.moveTo(this.trail[0].x + this.width / 2, this.trail[0].y + this.height / 2);
        for (let i = 1; i < this.trail.length; i++) {
          ctx.lineTo(this.trail[i].x + this.width / 2, this.trail[i].y + this.height / 2);
        }
        ctx.stroke();
        ctx.globalAlpha = 1.0;
      }
      
      // Draw arrow
      ctx.fillStyle = PALETTE.arrow;
      ctx.fillRect(this.x, this.y, this.width, this.height);
      
      // Draw direction indicator
      const angle = Math.atan2(this.vy, this.vx);
      ctx.save();
      ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
      ctx.rotate(angle);
      ctx.fillStyle = PALETTE.accent;
      ctx.fillRect(2, -1, 2, 2);
      ctx.restore();
    }
  }
}

