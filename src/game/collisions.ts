// Collision Detection System
import type { Bounds } from './world.js';

export interface Collidable extends Bounds {
  id: number | string;
  dead?: boolean;
}

export class CollisionSystem {
  // AABB collision check
  checkAABB(rect1: Bounds, rect2: Bounds): boolean {
    return (
      rect1.x < rect2.x + rect2.width &&
      rect1.x + rect1.width > rect2.x &&
      rect1.y < rect2.y + (rect2.height || 0) &&
      rect1.y + (rect1.height || 0) > rect2.y
    );
  }

  // Check if arrow hits player
  checkArrowPlayer(arrow: Bounds & { ownerId: number | string }, player: Collidable): boolean {
    if (arrow.ownerId === player.id || player.dead) return false;
    return this.checkAABB(arrow, player);
  }

  // Check if player stomps another player
  checkStomp(player: Bounds & { vy: number }, target: Collidable, stompSpeed: number = 220): boolean {
    if (target.dead || player.vy <= stompSpeed) return false;
    
    const playerFeet: Bounds = {
      x: player.x,
      y: player.y + (player.height || 0) - 4,
      width: player.width || 0,
      height: 4
    };
    
    const targetHead: Bounds = {
      x: target.x,
      y: target.y,
      width: target.width || 0,
      height: 4
    };
    
    return this.checkAABB(playerFeet, targetHead);
  }

  // Check if player can pickup arrow (squared distance for efficiency)
  checkArrowPickup(player: Bounds, arrow: Bounds, pickupRadius: number = 16): boolean {
    const playerCenterX = player.x + (player.width || 0) / 2;
    const playerCenterY = player.y + (player.height || 0) / 2;
    const arrowCenterX = arrow.x + (arrow.width || 0) / 2;
    const arrowCenterY = arrow.y + (arrow.height || 0) / 2;
    
    const dx = playerCenterX - arrowCenterX;
    const dy = playerCenterY - arrowCenterY;
    const distSq = dx * dx + dy * dy;
    
    return distSq < (pickupRadius * pickupRadius);
  }
}

