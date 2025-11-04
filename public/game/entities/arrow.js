// Arrow Entity - Arrowfall
import { ARROW_SPEED, PALETTE } from '../constants.js';

export class Arrow {
  constructor(x, y, vx, vy, ownerId, game) {
    this.game = game;
    this.x = x;
    this.y = y;
    this.width = 8;
    this.height = 2;
    this.vx = vx;
    this.vy = vy;
    this.ownerId = ownerId;
    this.embedded = false;
    this.active = true;
    this.trail = []; // Last 3 positions
  }

  update(dt, level) {
    if (!this.active || this.embedded) return;

    // Apply gravity
    const arrowGravity = 280;
    this.vy += arrowGravity * dt;

    // Update position
    const oldX = this.x;
    const oldY = this.y;
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Add to trail
    this.trail.push({ x: oldX, y: oldY });
    if (this.trail.length > 3) {
      this.trail.shift();
    }

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

  remove() {
    this.active = false;
  }

  render(ctx) {
    if (!this.active) return;

    if (this.embedded) {
      // Draw as pickup item
      ctx.fillStyle = PALETTE.accent3;
      ctx.beginPath();
      ctx.arc(this.x + this.width / 2, this.y + this.height / 2, 6, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Draw trail
      this.trail.forEach((pos, i) => {
        const alpha = (i + 1) / this.trail.length * 0.3;
        ctx.fillStyle = PALETTE.arrow;
        ctx.globalAlpha = alpha;
        ctx.fillRect(pos.x, pos.y, 2, 2);
      });
      ctx.globalAlpha = 1.0;

      // Draw arrow
      ctx.fillStyle = PALETTE.arrow;
      ctx.save();
      ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
      const angle = Math.atan2(this.vy, this.vx);
      ctx.rotate(angle);
      
      // Arrow shaft
      ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
      
      // Arrow head
      ctx.fillStyle = PALETTE.ink;
      ctx.beginPath();
      ctx.moveTo(this.width / 2, 0);
      ctx.lineTo(this.width / 2 - 3, -2);
      ctx.lineTo(this.width / 2 - 3, 2);
      ctx.closePath();
      ctx.fill();
      
      ctx.restore();
    }
  }

  getBounds() {
    return {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height
    };
  }
}
