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
      if (entity.onBottomWall === undefined) entity.onBottomWall = false;
      if (entity.jumpBuffer === undefined) entity.jumpBuffer = 0;
      if (entity.jumpCooldown === undefined) entity.jumpCooldown = 0;
      if (entity.jumpLockTime === undefined) entity.jumpLockTime = 0; // Lock to prevent rapid re-jumping
      if (entity.groundStableTime === undefined) entity.groundStableTime = 0; // Time entity has been on ground continuously
      if (entity.justLanded === undefined) entity.justLanded = false; // Flag to prevent repeated landing events

      // Store old ground state
      const wasOnGround = entity.onGround;
      
      // Check ground state BEFORE movement
      // CRITICAL: If on bottom wall, lock ground state to prevent flickering
      const initialBottomY = entity.y + (entity.height || 14);
      const initialBottomTile = Math.floor(initialBottomY / this.world.tileSize);
      const initialAtBottomWall = initialBottomTile >= (this.world.height - 1);
      
      if (initialAtBottomWall && entity.onGround) {
        // Lock ground state when on bottom wall to prevent flickering
        entity.onGround = true;
      } else {
        // Normal ground detection
        // CRITICAL: Don't check ground if entity is moving up fast (jumping)
        // This prevents false ground detection during jumps
        if (entity.vy === undefined || entity.vy >= -50) {
          entity.onGround = this.isOnGround(entity);
        } else {
          // If jumping up fast, definitely not on ground
          entity.onGround = false;
        }
      }
      
      // Update coyote time
      if (wasOnGround && !entity.onGround) {
        entity.coyoteTime = COYOTE_MS / 1000;
      }
      if (entity.coyoteTime > 0) {
        entity.coyoteTime -= dt;
      }
      
      // Update landing cooldown - prevents jumping immediately after landing
      if (entity.landingCooldown > 0) {
        entity.landingCooldown -= dt;
      }
      
      // Track ground stability - only allow jumping if ground is stable
      if (entity.onGround) {
        entity.groundStableTime += dt;
      } else {
        // Not on ground - reset stability timer
        entity.groundStableTime = 0;
      }
      
      // CRITICAL: Clear jump buffer when landing to prevent bounce loops
      // Only process landing once per landing event to prevent repeated triggers
      if (!wasOnGround && entity.onGround && !entity.justLanded) {
        // Just landed - ALWAYS clear jump buffer to prevent bounce loops
        entity.jumpBuffer = 0;
        entity.groundStableTime = 0; // Reset stability timer on landing
        entity.jumpLockTime = 0.2; // 200ms lock after landing to prevent immediate re-jumping
        entity.justLanded = true; // Mark as just landed to prevent repeated events
        
        // If landing on bottom wall, set a longer cooldown
        const bottomY = entity.y + (entity.height || 14);
        const bottomTile = Math.floor(bottomY / this.world.tileSize);
        const atBottomWall = bottomTile >= (this.world.height - 1);
        if (atBottomWall) {
          entity.jumpCooldown = 0.3; // 300ms cooldown when landing on bottom wall
          entity.jumpLockTime = 0.25; // 250ms lock on bottom wall
        }
      }
      
      // Clear justLanded flag after a short time to allow new landing detection
      if (entity.justLanded && entity.groundStableTime > 0.1) {
        entity.justLanded = false;
      }
      
      // Also clear justLanded if we leave the ground
      if (!entity.onGround) {
        entity.justLanded = false;
      }

      // Apply gravity ONLY if not on ground (prevents bouncing when on ground)
      const clampedDt = Math.max(0, Math.min(dt, 0.1));
      
      // CRITICAL: If on bottom wall, prevent gravity and lock velocity to zero
      const gravityBottomY = entity.y + (entity.height || 14);
      const gravityBottomTile = Math.floor(gravityBottomY / this.world.tileSize);
      const gravityAtBottomWall = gravityBottomTile >= (this.world.height - 1);
      
      if (gravityAtBottomWall && entity.onGround) {
        // On bottom wall - prevent gravity and lock velocity
        entity.vy = 0; // Lock velocity to zero
      } else if (!entity.onGround) {
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
            const groundTile = Math.floor((entity.y + (entity.height || 14)) / this.world.tileSize);
            entity.y = groundTile * this.world.tileSize - (entity.height || 14);
            entity.vy = 0;
            entity.onGround = true;
            // CRITICAL: Stop gravity when on ground to prevent bouncing
            entity.vy = 0;
            // CRITICAL: Clear jump buffer and set cooldowns when landing to prevent bounce loops
            // Only process if not already marked as just landed (prevents repeated triggers)
            if (!entity.justLanded) {
              entity.jumpBuffer = 0; // Always clear jump buffer on landing
              entity.jumpLockTime = 0.2; // 200ms lock after landing to prevent bounce loops
              entity.justLanded = true; // Mark as just landed
              // CRITICAL: Set jump cooldown when landing to prevent immediate jump spam
              if (entity.jumpCooldown === undefined) {
                entity.jumpCooldown = 0;
              }
              // Check if at bottom wall - if so, set longer cooldowns
              const bottomY = entity.y + (entity.height || 14);
              const bottomTile = Math.floor(bottomY / this.world.tileSize);
              const atBottomWall = bottomTile >= (this.world.height - 1); // On bottom row of tiles
              if (atBottomWall) {
                // Longer cooldowns on bottom wall to prevent bounce loops
                entity.jumpCooldown = 0.3; // 300ms cooldown
                entity.jumpLockTime = 0.25; // 250ms lock
                entity.onBottomWall = true; // Mark as on bottom wall
              } else {
                entity.jumpCooldown = 0.25; // 250ms cooldown when landing normally
                entity.onBottomWall = false; // Clear bottom wall flag
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
              // CRITICAL: Clear jump buffer when snapping to ground to prevent bounce loops
              if (!entity.justLanded) {
                entity.jumpBuffer = 0;
                entity.jumpLockTime = 0.2; // 200ms lock after snapping to ground
                entity.justLanded = true; // Mark as just landed
              }
              break;
            }
          }
        }
      }

      // Update wall touching state
      entity.touchingWall.left = this.isTouchingWall(entity, 'left');
      entity.touchingWall.right = this.isTouchingWall(entity, 'right');

      // Final ground state check (after all movement)
      // CRITICAL: If on bottom wall, lock ground state to prevent flickering
      const finalBottomY = entity.y + (entity.height || 14);
      const finalBottomTile = Math.floor(finalBottomY / this.world.tileSize);
      const finalAtBottomWall = finalBottomTile >= (this.world.height - 1);
      
      if (finalAtBottomWall && entity.onGround) {
        // Lock ground state when on bottom wall to prevent flickering
        entity.onGround = true;
      } else {
        // Normal ground detection
        // CRITICAL: Don't check ground if entity is moving up fast (jumping)
        // This prevents ground detection from interfering with jumps
        if (entity.vy >= -100) {
          entity.onGround = this.isOnGround(entity);
        } else {
          // If jumping up fast, definitely not on ground
          entity.onGround = false;
        }
      }
      
      // If on ground, ensure velocity is zero (but allow upward velocity for jumps)
      if (entity.onGround && entity.vy > 0) {
        entity.vy = 0;
      }
      
          // CRITICAL: If entity is at bottom wall, prevent ANY upward movement
          const bottomY = entity.y + (entity.height || 14);
          const bottomTile = Math.floor(bottomY / this.world.tileSize);
          const atBottomWall = bottomTile >= (this.world.height - 1);
          
          if (atBottomWall) {
            // Completely disable jumping on bottom wall
            entity.jumpBuffer = 0;
            entity.jumpCooldown = 999.0; // Infinite cooldown
            entity.onBottomWall = true;
            // Cancel any upward velocity
            if (entity.vy < 0) {
              entity.vy = 0;
            }
            // Lock ground state
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
    
    // CRITICAL: Check if at bottom wall - if so, only return true if actually on ground
    const bottomY = y + height;
    const bottomTile = Math.floor(bottomY / this.world.tileSize);
    const atBottomWall = bottomTile >= (this.world.height - 1);
    
    // If at bottom wall, use stricter ground detection
    if (atBottomWall) {
      // Only consider on ground if very close to the bottom wall (within 1 pixel)
      const groundY = (this.world.height - 1) * this.world.tileSize;
      const distanceToGround = bottomY - groundY;
      return distanceToGround >= -1 && distanceToGround <= 1;
    }
    
    // Normal ground detection - stricter tolerance (2 pixels instead of 4)
    const leftTile = Math.floor(x / this.world.tileSize);
    const rightTile = Math.floor((x + width - 0.1) / this.world.tileSize);
    const tileBelow = Math.floor(bottomY / this.world.tileSize);

    for (let tx = leftTile; tx <= rightTile; tx++) {
      if (this.world.isSolid(tx, tileBelow)) {
        const groundY = tileBelow * this.world.tileSize;
        const distanceToGround = bottomY - groundY;
        // Stricter tolerance - only within 2 pixels
        if (distanceToGround >= -2 && distanceToGround <= 2) {
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
    // Initialize properties
    if (entity.jumpBuffer === undefined) entity.jumpBuffer = 0;
    if (entity.jumpCooldown === undefined) entity.jumpCooldown = 0;
    if (entity.lastJumpTime === undefined) entity.lastJumpTime = -1;
    if (entity.jumpLockTime === undefined) entity.jumpLockTime = 0; // Prevent rapid re-jumping
    
    // Update jump lock time (prevents involuntary jump loops)
    if (entity.jumpLockTime > 0) {
      entity.jumpLockTime -= FIXED_DT;
    }
    
    // CRITICAL: Check if entity is at bottom wall - prevent jumping but allow normal movement
    const bottomY = entity.y + (entity.height || 14);
    const bottomTile = Math.floor(bottomY / this.world.tileSize);
    const atBottomWall = bottomTile >= (this.world.height - 1);
    
    if (atBottomWall) {
      // On bottom wall - prevent jumping but don't interfere with normal movement
      // Only clear jump buffer if it wasn't just set (preserve user intent)
      if (entity.jumpBuffer > 0.05) {
        entity.jumpBuffer = 0;
      }
      // Set a cooldown to prevent spam, but allow normal jumping after leaving bottom wall
      if (entity.jumpCooldown < 0.2) {
        entity.jumpCooldown = 0.2;
      }
      // Cancel upward velocity only if we're actually on the bottom wall
      if (entity.vy < 0 && entity.onGround) {
        entity.vy = 0;
      }
      // Don't return false here - allow the jump buffer to persist for when entity leaves bottom wall
    }
    
    // Update jump cooldown
    if (entity.jumpCooldown > 0) {
      entity.jumpCooldown -= FIXED_DT;
    }
    
    // Jump buffer - only set on NEW press (prevents involuntary loops)
    // CRITICAL: Only set buffer if jumpPressed is true AND buffer is empty
    // This prevents NPCs from setting buffer every frame
    // NOTE: Allow buffer to be set even if locked - lock only prevents execution, not input
    if (jumpPressed && entity.jumpBuffer <= 0) {
      entity.jumpBuffer = JUMP_BUFFER_MS / 1000;
    }
    
    // Decrement jump buffer
    if (entity.jumpBuffer > 0) {
      entity.jumpBuffer -= FIXED_DT;
    }
    
    // Jump conditions - prevent loops while allowing normal jumping
    // CRITICAL: Require ground to be stable (been on ground for at least 30ms) OR not just landed
    // This prevents bounce loops while allowing responsive jumping
    const groundStable = entity.onGround && (entity.groundStableTime === undefined || entity.groundStableTime >= 0.03);
    const canJumpFromGround = !entity.justLanded && (groundStable || entity.coyoteTime > 0);
    
    const canJump = entity.jumpBuffer > 0 && // Has jump buffer
                    entity.jumpCooldown <= 0 && // Not on cooldown
                    entity.jumpLockTime <= 0 && // Not locked (prevents loops)
                    entity.vy >= -100 && // Not already jumping up fast
                    !atBottomWall && // Not on bottom wall
                    (canJumpFromGround || 
                     (entity.touchingWall && (entity.touchingWall.left || entity.touchingWall.right))); // Can jump from stable ground, coyote, or wall
    
    if (canJump) {
      // Final check - make sure we're not on bottom wall
      const finalBottomY = entity.y + (entity.height || 14);
      const finalBottomTile = Math.floor(finalBottomY / this.world.tileSize);
      const finalAtBottomWall = finalBottomTile >= (this.world.height - 1);
      
      if (finalAtBottomWall) {
        entity.jumpBuffer = 0;
        entity.vy = Math.max(0, entity.vy);
        return false;
      }
      
      // Execute jump
      entity.vy = JUMP_VEL;
      entity.jumpCooldown = 0.3; // 300ms cooldown
      entity.jumpBuffer = 0; // Clear buffer after jump
      entity.jumpLockTime = 0.2; // 200ms lock to prevent immediate re-jumping (prevents bounce loops)
      entity.coyoteTime = 0;
      entity.lastJumpTime = 0;
      
      // Wall-jump
      if (!entity.onGround && entity.coyoteTime <= 0 && entity.touchingWall) {
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
