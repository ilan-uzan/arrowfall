// Survival Scene - 1 Player vs 2 NPCs
import { PALETTE, VIEW, PLAYER_COLORS } from '../engine/constants.js';
import { Player } from '../engine/entities/player.js';
import { NPC } from '../engine/entities/npc.js';
import { Arrow } from '../engine/entities/arrow.js';
import { CollisionSystem } from '../engine/collisions.js';

export class SurvivalScene {
  constructor(game) {
    this.game = game;
    this.player = null;
    this.npcs = [];
    this.arrows = [];
    this.wave = 1;
    this.collisions = new CollisionSystem();
  }

  enter() {
    // Create player
    const spawn = this.game.world.spawns.p1;
    this.player = new Player(spawn.x, spawn.y, 1, PLAYER_COLORS[0], this.game.physics);
    
    // Bind first gamepad to player
    this.game.inputRouter.update();
    const gamepads = this.game.inputRouter.getAllGamepads();
    if (gamepads.length > 0) {
      this.game.inputRouter.bindGamepad(1, gamepads[0].index);
    }
    
    // Create NPCs
    this.spawnWave();
    console.log('Survival scene entered');
  }

  spawnWave() {
    this.npcs = [];
    const spawn1 = this.game.world.spawns.npc1;
    const spawn2 = this.game.world.spawns.npc2;
    
    const npc1 = new NPC(spawn1.x, spawn1.y, 2, PLAYER_COLORS[1], this.game.physics);
    const npc2 = new NPC(spawn2.x, spawn2.y, 3, PLAYER_COLORS[2], this.game.physics);
    
    npc1.setWave(this.wave);
    npc2.setWave(this.wave);
    
    this.npcs = [npc1, npc2];
    this.arrows = [];
  }

  update(dt) {
    if (this.player.dead) {
      // Game over
      this.game.matchWinner = null;
      this.game.matchWave = this.wave;
      this.game.setScene('results');
      return;
    }
    
    // Update player
    const actions = this.game.inputRouter.getActions(1);
    const newArrow = this.player.update(dt, this.game.world, actions);
    if (newArrow) {
      this.arrows.push(newArrow);
    }
    
    // Update NPCs
    for (const npc of this.npcs) {
      if (npc.dead) continue;
      const newArrow = npc.update(dt, this.game.world, this.player, this.arrows);
      if (newArrow) {
        this.arrows.push(newArrow);
      }
    }
    
    // Update arrows
    for (let i = this.arrows.length - 1; i >= 0; i--) {
      const arrow = this.arrows[i];
      arrow.update(dt, this.game.world);
      
      // Check arrow collisions with player
      if (!arrow.embedded && arrow.ownerId !== this.player.id) {
        if (this.collisions.checkArrowPlayer(arrow, this.player)) {
          this.player.die();
          this.game.fx.createDeathParticles(this.player.x, this.player.y, this.player.color);
          this.game.fx.triggerScreenShake(6, 0.15);
          arrow.remove();
        }
      }
      
      // Check arrow collisions with NPCs
      for (const npc of this.npcs) {
        if (npc.dead || arrow.ownerId === npc.id) continue;
        if (!arrow.embedded && this.collisions.checkArrowPlayer(arrow, npc)) {
          npc.die();
          this.game.fx.createDeathParticles(npc.x, npc.y, npc.color);
          this.game.fx.triggerScreenShake(4, 0.1);
          arrow.remove();
        }
      }
      
      // Check arrow pickup
      if (arrow.embedded) {
        if (this.collisions.checkArrowPickup(this.player, arrow, 16)) {
          if (this.player.pickupArrow()) {
            arrow.remove();
          }
        }
        for (const npc of this.npcs) {
          if (npc.dead) continue;
          if (this.collisions.checkArrowPickup(npc, arrow, 16)) {
            if (npc.pickupArrow()) {
              arrow.remove();
            }
          }
        }
      }
      
      // Remove inactive arrows
      if (!arrow.active) {
        this.arrows.splice(i, 1);
      }
    }
    
    // Check wave completion
    const aliveNPCs = this.npcs.filter(n => !n.dead);
    if (aliveNPCs.length === 0) {
      // Next wave
      this.wave++;
      this.player.respawn(this.game.world.spawns.p1.x, this.game.world.spawns.p1.y);
      this.spawnWave();
    }
    
    // Update FX
    this.game.fx.update(dt);
  }

  exit() {
    // Cleanup
  }

  handleInput(actions, playerId) {
    // Pause handled in update
  }

  render(ctx, alpha) {
    // Render world and entities
    this.game.renderer.render(alpha, {
      players: [this.player],
      arrows: this.arrows,
      npcs: this.npcs
    });
    
    // HUD
    const { w, h } = VIEW;
    
    // Wave counter (top)
    ctx.fillStyle = PALETTE.bg1;
    ctx.globalAlpha = 0.8;
    ctx.fillRect(0, 0, w, 20);
    ctx.globalAlpha = 1.0;
    
    ctx.font = '8px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = PALETTE.accent;
    ctx.fillText(`Wave ${this.wave}`, 5, 5);
    
    // Arrows counter
    ctx.fillStyle = PALETTE.sub;
    ctx.fillText(`Arrows: ${this.player.arrows}`, 80, 5);
    
    // NPCs alive
    const aliveNPCs = this.npcs.filter(n => !n.dead).length;
    ctx.fillStyle = PALETTE.accent2;
    ctx.fillText(`NPCs: ${aliveNPCs}`, 150, 5);
  }
}

