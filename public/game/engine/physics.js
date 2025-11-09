// Physics System - Zero-Bounce One-Axis Resolution
import { 
  GRAVITY, MOVE_ACC, MAX_VEL_X, JUMP_VEL, WALL_SLIDE_MAX, COYOTE_MS, JUMP_BUFFER_MS, 
  STEP, GROUND_FRICTION, AIR_DRAG, PENETRATION_SLOP, SLEEP_EPS, DEBUG_PHYSICS 
} from './constants.js';
import { wrapPosition } from './wrap.js';

export class PhysicsSystem {
  constructor(world) {
    this.world = world;
    this.debugLogThrottle = 0;
    this.debugLogInterval = 0.1; // 10 Hz
  }

  updateEntity(entity, dt = STEP) {
    if (!entity || !this.world) return;

    // CRITICAL: Use fixed STEP everywhere, never variable dt for physics
    dt = STEP;

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
      const wasOnGround = entity.onGround || false;
      
      // STEP 1: Check ground state BEFORE movement (for gravity decision)
      // This uses the previous frame's position to determine if we should apply gravity
      entity.onGround = this.isOnGround(entity);
      
      // Reset wall touching state (will be set by collision resolution)
      entity.touchingWall.left = false;
      entity.touchingWall.right = false;
      
      // Debug logging (throttled to 10 Hz)
      if (DEBUG_PHYSICS) {
        this.debugLogThrottle += dt;
        if (this.debugLogThrottle >= this.debugLogInterval) {
          console.log(`[Physics] Entity ${entity.id || '?'}: pos=(${entity.x.toFixed(2)}, ${entity.y.toFixed(2)}), vel=(${entity.vx.toFixed(2)}, ${entity.vy.toFixed(2)}), onGround=${entity.onGround}`);
          this.debugLogThrottle = 0;
        }
      }

      // STEP 2: Update coyote time and ground stability
      if (wasOnGround && !entity.onGround) {
        entity.coyoteTime = COYOTE_MS / 1000;
      }
      if (entity.coyoteTime > 0) {
        entity.coyoteTime -= dt;
      }
      
      if (entity.onGround) {
        entity.groundStableTime += dt;
        // Clear justLanded flag after jump lock time expires
        if (entity.justLanded && entity.jumpLockTime <= 0) {
          entity.justLanded = false;
        }
      } else {
        entity.groundStableTime = 0;
        entity.justLanded = false;
      }

      // STEP 3: Apply gravity ONLY if not on ground
      if (!entity.onGround) {
        entity.vy += GRAVITY * dt;
        const maxFallSpeed = 640;
        if (entity.vy > maxFallSpeed) {
          entity.vy = maxFallSpeed;
        }
      } else {
        // On ground - zero downward velocity
        if (entity.vy > 0) {
          entity.vy = 0;
        }
      }

      // STEP 4: Integrate velocity (move entity)
      const oldX = entity.x;
      const oldY = entity.y;
      entity.x += entity.vx * dt;
      entity.y += entity.vy * dt;

      // STEP 5: Apply wrapping AFTER integration but BEFORE collision resolution
      const wrapped = wrapPosition(entity.x, entity.y);
      entity.x = wrapped.x;
      entity.y = wrapped.y;

      // STEP 6: Resolve collisions - ONE AXIS AT A TIME
      // Order: X-axis first, then Y-axis (consistent order prevents jitter)
      
      // Resolve X-axis collisions
      this.resolveAxisCollision(entity, 'x');
      
      // Resolve Y-axis collisions (this will set onGround if landing)
      this.resolveAxisCollision(entity, 'y');
      
      // STEP 7: Final ground state check after collision resolution
      entity.onGround = this.isOnGround(entity);

      // STEP 8: Apply friction AFTER collision resolution
      if (entity.onGround) {
        // Ground friction - only apply when grounded
        entity.vx *= (1 - GROUND_FRICTION);
        if (Math.abs(entity.vx) < SLEEP_EPS) {
          entity.vx = 0;
        }
        // Ensure downward velocity is zero when on ground
        if (entity.vy > 0) {
          entity.vy = 0;
        }
      } else {
        // Air drag - small drag when airborne
        entity.vx *= (1 - AIR_DRAG);
      }
      
      // Zero out tiny vertical jitter
      if (Math.abs(entity.vy) < SLEEP_EPS) {
        entity.vy = 0;
      }

      // STEP 9: Final state checks
      // Bottom wall check - just track state, don't prevent jumping
      const bottomY = entity.y + (entity.height || 14);
      const bottomTile = Math.floor(bottomY / this.world.tileSize);
      const atBottomWall = bottomTile >= (this.world.height - 1);
      
      if (atBottomWall) {
        entity.onBottomWall = true;
        // Set onGround but don't zero upward velocity - allow jumps
        // Collision resolution already prevents bouncing
        entity.onGround = true;
      } else {
        entity.onBottomWall = false;
      }

      // Debug: log collision info
      if (DEBUG_PHYSICS && (oldX !== entity.x || oldY !== entity.y)) {
        console.log(`[Physics] Collision resolved: moved from (${oldX.toFixed(2)}, ${oldY.toFixed(2)}) to (${entity.x.toFixed(2)}, ${entity.y.toFixed(2)})`);
      }
    } catch (error) {
      console.error('Error in physics updateEntity:', error);
    }
  }

  /**
   * Resolve collision along a single axis with zero-bounce
   * @param {Object} entity - Entity to resolve
   * @param {string} axis - 'x' or 'y'
   */
  resolveAxisCollision(entity, axis) {
    if (!entity || !axis) return;
    
    const width = entity.width || 12;
    const height = entity.height || 14;
    const x = entity.x;
    const y = entity.y;
    
    // Get tile bounds
    const leftTile = Math.floor(x / this.world.tileSize);
    const rightTile = Math.floor((x + width - 0.1) / this.world.tileSize);
    const topTile = Math.floor(y / this.world.tileSize);
    const bottomTile = Math.floor((y + height - 0.1) / this.world.tileSize);

    if (axis === 'x') {
      // Resolve X-axis collisions
      let minOverlap = 0;
      let resolveLeft = false;
      let resolveRight = false;
      
      // Check left wall - only resolve if entity is actually penetrating (x < wallRight AND moving left or already inside)
      for (let ty = topTile; ty <= bottomTile; ty++) {
        if (this.world.isSolid(leftTile, ty)) {
          const wallRight = (leftTile + 1) * this.world.tileSize;
          // Entity is overlapping if its left edge is inside the wall
          if (x < wallRight && x + width > wallRight) {
            const overlap = wallRight - x;
            if (overlap > minOverlap) {
              minOverlap = overlap;
              resolveLeft = true;
              resolveRight = false;
            }
          }
        }
      }
      
      // Check right wall - only resolve if entity is actually penetrating
      for (let ty = topTile; ty <= bottomTile; ty++) {
        if (this.world.isSolid(rightTile, ty)) {
          const wallLeft = rightTile * this.world.tileSize;
          // Entity is overlapping if its right edge is inside the wall
          if (x < wallLeft && x + width > wallLeft) {
            const overlap = (x + width) - wallLeft;
            if (overlap > minOverlap) {
              minOverlap = overlap;
              resolveLeft = false;
              resolveRight = true;
            }
          }
        }
      }
      
      // Resolve X collision if overlap exceeds slop
      if (minOverlap > PENETRATION_SLOP) {
        if (resolveLeft) {
          // Push out to the right
          entity.x += minOverlap;
          entity.touchingWall.left = true;
          // Zero inbound velocity (moving left)
          if (entity.vx < 0) {
            entity.vx = 0;
          }
        } else if (resolveRight) {
          // Push out to the left
          entity.x -= minOverlap;
          entity.touchingWall.right = true;
          // Zero inbound velocity (moving right)
          if (entity.vx > 0) {
            entity.vx = 0;
          }
        }
        
        // Zero tiny velocities
        if (Math.abs(entity.vx) < SLEEP_EPS) {
          entity.vx = 0;
        }
      } else {
        // Check if touching wall (for wall-slide/jump) but not penetrating
        if (Math.abs(x - ((leftTile + 1) * this.world.tileSize)) < 1) {
          entity.touchingWall.left = true;
        }
        if (Math.abs((x + width) - (rightTile * this.world.tileSize)) < 1) {
          entity.touchingWall.right = true;
        }
      }
    } else if (axis === 'y') {
      // Resolve Y-axis collisions
      let minOverlap = 0;
      let resolveTop = false;
      let resolveBottom = false;
      
      // Check ceiling - only resolve if entity is actually penetrating
      for (let tx = leftTile; tx <= rightTile; tx++) {
        if (this.world.isSolid(tx, topTile)) {
          const ceilingBottom = (topTile + 1) * this.world.tileSize;
          // Entity is overlapping if its top edge is inside the ceiling
          if (y < ceilingBottom && y + height > ceilingBottom) {
            const overlap = ceilingBottom - y;
            if (overlap > minOverlap) {
              minOverlap = overlap;
              resolveTop = true;
              resolveBottom = false;
            }
          }
        }
      }
      
      // Check floor - only resolve if entity is actually penetrating
      for (let tx = leftTile; tx <= rightTile; tx++) {
        if (this.world.isSolid(tx, bottomTile)) {
          const floorTop = bottomTile * this.world.tileSize;
          // Entity is overlapping if its bottom edge is inside the floor
          if (y < floorTop && y + height > floorTop) {
            const overlap = (y + height) - floorTop;
            if (overlap > minOverlap) {
              minOverlap = overlap;
              resolveTop = false;
              resolveBottom = true;
            }
          }
        }
      }
      
      // Resolve Y collision if overlap exceeds slop
      if (minOverlap > PENETRATION_SLOP) {
        if (resolveTop) {
          // Push down (hit ceiling)
          entity.y += minOverlap;
          // Zero inbound velocity (moving up)
          if (entity.vy < 0) {
            entity.vy = 0;
          }
        } else if (resolveBottom) {
          // Push up (landed on floor)
          entity.y -= minOverlap;
          // Zero inbound velocity (moving down)
          if (entity.vy > 0) {
            entity.vy = 0;
          }
          // GOLDEN RULE: Set isGrounded ONLY from Y-axis downward resolves
          const wasOnGroundBefore = entity.onGround;
          entity.onGround = true;
          
          // Landing event - only trigger if we weren't on ground before
          if (!wasOnGroundBefore && !entity.justLanded) {
            entity.jumpBuffer = 0;
            entity.jumpLockTime = 0.02; // Reduced to 20ms for more responsive jumping
            entity.justLanded = true;
            entity.groundStableTime = STEP; // Start with 1 frame already counted
            entity.jumpCooldown = entity.jumpCooldown || 0;
            
            const bottomY = entity.y + height;
            const bottomTile = Math.floor(bottomY / this.world.tileSize);
            const atBottomWall = bottomTile >= (this.world.height - 1);
            if (atBottomWall) {
              entity.jumpCooldown = 0.05; // Reduced to 50ms
              entity.jumpLockTime = 0.02; // Same as normal landing
              entity.onBottomWall = true;
            } else {
              entity.jumpCooldown = 0.05; // Reduced to 50ms
              entity.onBottomWall = false;
            }
          }
        }
        
        // Zero tiny velocities
        if (Math.abs(entity.vy) < SLEEP_EPS) {
          entity.vy = 0;
        }
      }
    }
  }

  // Simple collision check (for movement prediction)
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

  // Check if entity is on ground (for initial state check)
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

  applyHorizontalMovement(entity, targetVx, dt = STEP, inAir = false) {
    if (!entity || entity.vx === undefined) return;
    
    // CRITICAL: Use fixed STEP
    dt = STEP;
    
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
      entity.jumpLockTime -= STEP;
    }
    if (entity.jumpCooldown > 0) {
      entity.jumpCooldown -= STEP;
    }
    
    // Jump buffer - set on NEW press
    if (jumpPressed && entity.jumpBuffer <= 0) {
      entity.jumpBuffer = JUMP_BUFFER_MS / 1000;
    }
    
    // Decrement jump buffer
    if (entity.jumpBuffer > 0) {
      entity.jumpBuffer -= STEP;
    }
    
    // Jump conditions
    // Allow jumping if:
    // 1. On ground and stable (been on ground for at least 1 frame) AND lock time expired AND not just landed OR coyote time active
    // 2. OR touching a wall (wall-jump)
    const groundStable = entity.onGround && entity.groundStableTime >= STEP; // At least 1 frame on ground
    const canJumpFromGround = (groundStable && entity.jumpLockTime <= 0 && !entity.justLanded) || entity.coyoteTime > 0;
    const canWallJump = entity.touchingWall && (entity.touchingWall.left || entity.touchingWall.right) && !entity.onGround;
    
    const canJump = entity.jumpBuffer > 0 &&
                    entity.jumpCooldown <= 0 &&
                    entity.jumpLockTime <= 0 &&
                    entity.vy >= -100 &&
                    (canJumpFromGround || canWallJump);
    
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
