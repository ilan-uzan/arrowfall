// Physics utilities for collision detection and resolution
export class Physics {
  // AABB collision detection
  static checkAABB(rect1, rect2) {
    return (
      rect1.x < rect2.x + rect2.width &&
      rect1.x + rect1.width > rect2.x &&
      rect1.y < rect2.y + rect2.height &&
      rect1.y + rect1.height > rect2.y
    );
  }

  // Check if rect1 is above rect2
  static isAbove(rect1, rect2) {
    return rect1.y + rect1.height < rect2.y + rect2.height * 0.3;
  }

  // Apply coyote time (allow jump shortly after leaving ground)
  static applyCoyoteTime(wasOnGround, onGround, coyoteTime, dt) {
    if (wasOnGround && !onGround && coyoteTime <= 0) {
      return 0.1; // 100ms
    }
    return Math.max(0, coyoteTime - dt);
  }

  // Apply jump buffer (allow jump slightly before landing)
  static applyJumpBuffer(inputJump, jumpBuffer, dt) {
    if (inputJump && jumpBuffer <= 0) {
      return 0.12; // 120ms
    }
    return Math.max(0, jumpBuffer - dt);
  }

  // Resolve collision between two AABBs
  static resolveCollision(rect1, rect2) {
    const dx = (rect1.x + rect1.width / 2) - (rect2.x + rect2.width / 2);
    const dy = (rect1.y + rect1.height / 2) - (rect2.y + rect2.height / 2);
    const overlapX = (rect1.width + rect2.width) / 2 - Math.abs(dx);
    const overlapY = (rect1.height + rect2.height) / 2 - Math.abs(dy);

    if (overlapX < overlapY) {
      if (dx > 0) {
        return { x: overlapX, y: 0 };
      } else {
        return { x: -overlapX, y: 0 };
      }
    } else {
      if (dy > 0) {
        return { x: 0, y: overlapY };
      } else {
        return { x: 0, y: -overlapY };
      }
    }
  }
}

