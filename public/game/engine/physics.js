// Physics System - AABB Collision & Movement
import { GRAVITY, MOVE_ACC, MAX_VEL_X, JUMP_VEL, WALL_SLIDE_MAX, COYOTE_MS, JUMP_BUFFER_MS, FIXED_DT } from './constants.js';

export class PhysicsSystem {
  constructor(world) {
    this.world = world;
  }

  updateEntity(entity, dt = FIXED_DT) {
    // Coyote time
    if (entity.wasOnGround && !entity.onGround) {
      entity.coyoteTime = COYOTE_MS / 1000;
    }
    if (entity.coyoteTime > 0) {
      entity.coyoteTime -= dt;
    }

    // Gravity
    entity.vy += GRAVITY * dt;
    const maxFallSpeed = 640;
    if (entity.vy > maxFallSpeed) {
      entity.vy = maxFallSpeed;
    }

    // Update position
    entity.x += entity.vx * dt;
    entity.y += entity.vy * dt;

    // Check ground
    entity.wasOnGround = entity.onGround;
    entity.onGround = this.world.checkOnGround(entity);

    // Check walls
    entity.touchingWall.left = this.world.checkTouchingWall(entity, 'left');
    entity.touchingWall.right = this.world.checkTouchingWall(entity, 'right');

    // Resolve collisions
    this.world.resolveCollision(entity);

    // Clamp to world bounds
    const worldWidth = this.world.width * this.world.tileSize;
    const worldHeight = this.world.height * this.world.tileSize;
    if (entity.x < 0) entity.x = 0;
    if (entity.x + entity.width > worldWidth) entity.x = worldWidth - entity.width;
    if (entity.y < 0) entity.y = 0;
    if (entity.y + entity.height > worldHeight) entity.y = worldHeight - entity.height;
  }

  applyHorizontalMovement(entity, targetVx, dt = FIXED_DT, inAir = false) {
    if (inAir) {
      // Air movement (reduced control)
      if (Math.abs(targetVx) > 0.1) {
        entity.vx = this.approach(entity.vx, targetVx, MOVE_ACC * dt * 0.65);
      }
    } else {
      // Ground movement
      if (Math.abs(targetVx) > 0.1) {
        entity.vx = this.approach(entity.vx, targetVx, MOVE_ACC * dt);
      } else {
        entity.vx = this.approach(entity.vx, 0, MOVE_ACC * dt * 0.75); // Friction
      }
    }
  }

  applyJump(entity, jumpPressed) {
    // Jump buffer - capture jump press
    if (jumpPressed && entity.jumpBuffer <= 0) {
      entity.jumpBuffer = JUMP_BUFFER_MS / 1000;
    }
    if (entity.jumpBuffer > 0) {
      entity.jumpBuffer -= FIXED_DT; // Fixed timestep
    }

    // Execute jump
    if (entity.jumpBuffer > 0 && (entity.onGround || entity.coyoteTime > 0)) {
      entity.vy = JUMP_VEL;
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

  approach(current, target, step) {
    if (current < target) {
      return Math.min(current + step, target);
    } else {
      return Math.max(current - step, target);
    }
  }
}

