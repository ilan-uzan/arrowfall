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
    this.countdown = 0;
    this.countdownText = '';
    this.roundActive = false;
    this.collisions = new CollisionSystem();
  }

  enter() {
    try {
      // Validate world and spawns exist
      if (!this.game.world || !this.game.world.spawns) {
        console.error('World or spawns missing!');
        return;
      }
      
      // Create player with safe spawn access
      const spawn = this.game.world.spawns.p1 || { x: 32, y: 114 };
      this.player = new Player(spawn.x, spawn.y, 1, PLAYER_COLORS[0], this.game.physics);
      
      // Bind first gamepad to player
      this.game.inputRouter.update();
      const gamepads = this.game.inputRouter.getAllGamepads();
      if (gamepads.length > 0) {
        this.game.inputRouter.bindGamepad(1, gamepads[0].index);
      }
      
      // Create NPCs
      this.spawnWave();
      
      // Countdown
      this.countdown = 3.0;
      this.countdownText = '3';
      this.roundActive = false;
      
      console.log('Survival scene entered');
    } catch (error) {
      console.error('Error entering survival scene:', error);
    }
  }

  spawnWave() {
    try {
      this.npcs = [];
      
      // Validate world and spawns exist
      if (!this.game.world || !this.game.world.spawns) {
        console.error('World or spawns missing in spawnWave!');
        return;
      }
      
      const spawn1 = this.game.world.spawns.npc1 || { x: 96, y: 114 };
      const spawn2 = this.game.world.spawns.npc2 || { x: 224, y: 114 };
      
      const npc1 = new NPC(spawn1.x, spawn1.y, 2, PLAYER_COLORS[1], this.game.physics);
      const npc2 = new NPC(spawn2.x, spawn2.y, 3, PLAYER_COLORS[2], this.game.physics);
      
      npc1.setWave(this.wave);
      npc2.setWave(this.wave);
      
      this.npcs = [npc1, npc2];
      this.arrows = [];
    } catch (error) {
      console.error('Error spawning wave:', error);
    }
  }

  update(dt) {
    // Validate dt
    if (!dt || dt <= 0 || dt > 0.1) {
      dt = 1/60;
    }

    // Countdown
    if (this.countdown > 0) {
      this.countdown -= dt;
      if (this.countdown > 2) {
        this.countdownText = '3';
      } else if (this.countdown > 1) {
        this.countdownText = '2';
      } else if (this.countdown > 0) {
        this.countdownText = '1';
      } else {
        this.countdownText = 'GO!';
        this.roundActive = true;
        setTimeout(() => {
          this.countdownText = '';
        }, 500);
      }
      return;
    }
    
    if (!this.roundActive) return;

    if (!this.player || this.player.dead) {
      // Game over
      this.game.matchWinner = null;
      this.game.matchWave = this.wave;
      this.game.setScene('results');
      return;
    }
    
    try {
      // Update player with error handling
      const actions = this.game.inputRouter.getActions(1);
      if (actions) {
        const newArrow = this.player.update(dt, this.game.world, actions);
        if (newArrow) {
          this.arrows.push(newArrow);
        }
        
        // Check for stomp collisions with NPCs
        for (const npc of this.npcs) {
          if (!npc || npc.dead) continue;
          try {
            if (this.game.collisions.checkStomp(this.player, npc)) {
              // Player stomped NPC
              npc.die();
              this.game.fx.createDeathParticles(npc.x, npc.y, npc.color);
              this.game.fx.triggerScreenShake(4, 0.1);
              // Bounce player up slightly after stomp
              this.player.vy = -200;
            }
          } catch (error) {
            console.error('Error checking stomp collision:', error);
          }
        }
      }
      
      // Update NPCs with error handling
      for (const npc of this.npcs) {
        if (!npc || npc.dead) continue;
        try {
          const newArrow = npc.update(dt, this.game.world, this.player, this.arrows);
          if (newArrow) {
            this.arrows.push(newArrow);
          }
        } catch (error) {
          console.error('Error updating NPC:', error);
        }
      }
      
      // Update arrows with safe iteration
      const arrowsToRemove = [];
      for (let i = 0; i < this.arrows.length; i++) {
        const arrow = this.arrows[i];
        if (!arrow || !arrow.active) {
          arrowsToRemove.push(i);
          continue;
        }
        
        try {
          arrow.update(dt, this.game.world);
          
          // Check arrow collisions with player (only if flying)
          if (!arrow.embedded && arrow.ownerId !== this.player.id && this.player && !this.player.dead) {
            try {
              if (this.collisions.checkArrowPlayer(arrow, this.player)) {
                this.player.die();
                this.game.fx.createDeathParticles(this.player.x, this.player.y, this.player.color);
                this.game.fx.triggerScreenShake(6, 0.15);
                arrow.remove();
                arrowsToRemove.push(i);
                continue; // Arrow hit player, move to next arrow
              }
            } catch (error) {
              console.error('Error checking arrow-player collision:', error);
            }
          }
          
          // Check arrow collisions with NPCs (only if flying)
          if (!arrow.embedded) {
            for (const npc of this.npcs) {
              if (!npc || npc.dead || arrow.ownerId === npc.id) continue;
              try {
                if (this.collisions.checkArrowPlayer(arrow, npc)) {
                  npc.die();
                  this.game.fx.createDeathParticles(npc.x, npc.y, npc.color);
                  this.game.fx.triggerScreenShake(4, 0.1);
                  arrow.remove();
                  arrowsToRemove.push(i);
                  break; // Arrow hit NPC, move to next arrow
                }
              } catch (error) {
                console.error('Error checking arrow-NPC collision:', error);
              }
            }
          }
          
          // Check arrow pickup (only if embedded)
          if (arrow.embedded) {
            // Player pickup
            if (this.player && !this.player.dead) {
              try {
                if (this.collisions.checkArrowPickup(this.player, arrow, 16)) {
                  if (this.player.pickupArrow()) {
                    arrow.remove();
                    arrowsToRemove.push(i);
                    continue; // Arrow picked up by player, move to next arrow
                  }
                }
              } catch (error) {
                console.error('Error checking player arrow pickup:', error);
              }
            }
            
            // NPC pickup
            for (const npc of this.npcs) {
              if (!npc || npc.dead) continue;
              try {
                if (this.collisions.checkArrowPickup(npc, arrow, 16)) {
                  if (npc.pickupArrow()) {
                    arrow.remove();
                    arrowsToRemove.push(i);
                    break; // Arrow picked up by NPC, move to next arrow
                  }
                }
              } catch (error) {
                console.error('Error checking NPC arrow pickup:', error);
              }
            }
          }
          
          // Mark inactive arrows for removal
          if (!arrow.active) {
            arrowsToRemove.push(i);
          }
        } catch (error) {
          console.error('Error updating arrow:', error);
          arrowsToRemove.push(i);
        }
      }
      
      // Remove inactive arrows (in reverse order to maintain indices)
      for (let i = arrowsToRemove.length - 1; i >= 0; i--) {
        this.arrows.splice(arrowsToRemove[i], 1);
      }
      
      // Check wave completion
      const aliveNPCs = this.npcs.filter(n => n && !n.dead);
      if (aliveNPCs.length === 0 && this.npcs.length > 0) {
        // Next wave
        this.wave++;
        const spawn = this.game.world?.spawns?.p1 || { x: 32, y: 114 };
        if (this.player && this.player.respawn) {
          this.player.respawn(spawn.x, spawn.y);
        }
        this.spawnWave();
      }
      
      // Update FX
      if (this.game.fx) {
        this.game.fx.update(dt);
      }
    } catch (error) {
      console.error('Critical error in survival update:', error);
    }
  }

  exit() {
    // Cleanup
  }

  handleInput(actions, playerId) {
    // Pause handled in update
  }

  render(ctx, alpha) {
    if (!ctx) return;
    
    try {
      // Render world and entities
      if (this.game.renderer && this.game.renderer.render) {
        this.game.renderer.render(alpha, {
          players: this.player ? [this.player] : [],
          arrows: this.arrows || [],
          npcs: this.npcs || []
        });
      } else {
        // Fallback: render manually if renderer not available
        if (this.game.world && this.game.world.render) {
          this.game.world.render(ctx);
        }
        
        // Render player
        if (this.player && !this.player.dead && this.player.render) {
          this.player.render(ctx);
        }
        
        // Render NPCs
        if (this.npcs) {
          for (const npc of this.npcs) {
            if (npc && !npc.dead && npc.render) {
              npc.render(ctx);
            }
          }
        }
        
        // Render arrows
        if (this.arrows) {
          for (const arrow of this.arrows) {
            if (arrow && arrow.active && arrow.render) {
              arrow.render(ctx);
            }
          }
        }
      }
      
      // HUD
      const { w, h } = VIEW;
      
      // Countdown
      if (this.countdown > 0) {
        ctx.fillStyle = PALETTE.accent;
        ctx.font = 'bold 24px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.countdownText, w / 2, h / 2);
      }
      
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
      if (this.player) {
        ctx.fillStyle = PALETTE.sub;
        ctx.fillText(`Arrows: ${this.player.arrows}`, 80, 5);
      }
      
      // NPCs alive
      const aliveNPCs = this.npcs ? this.npcs.filter(n => n && !n.dead).length : 0;
      ctx.fillStyle = PALETTE.accent2;
      ctx.fillText(`NPCs: ${aliveNPCs}`, 150, 5);
    } catch (error) {
      console.error('Error rendering survival scene:', error);
      // Fallback render
      ctx.fillStyle = PALETTE.bg0;
      ctx.fillRect(0, 0, VIEW.w, VIEW.h);
      ctx.fillStyle = PALETTE.accent;
      ctx.font = '16px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Error rendering scene', VIEW.w / 2, VIEW.h / 2);
    }
  }
}

