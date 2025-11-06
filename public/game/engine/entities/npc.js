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
    this.facing = Math.random() > 0.5 ? 1 : -1; // Random initial facing
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
    this.patrolDirection = this.facing; // Start with same direction as facing
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
      dt = 1/60;
    }

    try {
      // Update physics
      this.physics.updateEntity(this, dt);

      // Update AI behavior
      const newArrow = this.updateBehavior(dt, world, player, arrows || []);
      
      return newArrow;
    } catch (error) {
      console.error(`Error updating NPC ${this.id}:`, error);
      return null;
    }
  }

  updateBehavior(dt, world, player, arrows) {
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
    if (distSq < 6400 && this.state !== NPC_STATE.EVADE) {
      this.state = NPC_STATE.EVADE;
      this.stateTimer = 0;
      this.patrolDirection = dx > 0 ? -1 : 1;
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
        // Simple patrol: move back and forth
        const speed = MAX_VEL_X * 0.7 * (1 + this.wave * 0.04); // Scale with wave
        const targetVx = this.patrolDirection * speed;
        
        // Apply movement using physics system
        if (this.physics) {
          this.physics.applyHorizontalMovement(this, targetVx, dt, !this.onGround);
        } else {
          this.vx = targetVx;
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
        
        // Stop to aim - use physics system
        if (this.physics) {
          this.physics.applyHorizontalMovement(this, 0, dt, !this.onGround);
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
        // Jump away from player
        const evadeSpeed = this.patrolDirection * MAX_VEL_X * 0.8;
        
        // Apply movement using physics system
        if (this.physics) {
          this.physics.applyHorizontalMovement(this, evadeSpeed, dt, !this.onGround);
        } else {
          this.vx = evadeSpeed;
        }
        
        this.facing = this.patrolDirection;
        
        // Jump if on ground and just started evading
        if (this.onGround && this.stateTimer < 0.1) {
          this.vy = -380; // Jump velocity
        }
        
        // Return to patrol after evading (150^2 = 22500)
        if (this.stateTimer > 1.0 || distSq > 22500) {
          this.state = NPC_STATE.PATROL;
          this.stateTimer = 0;
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
          break;
        }
        
        this.targetX = currentNearestArrow.x;
        this.targetY = currentNearestArrow.y;
        
        const targetDx = this.targetX - this.x;
        const targetDy = this.targetY - this.y;
        this.facing = targetDx > 0 ? 1 : -1;
        
        const retrieveSpeed = this.facing * MAX_VEL_X * 0.8;
        
        // Apply movement using physics system
        if (this.physics) {
          this.physics.applyHorizontalMovement(this, retrieveSpeed, dt, !this.onGround);
        } else {
          this.vx = retrieveSpeed;
        }
        
        // Jump if needed to reach arrow
        if (this.onGround && targetDy < -20 && this.stateTimer > 0.2) {
          this.vy = -380;
          this.stateTimer = 0;
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
        }
        
        // Timeout retrieval
        if (this.stateTimer > 5.0) {
          this.state = NPC_STATE.PATROL;
          this.stateTimer = 0;
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
    this.state = NPC_STATE.PATROL;
    this.stateTimer = 0;
    this.patrolDirection = Math.random() > 0.5 ? 1 : -1;
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

  render(ctx) {
    if (this.dead) {
      ctx.globalAlpha = 0.5;
    }

    // Draw NPC body
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x, this.y, this.width, this.height);
    
    // Draw outline
    ctx.strokeStyle = PALETTE.ink;
    ctx.globalAlpha = 0.6;
    ctx.lineWidth = 1;
    ctx.strokeRect(this.x, this.y, this.width, this.height);
    ctx.globalAlpha = 1.0;
    
    // Draw simple face/eyes
    ctx.fillStyle = PALETTE.ink;
    const eyeY = this.y + 6;
    ctx.fillRect(this.x + 3, eyeY, 2, 2); // Left eye
    ctx.fillRect(this.x + 7, eyeY, 2, 2); // Right eye

    // Draw arrow indicator
    if (this.arrows > 0) {
      ctx.fillStyle = PALETTE.accent3;
      ctx.fillRect(this.x + this.width / 2 - 1, this.y - 4, 2, 3);
    }

    ctx.globalAlpha = 1.0;
  }
}

