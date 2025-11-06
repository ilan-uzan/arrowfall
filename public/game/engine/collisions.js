// Collision Detection System
export class CollisionSystem {
  // AABB collision check with null safety
  checkAABB(rect1, rect2) {
    if (!rect1 || !rect2) return false;
    
    const r1x = rect1.x || 0;
    const r1y = rect1.y || 0;
    const r1w = rect1.width || 0;
    const r1h = rect1.height || 0;
    
    const r2x = rect2.x || 0;
    const r2y = rect2.y || 0;
    const r2w = rect2.width || 0;
    const r2h = rect2.height || 0;
    
    return (
      r1x < r2x + r2w &&
      r1x + r1w > r2x &&
      r1y < r2y + r2h &&
      r1y + r1h > r2y
    );
  }

  // Check if arrow hits player
  checkArrowPlayer(arrow, player) {
    if (!arrow || !player) return false;
    if (arrow.ownerId === player.id || player.dead) return false;
    return this.checkAABB(arrow, player);
  }

  // Check if player stomps another player
  checkStomp(player, target, stompSpeed = 220) {
    if (!player || !target) return false;
    if (target.dead || (player.vy || 0) <= stompSpeed) return false;
    
    const playerFeet = {
      x: player.x || 0,
      y: (player.y || 0) + ((player.height || 0) - 4),
      width: player.width || 0,
      height: 4
    };
    
    const targetHead = {
      x: target.x || 0,
      y: target.y || 0,
      width: target.width || 0,
      height: 4
    };
    
    return this.checkAABB(playerFeet, targetHead);
  }

  // Check if player can pickup arrow (squared distance for efficiency)
  checkArrowPickup(player, arrow, pickupRadius = 16) {
    if (!player || !arrow) return false;
    
    const playerCenterX = (player.x || 0) + ((player.width || 0) / 2);
    const playerCenterY = (player.y || 0) + ((player.height || 0) / 2);
    const arrowCenterX = (arrow.x || 0) + ((arrow.width || 0) / 2);
    const arrowCenterY = (arrow.y || 0) + ((arrow.height || 0) / 2);
    
    const dx = playerCenterX - arrowCenterX;
    const dy = playerCenterY - arrowCenterY;
    const distSq = dx * dx + dy * dy;
    
    return distSq < (pickupRadius * pickupRadius);
  }
}

