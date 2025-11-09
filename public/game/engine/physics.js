// Physics System - Simple Platformer Physics
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
      if (entity.onBottomWall === undefined) entity.onBottomWall = false;
      if (entity.jumpBuffer === undefined) entity.jumpBuffer = 0;
      if (entity.jumpCooldown === undefined) entity.jumpCooldown = 0;
      if (entity.jumpLockTime === undefined) entity.jumpLockTime = 0;
      if (entity.groundStableTime === undefined) entity.groundStableTime = 0;
      if (entity.justLanded === undefined) entity.justLanded = false;

      // Store old ground state
      const wasOnGround = entity.onGround;
      
      const clampedDt = Math.max(0, Math.min(dt, 0.1));
      
      // STEP 1: Check ground state ONCE at the start
      entity.onGround = this.isOnGround(entity);
      
      // STEP 2: Update coyote time and ground stability
      if (wasOnGround && !entity.onGround) {
        entity.coyoteTime = COYOTE_MS / 1000;
      }
      if (entity.coyoteTime > 0) {
        entity.coyoteTime -= clampedDt;
      }
      
      if (entity.onGround) {
        entity.groundStableTime += clampedDt;
      } else {
        entity.groundStableTime = 0;
        entity.justLanded = false;
      }
      
      if (entity.justLanded && entity.groundStableTime > 0.1) {
        entity.justLanded = false;
      }

      // STEP 3: Apply gravity ONLY if not on ground
      if (!entity.onGround) {
        entity.vy += GRAVITY * clampedDt;
        const maxFallSpeed = 640;
        if (entity.vy > maxFallSpeed) {
          entity.vy = maxFallSpeed;
        }
      }

      // STEP 4: Move horizontally
      entity.touchingWall.left = this.isTouchingWall(entity, 'left');
      entity.touchingWall.right = this.isTouchingWall(entity, 'right');
      
      // If touching wall, zero horizontal velocity
      if (entity.touchingWall.left || entity.touchingWall.right) {
        entity.vx = 0;
      }
      
      // Move horizontally if not touching walls
      if (!entity.touchingWall.left && !entity.touchingWall.right && entity.vx !== 0) {
        const moveX = entity.vx * clampedDt;
        const newX = entity.x + moveX;
        
        // Check horizontal collision
        if (this.hasCollision(newX, entity.y, entity.width || 12, entity.height || 14)) {
          // Hit wall - snap to wall
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
        }
      }

      // STEP 5: Move vertically
      if (entity.vy !== 0) {
        const moveY = entity.vy * clampedDt;
        const newY = entity.y + moveY;
        
        // Check vertical collision
        if (this.hasCollision(entity.x, newY, entity.width || 12, entity.height || 14)) {
          if (moveY > 0) {
            // Moving down - hit ground
            const groundTile = Math.floor((entity.y + (entity.height || 14)) / this.world.tileSize);
            entity.y = groundTile * this.world.tileSize - (entity.height || 14);
            entity.vy = 0;
            entity.onGround = true;
            
            // Landing event
            if (!wasOnGround && !entity.justLanded) {
              entity.jumpBuffer = 0;
              entity.jumpLockTime = 0.05;
              entity.justLanded = true;
              entity.groundStableTime = 0;
              entity.jumpCooldown = entity.jumpCooldown || 0;
              
              const bottomY = entity.y + (entity.height || 14);
              const bottomTile = Math.floor(bottomY / this.world.tileSize);
              const atBottomWall = bottomTile >= (this.world.height - 1);
              if (atBottomWall) {
                entity.jumpCooldown = 0.15;
                entity.jumpLockTime = 0.1;
                entity.onBottomWall = true;
              } else {
                entity.jumpCooldown = 0.1;
                entity.onBottomWall = false;
              }
            }
          } else {
            // Moving up - hit ceiling
            const topTile = Math.floor(entity.y / this.world.tileSize);
            entity.y = (topTile + 1) * this.world.tileSize;
            entity.vy = 0;
          }
        } else {
          entity.y = newY;
        }
      }

      // STEP 6: Final ground state check and position snap
      entity.onGround = this.isOnGround(entity);
      
      // If on ground, snap position and zero downward velocity
      if (entity.onGround) {
        // Snap position to ground
        const bottomY = entity.y + (entity.height || 14);
        const tileBelow = Math.floor(bottomY / this.world.tileSize);
        const leftTile = Math.floor(entity.x / this.world.tileSize);
        const rightTile = Math.floor((entity.x + (entity.width || 12) - 0.1) / this.world.tileSize);
        
        for (let tx = leftTile; tx <= rightTile; tx++) {
          if (this.world.isSolid(tx, tileBelow)) {
            const groundY = tileBelow * this.world.tileSize;
            const distance = bottomY - groundY;
            if (distance > 0 && distance <= 4) {
              entity.y = groundY - (entity.height || 14);
              // Only zero downward velocity, allow upward (jumps)
              if (entity.vy > 0) {
                entity.vy = 0;
              }
              break;
            }
          }
        }
      }
      
      // Final wall check
      entity.touchingWall.left = this.isTouchingWall(entity, 'left');
      entity.touchingWall.right = this.isTouchingWall(entity, 'right');
      if (entity.touchingWall.left || entity.touchingWall.right) {
        entity.vx = 0;
        
        // Snap position to wall
        const leftTile = Math.floor(entity.x / this.world.tileSize);
        const rightTile = Math.floor((entity.x + (entity.width || 12)) / this.world.tileSize);
        
        if (entity.touchingWall.left) {
          entity.x = (leftTile + 1) * this.world.tileSize;
        }
        if (entity.touchingWall.right) {
          entity.x = rightTile * this.world.tileSize - (entity.width || 12);
        }
      }
      
      // Bottom wall check
      const bottomY = entity.y + (entity.height || 14);
      const bottomTile = Math.floor(bottomY / this.world.tileSize);
      const atBottomWall = bottomTile >= (this.world.height - 1);
      
      if (atBottomWall) {
        entity.onBottomWall = true;
        if (entity.vy < 0) {
          entity.vy = 0;
        }
        entity.onGround = true;
      } else {
        entity.onBottomWall = false;
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
    
    const bottomY = y + height;
    const leftTile = Math.floor(x / this.world.tileSize);
    const rightTile = Math.floor((x + width - 0.1) / this.world.tileSize);
    const tileBelow = Math.floor(bottomY / this.world.tileSize);

    for (let tx = leftTile; tx <= rightTile; tx++) {
      if (this.world.isSolid(tx, tileBelow)) {
        const groundY = tileBelow * this.world.tileSize;
        const distanceToGround = bottomY - groundY;
        // Check if we're close enough to the ground (within 4 pixels for tolerance)
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
    
    // Check wall touching state BEFORE setting velocity
    const touchingLeft = this.isTouchingWall(entity, 'left');
    const touchingRight = this.isTouchingWall(entity, 'right');
    
    // If touching wall, prevent movement in that direction
    if (touchingLeft && (targetVx < 0 || entity.vx < 0)) {
      entity.vx = 0;
      return;
    }
    if (touchingRight && (targetVx > 0 || entity.vx > 0)) {
      entity.vx = 0;
      return;
    }
    
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
    // Initialize properties
    if (entity.jumpBuffer === undefined) entity.jumpBuffer = 0;
    if (entity.jumpCooldown === undefined) entity.jumpCooldown = 0;
    if (entity.jumpLockTime === undefined) entity.jumpLockTime = 0;
    
    // Update timers
    if (entity.jumpLockTime > 0) {
      entity.jumpLockTime -= FIXED_DT;
    }
    if (entity.jumpCooldown > 0) {
      entity.jumpCooldown -= FIXED_DT;
    }
    
    // Check bottom wall
    const bottomY = entity.y + (entity.height || 14);
    const bottomTile = Math.floor(bottomY / this.world.tileSize);
    const atBottomWall = bottomTile >= (this.world.height - 1);
    
    if (atBottomWall) {
      entity.jumpBuffer = 0;
      if (entity.vy < 0) {
        entity.vy = 0;
      }
      return false;
    }
    
    // Jump buffer - set on NEW press
    if (jumpPressed && entity.jumpBuffer <= 0) {
      entity.jumpBuffer = JUMP_BUFFER_MS / 1000;
    }
    
    // Decrement jump buffer
    if (entity.jumpBuffer > 0) {
      entity.jumpBuffer -= FIXED_DT;
    }
    
    // Jump conditions
    const groundStable = entity.onGround && entity.groundStableTime >= 0.01;
    const canJumpFromGround = (groundStable && entity.jumpLockTime <= 0) || entity.coyoteTime > 0;
    
    const canJump = entity.jumpBuffer > 0 &&
                    entity.jumpCooldown <= 0 &&
                    entity.jumpLockTime <= 0 &&
                    entity.vy >= -100 &&
                    (canJumpFromGround || 
                     (entity.touchingWall && (entity.touchingWall.left || entity.touchingWall.right)));
    
    if (canJump) {
      // Execute jump
      entity.vy = JUMP_VEL;
      entity.jumpCooldown = 0.2;
      entity.jumpBuffer = 0;
      entity.jumpLockTime = 0.1;
      entity.justLanded = false;
      entity.coyoteTime = 0;
      
      // Wall-jump
      if (!entity.onGround && entity.touchingWall) {
        if (entity.touchingWall.left) {
          entity.vx = MAX_VEL_X * 0.8;
        } else if (entity.touchingWall.right) {
          entity.vx = -MAX_VEL_X * 0.8;
        }
      }
      
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
