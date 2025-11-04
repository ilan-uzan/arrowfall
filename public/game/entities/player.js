// Player Entity - Arrowfall
import { GRAVITY, MOVE_ACC, MAX_SPEED, JUMP_VEL, WALL_SLIDE_MAX, COYOTE_MS, JUMP_BUFFER_MS, ARROW_SPEED, START_ARROWS, TILE, PALETTE, SCENES } from '../constants.js';
import { Arrow } from './Arrow.js';

export class Player {
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
    this.facing = 1; // 1 = right, -1 = left
    this.onGround = false;
    this.wasOnGround = false;
    this.touchingWall = { left: false, right: false };
    this.coyoteTime = 0;
    this.jumpBuffer = 0;
    this.arrows = START_ARROWS;
    this.maxArrows = 5;
    this.dead = false;
    this.wins = 0;
    this.score = 0;
    this.shootHeld = false;
  }

  update(dt, level, actions) {
    if (this.dead) return;

    // Coyote time
    if (this.wasOnGround && !this.onGround) {
      this.coyoteTime = COYOTE_MS / 1000;
    }
    if (this.coyoteTime > 0) {
      this.coyoteTime -= dt;
    }

    // Jump buffer
    if (actions.jumpPressed) {
      this.jumpBuffer = JUMP_BUFFER_MS / 1000;
    }
    if (this.jumpBuffer > 0) {
      this.jumpBuffer -= dt;
    }

    // Horizontal movement
    let targetVx = 0;
    if (actions.left) {
      targetVx = -MAX_SPEED;
      this.facing = -1;
    } else if (actions.right) {
      targetVx = MAX_SPEED;
      this.facing = 1;
    }

    if (this.onGround) {
      // Ground movement
      if (Math.abs(targetVx) > 0.1) {
        this.vx = this.approach(this.vx, targetVx, MOVE_ACC * dt);
      } else {
        this.vx = this.approach(this.vx, 0, MOVE_ACC * dt * 0.75); // Friction
      }
    } else {
      // Air movement (reduced control)
      if (Math.abs(targetVx) > 0.1) {
        this.vx = this.approach(this.vx, targetVx, MOVE_ACC * dt * 0.65);
      }
    }

    // Jumping
    if (this.jumpBuffer > 0 && (this.onGround || this.coyoteTime > 0)) {
      this.vy = JUMP_VEL;
      this.jumpBuffer = 0;
      this.coyoteTime = 0;
      this.game.audio.playJump();
    }

    // Gravity
    this.vy += GRAVITY * dt;
    const maxFallSpeed = 640;
    if (this.vy > maxFallSpeed) {
      this.vy = maxFallSpeed;
    }

    // Wall slide
    if (!this.onGround && this.vy > 0) {
      if ((this.touchingWall.left && actions.left) || 
          (this.touchingWall.right && actions.right)) {
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
    if (this.x < 0) this.x = 0;
    if (this.x + this.width > levelWidth) this.x = levelWidth - this.width;
    if (this.y < 0) this.y = 0;
    if (this.y + this.height > levelHeight) this.y = levelHeight - this.height;

    // Shooting
    if (actions.shootPressed && !this.shootHeld) {
      this.shootHeld = true;
      this.fireArrow();
    }
    if (!actions.shootPressed) {
      this.shootHeld = false;
    }
  }

  approach(current, target, step) {
    if (current < target) {
      return Math.min(current + step, target);
    } else {
      return Math.max(current - step, target);
    }
  }

  fireArrow() {
    if (this.arrows > 0 && !this.dead) {
      this.arrows--;
      const spawnX = this.x + (this.width / 2) + (this.facing * 12);
      const spawnY = this.y + (this.height / 2);
      const arrow = new Arrow(spawnX, spawnY, this.facing * ARROW_SPEED, 0, this.id, this.game);
      const arena = this.game.sceneManager.scenes.arena;
      const survival = this.game.sceneManager.scenes.survival;
      if (arena) {
        arena.arrows.push(arrow);
      } else if (survival) {
        survival.arrows.push(arrow);
      }
      this.game.audio.playShoot();
      return true;
    }
    return false;
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

  respawn(x, y) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.dead = false;
    this.arrows = START_ARROWS;
    this.coyoteTime = 0;
    this.jumpBuffer = 0;
  }

  render(ctx) {
    if (this.dead) {
      ctx.globalAlpha = 0.5;
    }

    // Draw player body (TowerFall-style)
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
    if (this.facing > 0) {
      // Looking right
      ctx.fillRect(this.x + 3, eyeY, 2, 2); // Left eye
      ctx.fillRect(this.x + 7, eyeY, 2, 2); // Right eye
    } else {
      // Looking left
      ctx.fillRect(this.x + 3, eyeY, 2, 2); // Left eye
      ctx.fillRect(this.x + 7, eyeY, 2, 2); // Right eye
    }

    // Draw arrow indicator (if has arrows)
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

  isStomping() {
    return this.vy > 220;
  }
}
