// NPC Entity - Scripted Non-Player Character (Classic Game Design)
import { GRAVITY, MOVE_ACC, MAX_SPEED, JUMP_VEL, WALL_SLIDE_MAX, COYOTE_MS, JUMP_BUFFER_MS, ARROW_SPEED, START_ARROWS, PALETTE } from '../constants.js';
import { Arrow } from './Arrow.js';

// NPC States - Simple state machine (classic game design)
const NPC_STATE = {
  PATROL: 'patrol',
  AIM: 'aim',
  SHOOT: 'shoot',
  EVADE: 'evade',
  RETRIEVE: 'retrieve'
};

export class NPC {
  constructor(x, y, id, color, game) {
    this.id = id;
    this.game = game;
    this.x = x;
    this.y = y;
    this.width = 12;
    this.height = 14;
    this.vx = 0;
    this.vy = 0;
    this.color = color;
    this.facing = 1;
    this.onGround = false;
    this.wasOnGround = false;
    this.touchingWall = { left: false, right: false };
    this.coyoteTime = 0;
    this.jumpBuffer = 0;
    this.arrows = START_ARROWS;
    this.maxArrows = 5;
    this.dead = false;
    
    // NPC-specific scripted behavior
    this.state = NPC_STATE.PATROL;
    this.stateTimer = 0;
    this.targetX = 0;
    this.targetY = 0;
    this.patrolDirection = Math.random() > 0.5 ? 1 : -1;
    this.reactionDelay = 0.3; // 300ms reaction time (classic NPC delay)
    this.aimJitter = 8; // Aim inaccuracy (±8px)
    this.lastShootTime = 0;
    this.shootCooldown = 1.5; // 1.5s between shots
  }

  update(dt, level, player) {
    if (this.dead || !player || player.dead) return;

    // Basic physics (same as Player)
    this.updatePhysics(dt, level);

    // NPC scripted behavior
    this.updateBehavior(dt, level, player);
  }

  updatePhysics(dt, level) {
    // Coyote time
    if (this.wasOnGround && !this.onGround) {
      this.coyoteTime = COYOTE_MS / 1000;
    }
    if (this.coyoteTime > 0) {
      this.coyoteTime -= dt;
    }

    // Gravity
    this.vy += GRAVITY * dt;
    const maxFallSpeed = 640;
    if (this.vy > maxFallSpeed) {
      this.vy = maxFallSpeed;
    }

    // Wall slide
    if (!this.onGround && this.vy > 0) {
      if (this.touchingWall.left || this.touchingWall.right) {
        if (this.vy > WALL_SLIDE_MAX) {
          this.vy = WALL_SLIDE_MAX;
        }
      }
    }

    // Update position
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Check ground
    this.wasOnGround = this.onGround;
    this.onGround = level.checkOnGround(this);

    // Check walls
    this.touchingWall.left = level.checkTouchingWall(this, 'left');
    this.touchingWall.right = level.checkTouchingWall(this, 'right');

    // Resolve collisions
    level.resolveCollision(this);

    // Clamp to level bounds
    const levelWidth = level.width * level.tileSize;
    const levelHeight = level.height * level.tileSize;
    if (this.x < 0) {
      this.x = 0;
      this.patrolDirection = 1;
    }
    if (this.x + this.width > levelWidth) {
      this.x = levelWidth - this.width;
      this.patrolDirection = -1;
    }
    if (this.y < 0) this.y = 0;
    if (this.y + this.height > levelHeight) this.y = levelHeight - this.height;
  }

  updateBehavior(dt, level, player) {
    this.stateTimer += dt;
    this.lastShootTime += dt;

    // Cache player distance calculations (avoid repeated Math.sqrt)
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const distSq = dx * dx + dy * dy; // Use squared distance for comparisons
    const dist = Math.sqrt(distSq); // Only calculate when needed

    // Maintain distance - if too close, evade (use squared distance: 80^2 = 6400)
    if (distSq < 6400 && this.state !== NPC_STATE.EVADE) {
      this.state = NPC_STATE.EVADE;
      this.stateTimer = 0;
      this.evadeDirection = dx > 0 ? -1 : 1;
    }

    // Retrieve arrows if low on ammo (only check every 0.5s to reduce overhead)
    this.arrowCheckTimer = (this.arrowCheckTimer || 0) + dt;
    if (this.arrows < 2 && this.state !== NPC_STATE.RETRIEVE && this.state !== NPC_STATE.EVADE && this.arrowCheckTimer >= 0.5) {
      this.arrowCheckTimer = 0;
      // Look for nearby embedded arrows - check survival scene first
      const survival = this.game.sceneManager.scenes.survival;
      const arrows = survival ? survival.arrows : [];
      
      // Use squared distance for comparison (100^2 = 10000)
      let nearestArrow = null;
      let nearestDistSq = 10000;
      
      for (let i = 0; i < arrows.length; i++) {
        const arrow = arrows[i];
        if (!arrow.embedded) continue;
        
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

    // State machine - scripted behaviors
    switch (this.state) {
      case NPC_STATE.PATROL:
        // Simple patrol: move back and forth
        this.vx = this.patrolDirection * MAX_SPEED * 0.7;
        this.facing = this.patrolDirection;
        
        // Change direction at walls or after time
        if (this.touchingWall.left || this.touchingWall.right || this.stateTimer > 3) {
          this.patrolDirection *= -1;
          this.stateTimer = 0;
        }
        
        // Transition to aim if player is visible (use squared distance: 200^2 = 40000)
        if (distSq < 40000 && Math.abs(dy) < 60) {
          this.state = NPC_STATE.AIM;
          this.stateTimer = 0;
        }
        break;

      case NPC_STATE.AIM:
        // Face player
        this.facing = dx > 0 ? 1 : -1;
        this.vx = 0; // Stop to aim
        
        // After reaction delay, shoot
        if (this.stateTimer >= this.reactionDelay && this.lastShootTime >= this.shootCooldown) {
          this.state = NPC_STATE.SHOOT;
          this.stateTimer = 0;
        }
        
        // If player moved away, return to patrol (use squared distance: 250^2 = 62500)
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
          const arrowVx = Math.cos(angle) * ARROW_SPEED;
          const arrowVy = Math.sin(angle) * ARROW_SPEED;
          
          const arrow = new Arrow(spawnX, spawnY, arrowVx, arrowVy, this.id, this.game);
          // Add arrow to correct scene (prefer survival for NPCs)
          const survival = this.game.sceneManager.scenes.survival;
          const arena = this.game.sceneManager.scenes.arena;
          if (survival) {
            survival.arrows.push(arrow);
          } else if (arena) {
            arena.arrows.push(arrow);
          }
          this.game.audio.playShoot();
          this.lastShootTime = 0;
        }
        
        // Return to patrol
        this.state = NPC_STATE.PATROL;
        this.stateTimer = 0;
        break;

      case NPC_STATE.EVADE:
        // Jump away from player
        this.vx = this.evadeDirection * MAX_SPEED;
        this.facing = this.evadeDirection;
        
        // Jump if on ground
        if (this.onGround && this.stateTimer < 0.1) {
          this.vy = JUMP_VEL;
          this.game.audio.playJump();
        }
        
        // Return to patrol after evading (use squared distance: 150^2 = 22500)
        if (this.stateTimer > 1.0 || distSq > 22500) {
          this.state = NPC_STATE.PATROL;
          this.stateTimer = 0;
        }
        break;

      case NPC_STATE.RETRIEVE:
        // Move toward target arrow
        const targetDx = this.targetX - this.x;
        this.facing = targetDx > 0 ? 1 : -1;
        this.vx = this.facing * MAX_SPEED * 0.8;
        
        // Jump if needed
        const targetDy = this.targetY - this.y;
        if (this.onGround && targetDy < -20 && this.stateTimer > 0.2) {
          this.vy = JUMP_VEL;
          this.game.audio.playJump();
          this.stateTimer = 0;
        }
        
        // Check if arrow reached (use squared distance: 16^2 = 256)
        const targetDx = this.x - this.targetX;
        const targetDy = this.y - this.targetY;
        const arrowDistSq = targetDx * targetDx + targetDy * targetDy;
        if (arrowDistSq < 256) {
          // Pickup arrow
          if (this.arrows < this.maxArrows) {
            this.arrows++;
            this.game.audio.playPickup();
            // Remove arrow from scene
            const survival = this.game.sceneManager.scenes.survival;
            if (survival) {
              const arrowIndex = survival.arrows.findIndex(a => a.embedded && 
                Math.abs(a.x - this.targetX) < 16 && Math.abs(a.y - this.targetY) < 16);
              if (arrowIndex >= 0) {
                survival.arrows.splice(arrowIndex, 1);
              }
            }
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
  }

  die() {
    this.dead = true;
    this.vx = 0;
    this.vy = 0;
  }

  respawn(x, y) {
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
  }

  render(ctx) {
    if (this.dead) {
      ctx.globalAlpha = 0.5;
    }

    // Draw NPC body (same as Player but slightly different)
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

  getBounds() {
    return {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height
    };
  }
}

