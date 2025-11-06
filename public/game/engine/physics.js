// Physics System - AABB Collision & Movement
import { GRAVITY, MOVE_ACC, MAX_VEL_X, JUMP_VEL, WALL_SLIDE_MAX, COYOTE_MS, JUMP_BUFFER_MS, FIXED_DT } from './constants.js';

export class PhysicsSystem {
  constructor(world) {
    this.world = world;
  }

  updateEntity(entity, dt = FIXED_DT) {
    if (!entity || !this.world) {
      console.error('Invalid entity or world in physics update');
      return;
    }

    // Validate dt
    if (!dt || dt <= 0 || dt > 0.1) {
      dt = FIXED_DT;
    }

    try {
      // Initialize missing properties
      if (entity.wasOnGround === undefined) entity.wasOnGround = false;
      if (entity.onGround === undefined) entity.onGround = false;
      if (entity.coyoteTime === undefined) entity.coyoteTime = 0;
      if (entity.touchingWall === undefined) {
        entity.touchingWall = { left: false, right: false };
      }

      // Coyote time
      if (entity.wasOnGround && !entity.onGround) {
        entity.coyoteTime = COYOTE_MS / 1000;
      }
      if (entity.coyoteTime > 0) {
        entity.coyoteTime -= dt;
      }

      // Gravity
      if (entity.vy === undefined) entity.vy = 0;
      const clampedDt = Math.max(0, Math.min(dt, 0.1));
      entity.vy += GRAVITY * clampedDt;
      const maxFallSpeed = 640;
      if (entity.vy > maxFallSpeed) {
        entity.vy = maxFallSpeed;
      }

      // Update position (use clamped dt)
      if (entity.vx === undefined) entity.vx = 0;
      const oldX = entity.x;
      const oldY = entity.y;
      
      entity.x += entity.vx * clampedDt;
      entity.y += entity.vy * clampedDt;

      // Check ground BEFORE collision resolution
      entity.wasOnGround = entity.onGround;
      entity.onGround = this.world.checkOnGround ? this.world.checkOnGround(entity) : false;

      // Check walls BEFORE collision resolution
      if (this.world.checkTouchingWall) {
        entity.touchingWall.left = this.world.checkTouchingWall(entity, 'left');
        entity.touchingWall.right = this.world.checkTouchingWall(entity, 'right');
      } else {
        entity.touchingWall.left = false;
        entity.touchingWall.right = false;
      }

      // Resolve collisions (this will fix any position issues)
      if (this.world.resolveCollision) {
        this.world.resolveCollision(entity);
      }
      
      // Final clamp to world bounds (safety net)
      if (this.world.width && this.world.tileSize) {
        const worldWidth = this.world.width * this.tileSize;
        const worldHeight = this.world.height * this.tileSize;
        if (entity.x < 0) {
          entity.x = 0;
          entity.vx = 0;
        }
        if (entity.x + (entity.width || 12) > worldWidth) {
          entity.x = worldWidth - (entity.width || 12);
          entity.vx = 0;
        }
        if (entity.y < 0) {
          entity.y = 0;
          entity.vy = 0;
        }
        if (entity.y + (entity.height || 14) > worldHeight) {
          entity.y = worldHeight - (entity.height || 14);
          entity.vy = 0;
        }
      }
    } catch (error) {
      console.error('Error in physics updateEntity:', error);
    }
  }

  applyHorizontalMovement(entity, targetVx, dt = FIXED_DT, inAir = false) {
    if (!entity || entity.vx === undefined) return;
    
    // Clamp dt to prevent issues
    dt = Math.max(0, Math.min(dt, 0.1));
    
    if (inAir) {
      // Air movement (reduced control)
      if (Math.abs(targetVx) > 0.1) {
        entity.vx = this.approach(entity.vx, targetVx, MOVE_ACC * dt * 0.65);
      } else {
        // Air friction
        entity.vx = this.approach(entity.vx, 0, MOVE_ACC * dt * 0.3);
      }
    } else {
      // Ground movement
      if (Math.abs(targetVx) > 0.1) {
        entity.vx = this.approach(entity.vx, targetVx, MOVE_ACC * dt);
      } else {
        // Ground friction (stronger)
        entity.vx = this.approach(entity.vx, 0, MOVE_ACC * dt * 1.2);
      }
    }
    
    // Clamp velocity
    if (Math.abs(entity.vx) > MAX_VEL_X) {
      entity.vx = entity.vx > 0 ? MAX_VEL_X : -MAX_VEL_X;
    }
  }

  applyJump(entity, jumpPressed) {
    // Jump buffer - capture jump press
    if (jumpPressed && entity.jumpBuffer <= 0) {
      entity.jumpBuffer = JUMP_BUFFER_MS / 1000;
    }
    if (entity.jumpBuffer > 0) {
      entity.jumpBuffer -= FIXED_DT; // Fixed timestep
    }

    // Execute jump
    if (entity.jumpBuffer > 0 && (entity.onGround || entity.coyoteTime > 0)) {
      entity.vy = JUMP_VEL;
      entity.jumpBuffer = 0;
      entity.coyoteTime = 0;
      return true;
    }
    return false;
  }

  applyWallSlide(entity, holdingLeft, holdingRight) {
    if (!entity.onGround && entity.vy > 0) {
      if ((entity.touchingWall.left && holdingLeft) || 
          (entity.touchingWall.right && holdingRight)) {
        if (entity.vy > WALL_SLIDE_MAX) {
          entity.vy = WALL_SLIDE_MAX;
        }
      }
    }
  }

  approach(current, target, step) {
    if (current < target) {
      return Math.min(current + step, target);
    } else {
      return Math.max(current - step, target);
    }
  }
}

