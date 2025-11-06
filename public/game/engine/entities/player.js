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
    this.facing = id === 1 ? 1 : (id === 2 ? -1 : 1); // Alternate facing direction
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
    if (this.dead || !actions || !world || !this.physics) {
      return null;
    }

    // Validate dt
    if (!dt || dt <= 0 || dt > 0.1) {
      dt = 1/120; // Default to fixed timestep if invalid
    }

    try {
      // Initialize velocity if needed
      if (this.vx === undefined) this.vx = 0;
      if (this.vy === undefined) this.vy = 0;
      
      // Use current ground state (from previous frame) for movement
      const inAir = !this.onGround;
      
      // Horizontal movement - use axisX proportionally for smooth control
      let targetVx = 0;
      
      // Priority: axisX > boolean left/right
      // Only use axisX if it's significant (above deadzone threshold)
      if (actions.axisX !== undefined && !isNaN(actions.axisX) && Math.abs(actions.axisX) > 0.15) {
        // Use axisX value proportionally (0 to 1) scaled to MAX_VEL_X
        // This gives smooth, proportional control instead of instant full speed
        targetVx = actions.axisX * MAX_VEL_X;
        this.facing = actions.axisX > 0 ? 1 : -1;
      } else {
        // Only use boolean left/right if axisX is not significant or undefined
        // This prevents conflicts between axisX and boolean left/right
        // Explicitly check that left/right are boolean true (not just truthy)
        if (actions.left === true && actions.right !== true) {
          targetVx = -MAX_VEL_X;
          this.facing = -1;
        } else if (actions.right === true && actions.left !== true) {
          targetVx = MAX_VEL_X;
          this.facing = 1;
        }
        // If neither left nor right, targetVx stays 0
      }
      
      // Ensure targetVx is valid (not NaN or Infinity)
      if (isNaN(targetVx) || !isFinite(targetVx)) {
        targetVx = 0;
      }

      // Apply movement BEFORE physics update (uses previous frame's ground state)
      this.physics.applyHorizontalMovement(this, targetVx, dt, inAir);

      // Jumping
      if (actions.jump) {
        this.physics.applyJump(this, true);
      }

      // Wall slide
      this.physics.applyWallSlide(this, actions.left || false, actions.right || false);

      // Update physics (this applies velocity to position and updates ground state)
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
    } catch (error) {
      console.error(`Error updating player ${this.id}:`, error);
      return null;
    }
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

  render(ctx, offsetX = 0, offsetY = 0) {
    if (this.dead) {
      ctx.globalAlpha = 0.5;
    }

    const renderX = this.x + offsetX;
    const renderY = this.y + offsetY;

    // Draw player body
    ctx.fillStyle = this.color;
    ctx.fillRect(renderX, renderY, this.width, this.height);
    
    // Draw outline
    ctx.strokeStyle = PALETTE.ink;
    ctx.globalAlpha = 0.6;
    ctx.lineWidth = 1;
    ctx.strokeRect(renderX, renderY, this.width, this.height);
    ctx.globalAlpha = 1.0;
    
    // Draw simple face/eyes
    ctx.fillStyle = PALETTE.ink;
    const eyeY = renderY + 6;
    ctx.fillRect(renderX + 3, eyeY, 2, 2); // Left eye
    ctx.fillRect(renderX + 7, eyeY, 2, 2); // Right eye

    // Draw arrow indicator
    if (this.arrows > 0) {
      ctx.fillStyle = PALETTE.accent3;
      ctx.fillRect(renderX + this.width / 2 - 1, renderY - 4, 2, 3);
    }

    ctx.globalAlpha = 1.0;
  }
}

