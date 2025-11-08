// Physics System - Classic Platformer (Always Apply Gravity)
import { GRAVITY, MOVE_ACC, MAX_VEL_X, JUMP_VEL, WALL_SLIDE_MAX, COYOTE_MS, JUMP_BUFFER_MS, FIXED_DT } from './constants.js';
import { wrapPosition } from './wrap.js';

export class PhysicsSystem {
  constructor(world) {
    this.world = world;
  }

  updateEntity(entity, dt = FIXED_DT) {
    if (!entity || !this.world) return;

    // Validate dt
    if (!dt || dt <= 0 || dt > 0.1) {
      dt = FIXED_DT;
    }

    try {
      // Initialize properties
      if (entity.vx === undefined) entity.vx = 0;
      if (entity.vy === undefined) entity.vy = 0;
      if (entity.coyoteTime === undefined) entity.coyoteTime = 0;
      if (entity.touchingWall === undefined) {
        entity.touchingWall = { left: false, right: false };
      }

      // Store old ground state
      const wasOnGround = entity.onGround;
      
      // Check ground state BEFORE movement
      entity.onGround = this.isOnGround(entity);
      
      // Update coyote time
      if (wasOnGround && !entity.onGround) {
        entity.coyoteTime = COYOTE_MS / 1000;
      }
      if (entity.coyoteTime > 0) {
        entity.coyoteTime -= dt;
      }

      // Apply gravity ONLY if not on ground (prevents bouncing when on ground)
      const clampedDt = Math.max(0, Math.min(dt, 0.1));
      if (!entity.onGround) {
        entity.vy += GRAVITY * clampedDt;
        const maxFallSpeed = 640;
        if (entity.vy > maxFallSpeed) {
          entity.vy = maxFallSpeed;
        }
      } else {
        // On ground - ensure velocity is zero
        if (entity.vy > 0) {
          entity.vy = 0;
        }
      }

      // Move horizontally FIRST
      if (entity.vx !== 0) {
        const moveX = entity.vx * clampedDt;
        const newX = entity.x + moveX;
        
        // Check horizontal collision
        if (this.hasCollision(newX, entity.y, entity.width || 12, entity.height || 14)) {
          // Hit wall - stop and snap
          if (moveX > 0) {
            const rightTile = Math.floor((entity.x + (entity.width || 12)) / this.world.tileSize);
            entity.x = rightTile * this.world.tileSize - (entity.width || 12);
            entity.touchingWall.right = true;
          } else {
            const leftTile = Math.floor(entity.x / this.world.tileSize);
            entity.x = (leftTile + 1) * this.world.tileSize;
            entity.touchingWall.left = true;
          }
          entity.vx = 0;
        } else {
          entity.x = newX;
          entity.touchingWall.left = false;
          entity.touchingWall.right = false;
        }
      }

      // Move vertically SECOND
      if (entity.vy !== 0) {
        const moveY = entity.vy * clampedDt;
        const newY = entity.y + moveY;
        
        // Check vertical collision
        if (this.hasCollision(entity.x, newY, entity.width || 12, entity.height || 14)) {
          // Hit floor or ceiling
          if (moveY > 0) {
            // Moving down - hit ground
            const bottomTile = Math.floor((entity.y + (entity.height || 14)) / this.world.tileSize);
            entity.y = bottomTile * this.world.tileSize - (entity.height || 14);
            entity.vy = 0;
            entity.onGround = true;
            // CRITICAL: Stop gravity when on ground to prevent bouncing
            entity.vy = 0;
          } else {
            // Moving up - hit ceiling
            const topTile = Math.floor(entity.y / this.world.tileSize);
            entity.y = (topTile + 1) * this.world.tileSize;
            entity.vy = 0;
          }
        } else {
          entity.y = newY;
          // Only set onGround to false if actually falling
          if (moveY > 0 && entity.vy > 0) {
            entity.onGround = false;
          }
        }
      }

      // Final ground check - only snap if entity is very close to ground and not moving
      // This prevents bouncing loops in pits
      if (!entity.onGround && entity.vy === 0 && Math.abs(entity.vx) < 5) {
        const bottomY = entity.y + (entity.height || 14);
        const leftTile = Math.floor(entity.x / this.world.tileSize);
        const rightTile = Math.floor((entity.x + (entity.width || 12) - 0.1) / this.world.tileSize);
        const tileBelow = Math.floor(bottomY / this.world.tileSize);
        
        for (let tx = leftTile; tx <= rightTile; tx++) {
          if (this.world.isSolid(tx, tileBelow)) {
            const groundY = tileBelow * this.world.tileSize;
            const distance = bottomY - groundY;
            // Only snap if very close (within 2 pixels) to prevent bouncing
            if (distance > 0 && distance <= 2) {
              entity.y = groundY - (entity.height || 14);
              entity.onGround = true;
              entity.vy = 0; // Ensure velocity is zero
              break;
            }
          }
        }
      }

      // Update wall touching state
      entity.touchingWall.left = this.isTouchingWall(entity, 'left');
      entity.touchingWall.right = this.isTouchingWall(entity, 'right');

      // Final ground state check (after all movement)
      // CRITICAL: Don't check ground if entity is moving up fast (jumping)
      // This prevents ground detection from interfering with jumps
      if (entity.vy >= -100) {
        entity.onGround = this.isOnGround(entity);
      } else {
        // If jumping up fast, definitely not on ground
        entity.onGround = false;
      }
      
      // If on ground, ensure velocity is zero (but allow upward velocity for jumps)
      if (entity.onGround && entity.vy > 0) {
        entity.vy = 0;
      }

      // Apply wrapping
      const wrapped = wrapPosition(entity.x, entity.y);
      entity.x = wrapped.x;
      entity.y = wrapped.y;
    } catch (error) {
      console.error('Error in physics updateEntity:', error);
    }
  }

  // Simple collision check
  hasCollision(x, y, width, height) {
    const leftTile = Math.floor(x / this.world.tileSize);
    const rightTile = Math.floor((x + width - 0.1) / this.world.tileSize);
    const topTile = Math.floor(y / this.world.tileSize);
    const bottomTile = Math.floor((y + height - 0.1) / this.world.tileSize);

    for (let ty = topTile; ty <= bottomTile; ty++) {
      for (let tx = leftTile; tx <= rightTile; tx++) {
        if (this.world.isSolid(tx, ty)) {
          return true;
        }
      }
    }
    return false;
  }

  // Check if entity is on ground
  isOnGround(entity) {
    if (!entity) return false;
    
    const x = entity.x || 0;
    const y = entity.y || 0;
    const width = entity.width || 12;
    const height = entity.height || 14;
    
    // Check tiles directly below the entity
    const bottomY = y + height;
    const leftTile = Math.floor(x / this.world.tileSize);
    const rightTile = Math.floor((x + width - 0.1) / this.world.tileSize);
    const tileBelow = Math.floor(bottomY / this.world.tileSize);

    for (let tx = leftTile; tx <= rightTile; tx++) {
      if (this.world.isSolid(tx, tileBelow)) {
        // Check if we're close enough to the ground (within 4 pixels for tolerance)
        const groundY = tileBelow * this.world.tileSize;
        const distanceToGround = bottomY - groundY;
        // Entity is on ground if bottom is at or slightly above/below ground level
        if (distanceToGround >= -4 && distanceToGround <= 4) {
          return true;
        }
      }
    }
    return false;
  }

  // Check if entity is touching a wall
  isTouchingWall(entity, direction) {
    if (!entity || !direction) return false;
    
    const x = entity.x || 0;
    const y = entity.y || 0;
    const width = entity.width || 12;
    const height = entity.height || 14;
    
    const topTile = Math.floor(y / this.world.tileSize);
    const bottomTile = Math.floor((y + height - 0.1) / this.world.tileSize);

    if (direction === 'left') {
      const leftTile = Math.floor(x / this.world.tileSize);
      for (let ty = topTile; ty <= bottomTile; ty++) {
        if (this.world.isSolid(leftTile, ty)) {
          return true;
        }
      }
    } else if (direction === 'right') {
      const rightTile = Math.floor((x + width) / this.world.tileSize);
      for (let ty = topTile; ty <= bottomTile; ty++) {
        if (this.world.isSolid(rightTile, ty)) {
          return true;
        }
      }
    }
    return false;
  }

  applyHorizontalMovement(entity, targetVx, dt = FIXED_DT, inAir = false) {
    if (!entity || entity.vx === undefined) return;
    
    dt = Math.max(0, Math.min(dt, 0.1));
    
    // Validate targetVx
    if (isNaN(targetVx) || !isFinite(targetVx)) {
      targetVx = 0;
    }
    
    // Clamp targetVx
    if (Math.abs(targetVx) > MAX_VEL_X) {
      targetVx = targetVx > 0 ? MAX_VEL_X : -MAX_VEL_X;
    }
    
    // Validate entity.vx
    if (isNaN(entity.vx) || !isFinite(entity.vx)) {
      entity.vx = 0;
    }
    
    // Direct acceleration towards target
    const acceleration = inAir ? MOVE_ACC * 0.6 : MOVE_ACC;
    const friction = inAir ? MOVE_ACC * 0.3 : MOVE_ACC * 0.9;
    
    if (Math.abs(targetVx) > 0.01) {
      // Accelerate towards target
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
    
    // Clamp velocity
    if (Math.abs(entity.vx) > MAX_VEL_X) {
      entity.vx = entity.vx > 0 ? MAX_VEL_X : -MAX_VEL_X;
    }
    
    // Safety check
    if (isNaN(entity.vx) || !isFinite(entity.vx)) {
      entity.vx = 0;
    }
  }

  applyJump(entity, jumpPressed) {
    // Initialize jump buffer if needed
    if (entity.jumpBuffer === undefined) {
      entity.jumpBuffer = 0;
    }
    
    // Jump buffer - only set on new press
    if (jumpPressed && entity.jumpBuffer <= 0) {
      entity.jumpBuffer = JUMP_BUFFER_MS / 1000;
    }
    if (entity.jumpBuffer > 0) {
      entity.jumpBuffer -= FIXED_DT;
    }

    // Can jump from ground, coyote time, or wall
    // CRITICAL: Only allow jump if entity is not already moving up (prevent double jumps)
    const canJump = (entity.onGround || entity.coyoteTime > 0 || 
                    (entity.touchingWall && (entity.touchingWall.left || entity.touchingWall.right))) &&
                    entity.vy >= -50; // Don't jump if already moving up fast (prevent spam)
    
    if (entity.jumpBuffer > 0 && canJump) {
      entity.vy = JUMP_VEL;
      
      // Wall-jump
      if (!entity.onGround && entity.coyoteTime <= 0 && entity.touchingWall) {
        if (entity.touchingWall.left) {
          entity.vx = MAX_VEL_X * 0.8;
        } else if (entity.touchingWall.right) {
          entity.vx = -MAX_VEL_X * 0.8;
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
