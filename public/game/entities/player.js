// Player entity with movement, jumping, and combat
export class Player {
  constructor(x, y, id, color) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.width = 20;
    this.height = 28;
    this.vx = 0;
    this.vy = 0;
    this.color = color;
    this.facing = 1; // 1 = right, -1 = left
    this.onGround = false;
    this.wasOnGround = false;
    this.touchingWall = { left: false, right: false };
    this.coyoteTime = 0;
    this.jumpBuffer = 0;
    this.arrows = 3;
    this.maxArrows = 5;
    this.dead = false;
    this.wins = 0;
  }

  update(dt, level, input) {
    if (this.dead) return;

    // Coyote time: allow jump shortly after leaving ground
    if (this.wasOnGround && !this.onGround) {
      this.coyoteTime = 0.1; // 100ms
    }
    if (this.coyoteTime > 0) {
      this.coyoteTime -= dt;
    }

    // Jump buffer: allow jump slightly before landing
    if (input.jump) {
      this.jumpBuffer = 0.12; // 120ms
    }
    if (this.jumpBuffer > 0) {
      this.jumpBuffer -= dt;
    }

    // Horizontal movement
    const groundSpeed = 140; // px/s
    const airControl = 0.65;
    const accel = 1200; // px/s^2
    const friction = 900; // px/s^2

    let targetVx = 0;
    if (input.moveX !== 0) {
      targetVx = input.moveX * groundSpeed;
      this.facing = input.moveX;
    }

    if (this.onGround) {
      // Ground movement
      if (Math.abs(targetVx) > 0.1) {
        this.vx = this.approach(this.vx, targetVx, accel * dt);
      } else {
        this.vx = this.approach(this.vx, 0, friction * dt);
      }
    } else {
      // Air movement (reduced control)
      if (Math.abs(targetVx) > 0.1) {
        this.vx = this.approach(this.vx, targetVx, accel * airControl * dt);
      }
    }

    // Jumping
    if (this.jumpBuffer > 0 && (this.onGround || this.coyoteTime > 0)) {
      this.vy = -360; // Jump velocity
      this.jumpBuffer = 0;
      this.coyoteTime = 0;
    }

    // Gravity
    const gravity = 1400; // px/s^2
    const maxFallSpeed = 640; // px/s
    this.vy += gravity * dt;
    if (this.vy > maxFallSpeed) {
      this.vy = maxFallSpeed;
    }

    // Wall slide
    const wallSlideSpeed = 200; // px/s
    if (!this.onGround && this.vy > 0) {
      if ((this.touchingWall.left && input.moveX < 0) || 
          (this.touchingWall.right && input.moveX > 0)) {
        if (this.vy > wallSlideSpeed) {
          this.vy = wallSlideSpeed;
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

    // Clamp to level bounds (optional - could wrap around)
    const levelWidth = level.width * level.tileSize;
    const levelHeight = level.height * level.tileSize;
    if (this.x < 0) this.x = 0;
    if (this.x + this.width > levelWidth) this.x = levelWidth - this.width;
    if (this.y < 0) this.y = 0;
    if (this.y + this.height > levelHeight) this.y = levelHeight - this.height;
  }

  // Helper: smoothly approach target value
  approach(current, target, step) {
    if (current < target) {
      return Math.min(current + step, target);
    } else {
      return Math.max(current - step, target);
    }
  }

  // Fire arrow
  fireArrow() {
    if (this.arrows > 0 && !this.dead) {
      this.arrows--;
      return true;
    }
    return false;
  }

  // Pickup arrow
  pickupArrow() {
    if (this.arrows < this.maxArrows) {
      this.arrows++;
      return true;
    }
    return false;
  }

  // Knockout
  knockout() {
    this.dead = true;
    this.vx = 0;
    this.vy = 0;
  }

  // Respawn for new round
  respawn(x, y) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.dead = false;
    this.arrows = 3;
    this.coyoteTime = 0;
    this.jumpBuffer = 0;
  }

  // Render player
  render(ctx) {
    if (this.dead) {
      ctx.globalAlpha = 0.5;
    }

    ctx.fillStyle = this.color;
    ctx.fillRect(this.x, this.y, this.width, this.height);

    // Draw facing indicator
    ctx.fillStyle = '#ffffff';
    const indicatorX = this.facing > 0 
      ? this.x + this.width - 4 
      : this.x + 4;
    ctx.fillRect(indicatorX, this.y + 8, 2, 4);

    ctx.globalAlpha = 1.0;
  }

  // Get AABB bounds
  getBounds() {
    return {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height
    };
  }

  // Check if player is stomping (falling fast)
  isStomping() {
    return this.vy > 220;
  }

  // Get feet bounds for stomp detection
  getFeetBounds() {
    return {
      x: this.x,
      y: this.y + this.height - 4,
      width: this.width,
      height: 4
    };
  }

  // Get head bounds for stomp detection
  getHeadBounds() {
    return {
      x: this.x,
      y: this.y,
      width: this.width,
      height: 4
    };
  }
}

