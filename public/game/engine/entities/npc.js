// NPC Entity - Scripted AI for Survival Mode
import { MAX_VEL_X, START_ARROWS, MAX_ARROWS, ARROW_SPEED, PALETTE } from '../constants.js';
import { PhysicsSystem } from '../physics.js';
import { Arrow } from './arrow.js';

const NPC_STATE = {
  PATROL: 'patrol',
  AIM: 'aim',
  SHOOT: 'shoot',
  EVADE: 'evade',
  RETRIEVE: 'retrieve'
};

export class NPC {
  constructor(x, y, id, color, physics) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.width = 12;
    this.height = 14;
    this.vx = 0;
    this.vy = 0;
    this.color = color;
    // Random initial facing - ensure it's either 1 or -1, not 0
    this.facing = Math.random() > 0.5 ? 1 : -1;
    this.onGround = false;
    this.wasOnGround = false;
    this.touchingWall = { left: false, right: false };
    this.coyoteTime = 0;
    this.jumpBuffer = 0;
    this.arrows = START_ARROWS;
    this.maxArrows = MAX_ARROWS;
    this.dead = false;
    
    // AI state
    this.state = NPC_STATE.PATROL;
    this.stateTimer = 0;
    this.targetX = 0;
    this.targetY = 0;
    // Initialize patrolDirection independently - alternate between NPCs to prevent all moving same direction
    this.patrolDirection = (id % 2 === 0) ? 1 : -1; // Alternate based on ID to ensure variety
    this.reactionDelay = 0.3;
    this.aimJitter = 8;
    this.lastShootTime = 0;
    this.shootCooldown = 1.5;
    this.arrowCheckTimer = 0;
    this.wave = 1;
    this.physics = physics;
  }

  setWave(wave) {
    this.wave = wave;
    // Scale difficulty: reaction delay decreases, aim improves, speed increases
    this.reactionDelay = Math.max(0.12, 0.26 - (wave * 0.01));
    this.aimJitter = Math.max(2, 10 - (wave * 0.6));
  }

  update(dt, world, player, arrows) {
    if (this.dead || !player || player.dead || !world || !this.physics) {
      return null;
    }

    // Validate dt
    if (!dt || dt <= 0 || dt > 0.1) {
      dt = 1/120; // Use fixed timestep
    }

    try {
      // Get current ground state for movement decisions
      const inAir = !this.onGround;
      
      // Update AI behavior to determine movement
      const newArrow = this.updateBehavior(dt, world, player, arrows || [], inAir);
      
      // Apply physics (gravity + collision) - this moves the entity
      this.physics.updateEntity(this, dt);
      
      return newArrow;
    } catch (error) {
      console.error(`Error updating NPC ${this.id}:`, error);
      return null;
    }
  }

  updateBehavior(dt, world, player, arrows, inAir) {
    if (!player || !world || player.dead) return null;
    
    try {
      // Clamp dt to prevent issues
      dt = Math.max(0, Math.min(dt, 0.1));
      
      this.stateTimer += dt;
      this.lastShootTime += dt;

      const dx = player.x - this.x;
      const dy = player.y - this.y;
      const distSq = dx * dx + dy * dy;
      const dist = Math.sqrt(distSq);
      
      // Validate player position
      if (isNaN(player.x) || isNaN(player.y)) return null;

    // Evade if player is too close (80^2 = 6400)
    // NPCs should evade independently, not all in the same direction
    if (distSq < 6400 && this.state !== NPC_STATE.EVADE) {
      this.state = NPC_STATE.EVADE;
      this.stateTimer = 0;
      // Evade away from player, but add some randomness so NPCs don't all move the same way
      const evadeDirection = dx > 0 ? -1 : 1;
      // Add slight randomness to prevent all NPCs moving identically
      this.patrolDirection = (Math.random() > 0.3) ? evadeDirection : -evadeDirection;
    }

    // Retrieve arrows if low on ammo (check every 0.5s)
    this.arrowCheckTimer += dt;
    if (this.arrows < 2 && this.state !== NPC_STATE.RETRIEVE && 
        this.state !== NPC_STATE.EVADE && this.arrowCheckTimer >= 0.5) {
      this.arrowCheckTimer = 0;
      
      // Find nearest embedded arrow
      let nearestArrow = null;
      let nearestDistSq = 25000; // 150^2 - increased range
      
      for (const arrow of arrows) {
        if (!arrow || !arrow.embedded || !arrow.active) continue;
        
        const arrowDx = this.x - arrow.x;
        const arrowDy = this.y - arrow.y;
        const arrowDistSq = arrowDx * arrowDx + arrowDy * arrowDy;
        
        if (arrowDistSq < nearestDistSq) {
          nearestDistSq = arrowDistSq;
          nearestArrow = arrow;
        }
      }
      
      if (nearestArrow) {
        this.state = NPC_STATE.RETRIEVE;
        this.stateTimer = 0;
        this.targetX = nearestArrow.x;
        this.targetY = nearestArrow.y;
      }
    }

    // State machine
    let newArrow = null;
    
    switch (this.state) {
      case NPC_STATE.PATROL:
        // Simple patrol: move back and forth independently
        const speed = MAX_VEL_X * 0.7 * (1 + this.wave * 0.04); // Scale with wave
        
        // Ensure patrolDirection is valid (1 or -1, not 0)
        if (this.patrolDirection === 0 || isNaN(this.patrolDirection)) {
          this.patrolDirection = Math.random() > 0.5 ? 1 : -1;
        }
        
        const targetVx = this.patrolDirection * speed;
        
        // Validate targetVx
        if (isNaN(targetVx) || !isFinite(targetVx)) {
          // If invalid, stop and reset
          this.patrolDirection = Math.random() > 0.5 ? 1 : -1;
          this.physics?.applyHorizontalMovement(this, 0, dt, inAir);
        } else {
          // Apply movement using physics system with correct air state
          if (this.physics) {
            this.physics.applyHorizontalMovement(this, targetVx, dt, inAir);
          } else {
            this.vx = targetVx;
          }
        }
        
        this.facing = this.patrolDirection;
        
        // Change direction at walls or after time
        if (this.touchingWall.left || this.touchingWall.right || this.stateTimer > 3) {
          this.patrolDirection *= -1;
          this.stateTimer = 0;
        }
        
        // Transition to aim if player is visible and close enough (200^2 = 40000)
        if (distSq < 40000 && Math.abs(dy) < 80 && world.hasLineOfSight && world.hasLineOfSight(this.x, this.y, player.x, player.y)) {
          this.state = NPC_STATE.AIM;
          this.stateTimer = 0;
        }
        break;

      case NPC_STATE.AIM:
        // Face player
        this.facing = dx > 0 ? 1 : -1;
        
        // Stop to aim - use physics system with correct air state
        if (this.physics) {
          this.physics.applyHorizontalMovement(this, 0, dt, inAir);
        } else {
          this.vx = 0;
        }
        
        // After reaction delay, shoot
        if (this.stateTimer >= this.reactionDelay && this.lastShootTime >= this.shootCooldown) {
          this.state = NPC_STATE.SHOOT;
          this.stateTimer = 0;
        }
        
        // If player moved away, return to patrol (250^2 = 62500)
        if (distSq > 62500 || Math.abs(dy) > 80) {
          this.state = NPC_STATE.PATROL;
          this.stateTimer = 0;
        }
        break;

      case NPC_STATE.SHOOT:
        // Shoot with slight inaccuracy
        if (this.arrows > 0) {
          this.arrows--;
          const aimOffsetX = (Math.random() - 0.5) * this.aimJitter;
          const aimOffsetY = (Math.random() - 0.5) * this.aimJitter;
          const angle = Math.atan2(dy + aimOffsetY, dx + aimOffsetX);
          
          const spawnX = this.x + (this.width / 2) + (this.facing * 12);
          const spawnY = this.y + (this.height / 2);
          const arrowSpeed = ARROW_SPEED * (1 + this.wave * 0.03); // Scale with wave
          const arrowVx = Math.cos(angle) * arrowSpeed;
          const arrowVy = Math.sin(angle) * arrowSpeed;
          
          newArrow = new Arrow(spawnX, spawnY, arrowVx, arrowVy, this.id);
          this.lastShootTime = 0;
        }
        
        // Return to patrol
        this.state = NPC_STATE.PATROL;
        this.stateTimer = 0;
        break;

      case NPC_STATE.EVADE:
        // Jump away from player - ensure patrolDirection is valid
        if (this.patrolDirection === 0 || isNaN(this.patrolDirection)) {
          this.patrolDirection = dx > 0 ? -1 : 1;
        }
        
        const evadeSpeed = this.patrolDirection * MAX_VEL_X * 0.8;
        
        // Validate evadeSpeed
        if (isNaN(evadeSpeed) || !isFinite(evadeSpeed)) {
          this.patrolDirection = dx > 0 ? -1 : 1;
          this.physics?.applyHorizontalMovement(this, 0, dt, inAir);
        } else {
          // Apply movement using physics system with correct air state
          if (this.physics) {
            this.physics.applyHorizontalMovement(this, evadeSpeed, dt, inAir);
          } else {
            this.vx = evadeSpeed;
          }
        }
        
        this.facing = this.patrolDirection;
        
            // Jump if on ground and just started evading (only once)
            // CRITICAL: Only jump if not already moving up (prevent spam)
            // Also check jump cooldown to prevent spam
            // Don't jump if at bottom wall (prevents spam at bottom)
            const bottomY = this.y + (this.height || 14);
            const worldBottom = world.height * world.tileSize;
            const atBottomWall = bottomY >= worldBottom - 2; // Within 2 pixels of bottom wall
            
            if (this.onGround && this.stateTimer < 0.1 && this.vy >= -50 && !atBottomWall) {
              // Initialize jump cooldown if needed
              if (this.jumpCooldown === undefined) {
                this.jumpCooldown = 0;
              }
              
              // Only jump if cooldown expired
              if (this.jumpCooldown <= 0) {
                this.vy = -380; // Jump velocity
                this.jumpCooldown = 0.4; // 400ms cooldown between NPC jumps (increased)
              }
            }
            
            // Decrease jump cooldown
            if (this.jumpCooldown !== undefined && this.jumpCooldown > 0) {
              this.jumpCooldown -= dt;
            }
        
        // Return to patrol after evading (150^2 = 22500)
        if (this.stateTimer > 1.0 || distSq > 22500) {
          this.state = NPC_STATE.PATROL;
          this.stateTimer = 0;
          // Reset patrol direction when returning to patrol
          this.patrolDirection = (this.id % 2 === 0) ? 1 : -1;
        }
        break;

      case NPC_STATE.RETRIEVE:
        // Find arrow again (might have moved or been picked up)
        let currentNearestArrow = null;
        let currentNearestDistSq = 25000;
        
        for (const arrow of arrows) {
          if (!arrow || !arrow.embedded || !arrow.active) continue;
          const arrowDx = this.x - arrow.x;
          const arrowDy = this.y - arrow.y;
          const arrowDistSq = arrowDx * arrowDx + arrowDy * arrowDy;
          if (arrowDistSq < currentNearestDistSq) {
            currentNearestDistSq = arrowDistSq;
            currentNearestArrow = arrow;
          }
        }
        
        if (!currentNearestArrow) {
          this.state = NPC_STATE.PATROL;
          this.stateTimer = 0;
          // Reset patrol direction when returning to patrol
          this.patrolDirection = (this.id % 2 === 0) ? 1 : -1;
          break;
        }
        
        this.targetX = currentNearestArrow.x;
        this.targetY = currentNearestArrow.y;
        
        const targetDx = this.targetX - this.x;
        const targetDy = this.targetY - this.y;
        this.facing = targetDx > 0 ? 1 : -1;
        
        const retrieveSpeed = this.facing * MAX_VEL_X * 0.8;
        
        // Validate retrieveSpeed
        if (isNaN(retrieveSpeed) || !isFinite(retrieveSpeed)) {
          this.physics?.applyHorizontalMovement(this, 0, dt, inAir);
        } else {
          // Apply movement using physics system with correct air state
          if (this.physics) {
            this.physics.applyHorizontalMovement(this, retrieveSpeed, dt, inAir);
          } else {
            this.vx = retrieveSpeed;
          }
        }
        
            // Jump if needed to reach arrow (only if not already jumping)
            // CRITICAL: Only jump if not already moving up (prevent spam)
            // Don't jump if at bottom wall (prevents spam at bottom)
            const bottomY = this.y + (this.height || 14);
            const worldBottom = world.height * world.tileSize;
            const atBottomWall = bottomY >= worldBottom - 2; // Within 2 pixels of bottom wall
            
            if (this.onGround && targetDy < -20 && this.stateTimer > 0.2 && this.vy >= -50 && !atBottomWall) {
              // Initialize jump cooldown if needed
              if (this.jumpCooldown === undefined) {
                this.jumpCooldown = 0;
              }
              
              // Only jump if cooldown expired
              if (this.jumpCooldown <= 0) {
                this.vy = -380;
                this.stateTimer = 0;
                this.jumpCooldown = 0.4; // 400ms cooldown between NPC jumps (increased)
              }
            }
            
            // Decrease jump cooldown
            if (this.jumpCooldown !== undefined && this.jumpCooldown > 0) {
              this.jumpCooldown -= dt;
            }
        
        // Check if arrow reached (24^2 = 576 for easier pickup)
        const arrowDx = this.x - this.targetX;
        const arrowDy = this.y - this.targetY;
        const arrowDistSq = arrowDx * arrowDx + arrowDy * arrowDy;
        if (arrowDistSq < 576) {
            // Pickup arrow
            if (this.arrows < this.maxArrows) {
              this.arrows++;
              // Arrow will be removed by caller
            }
            this.state = NPC_STATE.PATROL;
            this.stateTimer = 0;
            // Reset patrol direction when returning to patrol
            this.patrolDirection = (this.id % 2 === 0) ? 1 : -1;
          }
          
          // Timeout retrieval
          if (this.stateTimer > 5.0) {
            this.state = NPC_STATE.PATROL;
            this.stateTimer = 0;
            // Reset patrol direction when returning to patrol
            this.patrolDirection = (this.id % 2 === 0) ? 1 : -1;
          }
          break;
      }
      
      return newArrow;
    } catch (error) {
      console.error(`Error in NPC behavior update:`, error);
      return null;
    }
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

  respawn(x, y, wave) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.dead = false;
    this.arrows = START_ARROWS;
    this.coyoteTime = 0;
    this.jumpBuffer = 0;
    this.jumpCooldown = 0; // Reset jump cooldown
    this.state = NPC_STATE.PATROL;
    this.stateTimer = 0;
    // Reset patrol direction independently - alternate based on ID to ensure variety
    this.patrolDirection = (this.id % 2 === 0) ? 1 : -1;
    this.facing = this.patrolDirection;
    this.setWave(wave);
  }

  getBounds() {
    return {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height
    };
  }

  render(ctx, offsetX = 0, offsetY = 0) {
    if (this.dead) {
      ctx.globalAlpha = 0.5;
    }

    const renderX = this.x + offsetX;
    const renderY = this.y + offsetY;

    // Draw NPC body
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

