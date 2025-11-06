// Rendering System - Unified Pipeline with Ghost Rendering
import { PALETTE, VIEW } from './constants.js';
import { getGhostOffsets } from './wrap.js';

export class RenderSystem {
  constructor(ctx, world, fx) {
    this.ctx = ctx;
    this.world = world;
    this.fx = fx;
  }

  render(alpha, entities) {
    const { w, h } = VIEW;
    
    // Clear canvas
    this.ctx.fillStyle = PALETTE.bg0;
    this.ctx.fillRect(0, 0, w, h);
    
    // Apply screen shake
    this.ctx.save();
    this.ctx.translate(this.fx.screenShake.x, this.fx.screenShake.y);
    
    // Draw order: BG → tiles → stuck arrows → NPCs → players → active arrows → particles → HUD
    
    // 1. Background & World
    this.world.render(this.ctx);
    
    // 2. Embedded arrows (stuck in walls) with ghost copies
    if (entities.arrows) {
      for (const arrow of entities.arrows) {
        if (arrow.embedded && arrow.active) {
          // Main render
          arrow.render(this.ctx);
          // Ghost copies for wrapping
          const offsets = getGhostOffsets(arrow.x, arrow.y, arrow.width, arrow.height);
          for (const offset of offsets) {
            arrow.render(this.ctx, offset.x, offset.y);
          }
        }
      }
    }
    
    // 3. NPCs with ghost copies
    if (entities.npcs) {
      for (const npc of entities.npcs) {
        if (!npc.dead) {
          // Main render
          npc.render(this.ctx);
          // Ghost copies for wrapping
          const offsets = getGhostOffsets(npc.x, npc.y, npc.width, npc.height);
          for (const offset of offsets) {
            npc.render(this.ctx, offset.x, offset.y);
          }
        }
      }
    }
    
    // 4. Players with ghost copies
    if (entities.players) {
      for (const player of entities.players) {
        if (!player.dead) {
          // Main render
          player.render(this.ctx);
          // Ghost copies for wrapping
          const offsets = getGhostOffsets(player.x, player.y, player.width, player.height);
          for (const offset of offsets) {
            player.render(this.ctx, offset.x, offset.y);
          }
        }
      }
    }
    
    // 5. Active arrows (flying) with ghost copies
    if (entities.arrows) {
      for (const arrow of entities.arrows) {
        if (!arrow.embedded && arrow.active) {
          // Main render
          arrow.render(this.ctx);
          // Ghost copies for wrapping
          const offsets = getGhostOffsets(arrow.x, arrow.y, arrow.width, arrow.height);
          for (const offset of offsets) {
            arrow.render(this.ctx, offset.x, offset.y);
          }
        }
      }
    }
    
    // 6. Particles (no wrapping needed - they fade quickly)
    this.fx.renderParticles(this.ctx);
    
    this.ctx.restore();
    
    // 7. Hit flash overlay (not affected by shake)
    this.fx.renderHitFlash(this.ctx, w, h);
  }
}

