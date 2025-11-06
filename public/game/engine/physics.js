// Physics System - Swept AABB with Sub-stepping
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
        entity.wasOnGround = this.world.checkOnGround ? this.world.checkOnGround(entity) : false;
      }
      if (entity.onGround === undefined) {
        entity.onGround = this.world.checkOnGround ? this.world.checkOnGround(entity) : false;
      }
      if (entity.coyoteTime === undefined) entity.coyoteTime = 0;
      if (entity.touchingWall === undefined) {
        entity.touchingWall = { left: false, right: false };
      }
      if (entity.vx === undefined) entity.vx = 0;
      if (entity.vy === undefined) entity.vy = 0;

      // Store old ground state BEFORE checking new state
      const wasOnGroundBefore = entity.onGround;

      // Coyote time - check if we just left the ground
      if (wasOnGroundBefore && !entity.onGround) {
        entity.coyoteTime = COYOTE_MS / 1000;
      }
      if (entity.coyoteTime > 0) {
        entity.coyoteTime -= dt;
      }

      // Apply gravity
      const clampedDt = Math.max(0, Math.min(dt, 0.1));
      entity.vy += GRAVITY * clampedDt;
      const maxFallSpeed = 640;
      if (entity.vy > maxFallSpeed) {
        entity.vy = maxFallSpeed;
      }

      // Store old ground state before movement
      entity.wasOnGround = entity.onGround;

      // NEW APPROACH: Swept AABB with sub-stepping
      // Break movement into smaller steps for more accurate collision detection
      const subSteps = 4; // Check collisions 4 times per frame
      const subDt = clampedDt / subSteps;
      
      for (let step = 0; step < subSteps; step++) {
        // Calculate movement for this sub-step
        const moveX = entity.vx * subDt;
        const moveY = entity.vy * subDt;
        
        // Swept collision detection - check along movement path
        const collision = this.sweptCollision(entity, moveX, moveY);
        
        if (collision.hit) {
          // Collision detected - resolve it
          if (collision.normalX !== 0) {
            // Horizontal collision
            entity.x = collision.x;
            entity.vx = 0;
            if (collision.normalX < 0) {
              entity.touchingWall.left = true;
            } else {
              entity.touchingWall.right = true;
            }
          }
          
          if (collision.normalY !== 0) {
            // Vertical collision
            entity.y = collision.y;
            entity.vy = 0;
            if (collision.normalY > 0) {
              // Hit ground
              entity.onGround = true;
            }
          }
        } else {
          // No collision - move freely
          entity.x += moveX;
          entity.y += moveY;
        }
        
        // Update ground state after each sub-step
        if (step === subSteps - 1) {
          // Final sub-step - check ground state
          entity.onGround = this.world.checkOnGround ? this.world.checkOnGround(entity) : false;
        }
        
        // Update wall touching state
        if (this.world.checkTouchingWall) {
          entity.touchingWall.left = this.world.checkTouchingWall(entity, 'left');
          entity.touchingWall.right = this.world.checkTouchingWall(entity, 'right');
        } else {
          entity.touchingWall.left = false;
          entity.touchingWall.right = false;
        }
        
        // Apply wrapping after each sub-step
        const wrapped = wrapPosition(entity.x, entity.y);
        entity.x = wrapped.x;
        entity.y = wrapped.y;
      }
    } catch (error) {
      console.error('Error in physics updateEntity:', error);
    }
  }

  // Swept AABB collision detection - checks along movement path
  sweptCollision(entity, moveX, moveY) {
    const x = entity.x || 0;
    const y = entity.y || 0;
    const width = entity.width || 12;
    const height = entity.height || 14;
    
    if (width <= 0 || height <= 0) {
      return { hit: false };
    }

    // Calculate new position
    const newX = x + moveX;
    const newY = y + moveY;

    // Check for collisions at new position
    const leftTile = Math.floor(newX / this.world.tileSize);
    const rightTile = Math.floor((newX + width) / this.world.tileSize);
    const topTile = Math.floor(newY / this.world.tileSize);
    const bottomTile = Math.floor((newY + height) / this.world.tileSize);

    let hitX = false;
    let hitY = false;
    let normalX = 0;
    let normalY = 0;
    let resolvedX = newX;
    let resolvedY = newY;

    // Check horizontal collisions first
    if (moveX !== 0) {
      for (let ty = topTile; ty <= bottomTile; ty++) {
        if (moveX > 0 && this.world.isSolid(rightTile, ty)) {
          // Moving right, hit right wall
          resolvedX = rightTile * this.world.tileSize - width;
          hitX = true;
          normalX = 1;
          break;
        } else if (moveX < 0 && this.world.isSolid(leftTile, ty)) {
          // Moving left, hit left wall
          resolvedX = (leftTile + 1) * this.world.tileSize;
          hitX = true;
          normalX = -1;
          break;
        }
      }
    }

    // Check vertical collisions (using resolved X position)
    if (moveY !== 0) {
      const resolvedLeftTile = Math.floor(resolvedX / this.world.tileSize);
      const resolvedRightTile = Math.floor((resolvedX + width) / this.world.tileSize);
      
      for (let tx = resolvedLeftTile; tx <= resolvedRightTile; tx++) {
        if (moveY > 0 && this.world.isSolid(tx, bottomTile)) {
          // Moving down, hit ground
          resolvedY = bottomTile * this.world.tileSize - height;
          hitY = true;
          normalY = 1;
          break;
        } else if (moveY < 0 && this.world.isSolid(tx, topTile)) {
          // Moving up, hit ceiling
          resolvedY = (topTile + 1) * this.world.tileSize;
          hitY = true;
          normalY = -1;
          break;
        }
      }
    }

    return {
      hit: hitX || hitY,
      x: resolvedX,
      y: resolvedY,
      normalX: normalX,
      normalY: normalY
    };
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
    
    // NEW APPROACH: Exponential interpolation for smoother, more responsive movement
    const acceleration = inAir ? MOVE_ACC * 0.65 : MOVE_ACC;
    const friction = inAir ? MOVE_ACC * 0.3 : MOVE_ACC * 0.8;
    
    if (Math.abs(targetVx) > 0.1) {
      // Accelerate towards target velocity using exponential approach
      const diff = targetVx - entity.vx;
      const accel = Math.sign(diff) * Math.min(Math.abs(diff), acceleration * dt);
      entity.vx += accel;
    } else {
      // Apply friction - exponential decay
      const frictionForce = Math.sign(entity.vx) * Math.min(Math.abs(entity.vx), friction * dt);
      entity.vx -= frictionForce;
      
      // Snap to zero if very small
      if (Math.abs(entity.vx) < 5) {
        entity.vx = 0;
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

    // Execute jump - can jump from ground, coyote time, or wall
    const canJump = entity.onGround || entity.coyoteTime > 0 || 
                    (entity.touchingWall && (entity.touchingWall.left || entity.touchingWall.right));
    
    if (entity.jumpBuffer > 0 && canJump) {
      entity.vy = JUMP_VEL;
      
      // Wall-jump: push away from wall
      if (!entity.onGround && entity.coyoteTime <= 0 && entity.touchingWall) {
        if (entity.touchingWall.left) {
          entity.vx = MAX_VEL_X * 0.8; // Push right
        } else if (entity.touchingWall.right) {
          entity.vx = -MAX_VEL_X * 0.8; // Push left
        }
      }
      
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
}
