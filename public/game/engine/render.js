// Rendering System - Unified Pipeline
import { PALETTE, VIEW } from './constants.js';

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
    
    // 2. Embedded arrows (stuck in walls)
    if (entities.arrows) {
      for (const arrow of entities.arrows) {
        if (arrow.embedded && arrow.active) {
          arrow.render(this.ctx);
        }
      }
    }
    
    // 3. NPCs
    if (entities.npcs) {
      for (const npc of entities.npcs) {
        if (!npc.dead) {
          npc.render(this.ctx);
        }
      }
    }
    
    // 4. Players
    if (entities.players) {
      for (const player of entities.players) {
        if (!player.dead) {
          player.render(this.ctx);
        }
      }
    }
    
    // 5. Active arrows (flying)
    if (entities.arrows) {
      for (const arrow of entities.arrows) {
        if (!arrow.embedded && arrow.active) {
          arrow.render(this.ctx);
        }
      }
    }
    
    // 6. Particles
    this.fx.renderParticles(this.ctx);
    
    this.ctx.restore();
    
    // 7. Hit flash overlay (not affected by shake)
    this.fx.renderHitFlash(this.ctx, w, h);
  }
}

