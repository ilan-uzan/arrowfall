// Physics System - Fixed Timestep, AABB Collision & Movement
import { GRAVITY, MOVE_ACC, MAX_VEL_X, JUMP_VEL, WALL_SLIDE_MAX, COYOTE_MS, JUMP_BUFFER_MS, FIXED_DT } from './constants.js';
import { wrapPosition } from './wrap.js';

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
      if (entity.wasOnGround === undefined) {
        // First frame - check ground state
        entity.wasOnGround = this.world.checkOnGround ? this.world.checkOnGround(entity) : false;
      }
      if (entity.onGround === undefined) {
        // Check ground state on first update
        entity.onGround = this.world.checkOnGround ? this.world.checkOnGround(entity) : false;
      }
      if (entity.coyoteTime === undefined) entity.coyoteTime = 0;
      if (entity.touchingWall === undefined) {
        entity.touchingWall = { left: false, right: false };
      }

      // Store old ground state BEFORE checking new state
      const wasOnGroundBefore = entity.onGround;

      // Coyote time - check if we just left the ground
      if (wasOnGroundBefore && !entity.onGround) {
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
      
      // Store old ground state before movement
      entity.wasOnGround = entity.onGround;
      
      // 3. Integrate velocity → tentative new position
      entity.x += entity.vx * clampedDt;
      entity.y += entity.vy * clampedDt;

      // 4. Apply screen wrapping (toroidal world)
      const wrapped = wrapPosition(entity.x, entity.y);
      entity.x = wrapped.x;
      entity.y = wrapped.y;

      // 5. Check ground/walls AFTER position update but BEFORE collision resolution
      // This ensures onGround is accurate for the next frame
      const wasOnGround = entity.onGround;
      entity.onGround = this.world.checkOnGround ? this.world.checkOnGround(entity) : false;
      
      // Update wasOnGround for coyote time
      if (entity.wasOnGround === undefined) {
        entity.wasOnGround = wasOnGround;
      }

      if (this.world.checkTouchingWall) {
        entity.touchingWall.left = this.world.checkTouchingWall(entity, 'left');
        entity.touchingWall.right = this.world.checkTouchingWall(entity, 'right');
      } else {
        entity.touchingWall.left = false;
        entity.touchingWall.right = false;
      }

      // 6. Resolve collisions (one axis at a time to avoid tunneling)
      if (this.world.resolveCollision) {
        this.world.resolveCollision(entity);
      }
      
      // 7. Apply wrapping again if collision pushed object across boundary
      const wrappedAfterCollision = wrapPosition(entity.x, entity.y);
      entity.x = wrappedAfterCollision.x;
      entity.y = wrappedAfterCollision.y;
    } catch (error) {
      console.error('Error in physics updateEntity:', error);
    }
  }

  applyHorizontalMovement(entity, targetVx, dt = FIXED_DT, inAir = false) {
    if (!entity || entity.vx === undefined) return;
    
    // Clamp dt to prevent issues
    dt = Math.max(0, Math.min(dt, 0.1));
    
    // Validate and clamp targetVx
    if (isNaN(targetVx) || !isFinite(targetVx)) {
      targetVx = 0;
    }
    
    // Clamp targetVx to max velocity
    if (Math.abs(targetVx) > MAX_VEL_X) {
      targetVx = targetVx > 0 ? MAX_VEL_X : -MAX_VEL_X;
    }
    
    // Ensure entity.vx is valid
    if (isNaN(entity.vx) || !isFinite(entity.vx)) {
      entity.vx = 0;
    }
    
    if (inAir) {
      // Air movement (reduced control)
      if (Math.abs(targetVx) > 0.1) {
        entity.vx = this.approach(entity.vx, targetVx, MOVE_ACC * dt * 0.65);
      } else {
        // Air friction (lighter)
        entity.vx = this.approach(entity.vx, 0, MOVE_ACC * dt * 0.3);
      }
    } else {
      // Ground movement - responsive and smooth
      if (Math.abs(targetVx) > 0.1) {
        // Accelerate towards target velocity (works on ground!)
        entity.vx = this.approach(entity.vx, targetVx, MOVE_ACC * dt);
      } else {
        // Ground friction (stop quickly when no input)
        entity.vx = this.approach(entity.vx, 0, MOVE_ACC * dt * 0.8);
      }
    }
    
    // Final clamp velocity and validate
    if (Math.abs(entity.vx) > MAX_VEL_X) {
      entity.vx = entity.vx > 0 ? MAX_VEL_X : -MAX_VEL_X;
    }
    
    // Final safety check
    if (isNaN(entity.vx) || !isFinite(entity.vx)) {
      entity.vx = 0;
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

