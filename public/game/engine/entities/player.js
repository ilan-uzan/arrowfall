// Player Entity
import { MAX_VEL_X, START_ARROWS, MAX_ARROWS, ARROW_SPEED, PALETTE } from '../constants.js';
import { PhysicsSystem } from '../physics.js';
import { Arrow } from './arrow.js';

export class Player {
  constructor(x, y, id, color, physics) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.width = 12;
    this.height = 14;
    this.vx = 0;
    this.vy = 0;
    this.color = color;
    this.facing = 1; // 1 = right, -1 = left
    this.onGround = false;
    this.wasOnGround = false;
    this.touchingWall = { left: false, right: false };
    this.coyoteTime = 0;
    this.jumpBuffer = 0;
    this.arrows = START_ARROWS;
    this.maxArrows = MAX_ARROWS;
    this.dead = false;
    this.wins = 0;
    this.shootHeld = false;
    this.physics = physics;
  }

  update(dt, world, actions) {
    if (this.dead || !actions) return;

    // Horizontal movement
    let targetVx = 0;
    if (actions.left) {
      targetVx = -MAX_VEL_X;
      this.facing = -1;
    } else if (actions.right) {
      targetVx = MAX_VEL_X;
      this.facing = 1;
    }

    this.physics.applyHorizontalMovement(this, targetVx, dt, !this.onGround);

    // Jumping
    if (actions.jump) {
      this.physics.applyJump(this, true);
    }

    // Wall slide
    this.physics.applyWallSlide(this, actions.left, actions.right);

    // Update physics
    this.physics.updateEntity(this, dt);

    // Shooting
    if (actions.shoot && !this.shootHeld) {
      this.shootHeld = true;
      return this.fireArrow();
    }
    if (!actions.shoot) {
      this.shootHeld = false;
    }
    return null;
  }

  fireArrow() {
    if (this.arrows <= 0 || this.dead) return null;
    
    this.arrows--;
    const spawnX = this.x + (this.width / 2) + (this.facing * 12);
    const spawnY = this.y + (this.height / 2);
    return new Arrow(
      spawnX,
      spawnY,
      this.facing * ARROW_SPEED,
      0,
      this.id
    );
  }

  pickupArrow() {
    if (this.arrows < this.maxArrows) {
      this.arrows++;
      return true;
    }
    return false;
  }

  die() {
    this.dead = true;
    this.vx = 0;
    this.vy = 0;
  }

  respawn(x, y) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.dead = false;
    this.arrows = START_ARROWS;
    this.coyoteTime = 0;
    this.jumpBuffer = 0;
  }

  getBounds() {
    return {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height
    };
  }

  isStomping() {
    return this.vy > 220;
  }

  render(ctx) {
    if (this.dead) {
      ctx.globalAlpha = 0.5;
    }

    // Draw player body
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x, this.y, this.width, this.height);
    
    // Draw outline
    ctx.strokeStyle = PALETTE.ink;
    ctx.globalAlpha = 0.6;
    ctx.lineWidth = 1;
    ctx.strokeRect(this.x, this.y, this.width, this.height);
    ctx.globalAlpha = 1.0;
    
    // Draw simple face/eyes
    ctx.fillStyle = PALETTE.ink;
    const eyeY = this.y + 6;
    ctx.fillRect(this.x + 3, eyeY, 2, 2); // Left eye
    ctx.fillRect(this.x + 7, eyeY, 2, 2); // Right eye

    // Draw arrow indicator
    if (this.arrows > 0) {
      ctx.fillStyle = PALETTE.accent3;
      ctx.fillRect(this.x + this.width / 2 - 1, this.y - 4, 2, 3);
    }

    ctx.globalAlpha = 1.0;
  }
}

