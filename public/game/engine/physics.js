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
      
      const clampedDt = Math.max(0, Math.min(dt, 0.1));
      
      // CRITICAL: Check if entity is ALREADY in collision at current position
      // This prevents bouncing by detecting collisions before movement
      const currentCollision = this.hasCollision(entity.x, entity.y, entity.width || 12, entity.height || 14);
      
      // If already in collision, snap position and zero velocity IMMEDIATELY
      if (currentCollision) {
        // Get tile positions
        const leftTile = Math.floor(entity.x / this.world.tileSize);
        const rightTile = Math.floor((entity.x + (entity.width || 12)) / this.world.tileSize);
        const topTile = Math.floor(entity.y / this.world.tileSize);
        const bottomTile = Math.floor((entity.y + (entity.height || 14)) / this.world.tileSize);
        
        // Check horizontal collision - snap to wall
        for (let ty = topTile; ty <= bottomTile; ty++) {
          if (this.world.isSolid(leftTile, ty)) {
            // Touching left wall - snap to right side of wall
            entity.x = (leftTile + 1) * this.world.tileSize;
            entity.touchingWall.left = true;
            entity.vx = 0;
          }
          if (this.world.isSolid(rightTile, ty)) {
            // Touching right wall - snap to left side of wall
            entity.x = rightTile * this.world.tileSize - (entity.width || 12);
            entity.touchingWall.right = true;
            entity.vx = 0;
          }
        }
        
        // Check vertical collision - snap to floor/ceiling
        for (let tx = leftTile; tx <= rightTile; tx++) {
          if (this.world.isSolid(tx, topTile)) {
            // Touching ceiling - snap below ceiling
            entity.y = (topTile + 1) * this.world.tileSize;
            entity.vy = 0;
          }
          if (this.world.isSolid(tx, bottomTile)) {
            // Touching floor - snap on top of floor
            entity.y = bottomTile * this.world.tileSize - (entity.height || 14);
            entity.vy = 0;
            entity.onGround = true;
          }
        }
      }
      
      // Check ground state
      if (entity.vy === undefined || entity.vy >= -50) {
        entity.onGround = this.isOnGround(entity);
      } else {
        entity.onGround = false;
      }
      
      // Update coyote time
      if (wasOnGround && !entity.onGround) {
        entity.coyoteTime = COYOTE_MS / 1000;
      }
      if (entity.coyoteTime > 0) {
        entity.coyoteTime -= dt;
      }
      
      // Track ground stability
      if (entity.onGround) {
        entity.groundStableTime += dt;
      } else {
        entity.groundStableTime = 0;
      }
      
      // Clear justLanded flag
      if (entity.justLanded && entity.groundStableTime > 0.1) {
        entity.justLanded = false;
      }
      if (!entity.onGround) {
        entity.justLanded = false;
      }

      // Apply gravity ONLY if not on ground
      if (!entity.onGround) {
        entity.vy += GRAVITY * clampedDt;
        const maxFallSpeed = 640;
        if (entity.vy > maxFallSpeed) {
          entity.vy = maxFallSpeed;
        }
      } else {
        // On ground - zero velocity
        entity.vy = 0;
      }

      // Move horizontally FIRST
      // Check wall touching state BEFORE movement
      entity.touchingWall.left = this.isTouchingWall(entity, 'left');
      entity.touchingWall.right = this.isTouchingWall(entity, 'right');
      
      // CRITICAL: If touching wall, COMPLETELY zero velocity and prevent movement
      if (entity.touchingWall.left || entity.touchingWall.right) {
        entity.vx = 0; // Completely zero velocity when touching any wall
      } else if (entity.vx !== 0) {
        // Only move if not touching any wall
        const moveX = entity.vx * clampedDt;
        const newX = entity.x + moveX;
        
        // Check horizontal collision at new position
        if (this.hasCollision(newX, entity.y, entity.width || 12, entity.height || 14)) {
          // Hit wall - snap to wall and zero velocity IMMEDIATELY
          if (moveX > 0) {
            // Moving right - hit right wall
            const rightTile = Math.floor((entity.x + (entity.width || 12)) / this.world.tileSize);
            entity.x = rightTile * this.world.tileSize - (entity.width || 12);
            entity.touchingWall.right = true;
          } else {
            // Moving left - hit left wall
            const leftTile = Math.floor(entity.x / this.world.tileSize);
            entity.x = (leftTile + 1) * this.world.tileSize;
            entity.touchingWall.left = true;
          }
          entity.vx = 0;
        } else {
          entity.x = newX;
          // Update wall touching state after movement
          entity.touchingWall.left = this.isTouchingWall(entity, 'left');
          entity.touchingWall.right = this.isTouchingWall(entity, 'right');
        }
      }
      
      // CRITICAL: Final check - if touching wall, COMPLETELY zero velocity
      entity.touchingWall.left = this.isTouchingWall(entity, 'left');
      entity.touchingWall.right = this.isTouchingWall(entity, 'right');
      if (entity.touchingWall.left || entity.touchingWall.right) {
        entity.vx = 0; // Completely zero velocity when touching any wall
      }

      // Move vertically SECOND
      // CRITICAL: If on ground, COMPLETELY zero velocity and prevent movement
      if (entity.onGround) {
        entity.vy = 0; // Completely zero velocity when on ground
      } else if (entity.vy !== 0) {
        // Only move if not on ground
        const moveY = entity.vy * clampedDt;
        const newY = entity.y + moveY;
        
        // Check vertical collision at new position
        if (this.hasCollision(entity.x, newY, entity.width || 12, entity.height || 14)) {
          // Hit floor or ceiling - snap IMMEDIATELY
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
              if (entity.jumpCooldown === undefined) {
                entity.jumpCooldown = 0;
              }
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
              if (!wasOnGround && !entity.justLanded) {
                entity.jumpBuffer = 0;
                entity.jumpLockTime = 0.05; // 50ms lock after snapping to ground
                entity.justLanded = true; // Mark as just landed
                entity.groundStableTime = 0; // Reset stability timer
                entity.vy = 0; // Ensure velocity is zero
              }
              break;
            }
          }
        }
      }

      // Final ground state check (after all movement)
      if (entity.vy >= -100) {
        entity.onGround = this.isOnGround(entity);
      } else {
        entity.onGround = false;
      }
      
      // CRITICAL: If on ground, COMPLETELY zero velocity and snap position
      if (entity.onGround) {
        entity.vy = 0; // Completely zero velocity when on ground
        
        // Snap position to ground
        const bottomY = entity.y + (entity.height || 14);
        const tileBelow = Math.floor(bottomY / this.world.tileSize);
        const leftTile = Math.floor(entity.x / this.world.tileSize);
        const rightTile = Math.floor((entity.x + (entity.width || 12) - 0.1) / this.world.tileSize);
        
        for (let tx = leftTile; tx <= rightTile; tx++) {
          if (this.world.isSolid(tx, tileBelow)) {
            const groundY = tileBelow * this.world.tileSize;
            const distance = bottomY - groundY;
            if (distance > 0 && distance <= 3) {
              entity.y = groundY - (entity.height || 14);
              entity.vy = 0;
              break;
            }
          }
        }
      }
      
      // CRITICAL: Final check - if touching wall, COMPLETELY zero velocity and snap position
      entity.touchingWall.left = this.isTouchingWall(entity, 'left');
      entity.touchingWall.right = this.isTouchingWall(entity, 'right');
      if (entity.touchingWall.left || entity.touchingWall.right) {
        entity.vx = 0; // Completely zero velocity when touching any wall
        
        // Snap position to wall to prevent floating
        const leftTile = Math.floor(entity.x / this.world.tileSize);
        const rightTile = Math.floor((entity.x + (entity.width || 12)) / this.world.tileSize);
        
        if (entity.touchingWall.left) {
          // Snap to right side of left wall
          entity.x = (leftTile + 1) * this.world.tileSize;
        }
        if (entity.touchingWall.right) {
          // Snap to left side of right wall
          entity.x = rightTile * this.world.tileSize - (entity.width || 12);
        }
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
    
    // CRITICAL: Check wall touching state BEFORE setting velocity
    // This prevents velocity from being set when touching walls
    const touchingLeft = this.isTouchingWall(entity, 'left');
    const touchingRight = this.isTouchingWall(entity, 'right');
    
    // CRITICAL: If touching wall, COMPLETELY prevent any movement in that direction
    // This is the key to preventing bouncing - don't set velocity at all when touching walls
    if (touchingLeft) {
      // Touching left wall - prevent ALL leftward movement
      if (targetVx < 0 || entity.vx < 0) {
        entity.vx = 0;
        return;
      }
    }
    if (touchingRight) {
      // Touching right wall - prevent ALL rightward movement
      if (targetVx > 0 || entity.vx > 0) {
        entity.vx = 0;
        return;
      }
    }
    
    // CRITICAL: Also check if entity is on ground and prevent horizontal movement if needed
    // (This is for wall-sliding, but we want to prevent bouncing)
    if (entity.onGround && (touchingLeft || touchingRight)) {
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
    // CRITICAL: Allow jumping if ground is stable (been on ground for at least 20ms) OR coyote time is active
    // The jumpLockTime prevents immediate re-jumping after landing, but doesn't block all jumps
    const groundStable = entity.onGround && (entity.groundStableTime === undefined || entity.groundStableTime >= 0.02);
    // Allow jumping from ground if: (ground is stable AND lock time expired) OR coyote time is active
    // This allows jumping even if justLanded is true, as long as jumpLockTime has expired
    const canJumpFromGround = (groundStable && entity.jumpLockTime <= 0) || entity.coyoteTime > 0;
    
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
      entity.jumpCooldown = 0.2; // 200ms cooldown
      entity.jumpBuffer = 0; // Clear buffer after jump
      entity.jumpLockTime = 0.1; // 100ms lock to prevent immediate re-jumping (prevents bounce loops)
      entity.justLanded = false; // Clear just landed flag when jumping
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
