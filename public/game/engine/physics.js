// Physics System - Fixed Order of Operations
import { GRAVITY, MOVE_ACC, MAX_VEL_X, JUMP_VEL, WALL_SLIDE_MAX, COYOTE_MS, JUMP_BUFFER_MS, FIXED_DT } from './constants.js';
import { wrapPosition } from './wrap.js';

export class PhysicsSystem {
  constructor(world) {
    this.world = world;
  }

  // Check ground state without moving (for movement decisions)
  checkGroundState(entity) {
    if (!entity || !this.world) return false;
    
    // Initialize if needed
    if (entity.onGround === undefined) {
      entity.onGround = this.world.checkOnGround ? this.world.checkOnGround(entity) : false;
    }
    if (entity.wasOnGround === undefined) {
      entity.wasOnGround = entity.onGround;
    }
    
    // Update ground state
    const wasOnGround = entity.onGround;
    entity.onGround = this.world.checkOnGround ? this.world.checkOnGround(entity) : false;
    entity.wasOnGround = wasOnGround;
    
    // Update coyote time
    if (wasOnGround && !entity.onGround) {
      entity.coyoteTime = COYOTE_MS / 1000;
    }
    
    return entity.onGround;
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
      if (entity.vx === undefined) entity.vx = 0;
      if (entity.vy === undefined) entity.vy = 0;
      if (entity.coyoteTime === undefined) entity.coyoteTime = 0;
      if (entity.touchingWall === undefined) {
        entity.touchingWall = { left: false, right: false };
      }

      // Update coyote time
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

      // Move entity with sub-stepping for accuracy
      const subSteps = 2;
      const subDt = clampedDt / subSteps;
      
      for (let step = 0; step < subSteps; step++) {
        // Calculate movement for this sub-step
        const moveX = entity.vx * subDt;
        const moveY = entity.vy * subDt;
        
        // Try to move
        const newX = entity.x + moveX;
        const newY = entity.y + moveY;
        
        // Check collisions at new position
        let finalX = newX;
        let finalY = newY;
        
        // Check horizontal collision
        if (moveX !== 0) {
          const leftTile = Math.floor(newX / this.world.tileSize);
          const rightTile = Math.floor((newX + (entity.width || 12)) / this.world.tileSize);
          const topTile = Math.floor(newY / this.world.tileSize);
          const bottomTile = Math.floor((newY + (entity.height || 14)) / this.world.tileSize);
          
          for (let ty = topTile; ty <= bottomTile; ty++) {
            if (moveX > 0 && this.world.isSolid(rightTile, ty)) {
              // Hit right wall
              finalX = rightTile * this.world.tileSize - (entity.width || 12);
              entity.vx = 0;
              entity.touchingWall.right = true;
              break;
            } else if (moveX < 0 && this.world.isSolid(leftTile, ty)) {
              // Hit left wall
              finalX = (leftTile + 1) * this.world.tileSize;
              entity.vx = 0;
              entity.touchingWall.left = true;
              break;
            }
          }
        }
        
        // Check vertical collision (using resolved X)
        if (moveY !== 0) {
          const leftTile = Math.floor(finalX / this.world.tileSize);
          const rightTile = Math.floor((finalX + (entity.width || 12)) / this.world.tileSize);
          const topTile = Math.floor(newY / this.world.tileSize);
          const bottomTile = Math.floor((newY + (entity.height || 14)) / this.world.tileSize);
          
          for (let tx = leftTile; tx <= rightTile; tx++) {
            if (moveY > 0 && this.world.isSolid(tx, bottomTile)) {
              // Hit ground
              finalY = bottomTile * this.world.tileSize - (entity.height || 14);
              entity.vy = 0;
              entity.onGround = true;
              break;
            } else if (moveY < 0 && this.world.isSolid(tx, topTile)) {
              // Hit ceiling
              finalY = (topTile + 1) * this.world.tileSize;
              entity.vy = 0;
              break;
            }
          }
        }
        
        // Update position
        entity.x = finalX;
        entity.y = finalY;
        
        // Update wall touching state
        if (this.world.checkTouchingWall) {
          entity.touchingWall.left = this.world.checkTouchingWall(entity, 'left');
          entity.touchingWall.right = this.world.checkTouchingWall(entity, 'right');
        } else {
          entity.touchingWall.left = false;
          entity.touchingWall.right = false;
        }
        
        // Update ground state
        entity.onGround = this.world.checkOnGround ? this.world.checkOnGround(entity) : false;
        
        // Apply wrapping after each sub-step
        const wrapped = wrapPosition(entity.x, entity.y);
        entity.x = wrapped.x;
        entity.y = wrapped.y;
      }
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
    
    // Direct acceleration towards target
    const acceleration = inAir ? MOVE_ACC * 0.6 : MOVE_ACC;
    const friction = inAir ? MOVE_ACC * 0.25 : MOVE_ACC * 0.85;
    
    if (Math.abs(targetVx) > 0.01) {
      // Accelerate towards target velocity
      const diff = targetVx - entity.vx;
      const accel = Math.sign(diff) * Math.min(Math.abs(diff), acceleration * dt);
      entity.vx += accel;
    } else {
      // Apply friction
      if (Math.abs(entity.vx) > 0.01) {
        const frictionForce = Math.sign(entity.vx) * Math.min(Math.abs(entity.vx), friction * dt);
        entity.vx -= frictionForce;
      } else {
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
      entity.jumpBuffer -= FIXED_DT;
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
