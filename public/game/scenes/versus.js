// Versus Scene - 2-4 Player Local Multiplayer
import { PALETTE, VIEW, WINS_TO_VICTORY } from '../engine/constants.js';
import { Player } from '../engine/entities/player.js';
import { Arrow } from '../engine/entities/arrow.js';
import { CollisionSystem } from '../engine/collisions.js';

export class VersusScene {
  constructor(game) {
    this.game = game;
    this.players = [];
    this.arrows = [];
    this.round = 1;
    this.scores = {}; // playerId -> wins
    this.roundActive = false;
    this.countdown = 0;
    this.countdownText = '';
    this.collisions = new CollisionSystem();
  }

  enter() {
    try {
      // Validate world and spawns exist
      if (!this.game.world || !this.game.world.spawns) {
        console.error('World or spawns missing in versus scene!');
        return;
      }
      
      // Get players from lobby or create default
      if (this.game.matchPlayers && this.game.matchPlayers.length >= 2) {
        this.players = this.game.matchPlayers.map(p => {
          const spawn = this.game.world.spawns[`p${p.id}`] || { x: 32, y: 128 };
          const newPlayer = new Player(spawn.x, spawn.y, p.id, p.color, this.game.physics);
          newPlayer.wins = 0;
          return newPlayer;
        });
      } else {
        // Fallback: create 2 default players
        const spawn1 = this.game.world.spawns.p1 || { x: 32, y: 128 };
        const spawn2 = this.game.world.spawns.p2 || { x: 288, y: 128 };
        this.players = [
          new Player(spawn1.x, spawn1.y, 1, PALETTE.player1, this.game.physics),
          new Player(spawn2.x, spawn2.y, 2, PALETTE.player2, this.game.physics)
        ];
        // Bind first two gamepads
        this.game.inputRouter.update();
        const gamepads = this.game.inputRouter.getAllGamepads();
        if (gamepads.length >= 1) this.game.inputRouter.bindGamepad(1, gamepads[0].index);
        if (gamepads.length >= 2) this.game.inputRouter.bindGamepad(2, gamepads[1].index);
      }
      
      // Initialize scores
      this.players.forEach(p => {
        if (p && p.id) {
          this.scores[p.id] = 0;
        }
      });
      
      this.arrows = [];
      this.round = 1;
      this.roundActive = false;
      this.countdown = 3.0;
      this.countdownText = '3';
      console.log('Versus scene entered');
    } catch (error) {
      console.error('Error entering versus scene:', error);
    }
  }

  update(dt) {
    // Validate dt
    if (!dt || dt <= 0 || dt > 0.1) {
      dt = 1/60;
    }

    try {
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
    
    // Update all players with error handling
    for (const player of this.players) {
      if (!player || player.dead) continue;
      
      try {
        const actions = this.game.inputRouter.getActions(player.id);
        // Only update if actions exist (gamepad connected)
        if (actions) {
          const newArrow = player.update(dt, this.game.world, actions);
          if (newArrow) {
            this.arrows.push(newArrow);
          }
        } else {
          // Gamepad disconnected - mark player as dead after a short delay
          // This prevents instant death on temporary disconnects
        }
      } catch (error) {
        console.error(`Error updating player ${player.id}:`, error);
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
        
        // Check arrow collisions with players (only if arrow is flying)
        if (!arrow.embedded) {
          for (const player of this.players) {
            if (!player || player.dead || arrow.ownerId === player.id) continue;
            try {
              if (this.collisions.checkArrowPlayer(arrow, player)) {
                player.die();
                this.game.fx.createDeathParticles(player.x, player.y, player.color);
                this.game.fx.triggerScreenShake(4, 0.1);
                arrow.remove();
                arrowsToRemove.push(i);
                break; // Arrow hit someone, move to next arrow
              }
            } catch (error) {
              console.error('Error checking arrow-player collision:', error);
            }
          }
        }
        
        // Check arrow pickup (only if embedded)
        if (arrow.embedded) {
          for (const player of this.players) {
            if (!player || player.dead) continue;
            try {
              if (this.collisions.checkArrowPickup(player, arrow, 16)) {
                if (player.pickupArrow()) {
                  arrow.remove();
                  arrowsToRemove.push(i);
                  break; // Arrow picked up, move to next arrow
                }
              }
            } catch (error) {
              console.error('Error checking arrow pickup:', error);
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
    
      // Check for round end
      const alivePlayers = this.players.filter(p => p && !p.dead);
      
      if (alivePlayers.length === 1) {
        // Winner!
        const winner = alivePlayers[0];
        if (winner && winner.id) {
          winner.wins++;
          this.scores[winner.id] = winner.wins;
          
          if (winner.wins >= WINS_TO_VICTORY) {
            // Match over
            this.game.matchWinner = winner;
            this.game.matchScores = this.scores;
            this.game.setScene('results');
          } else {
            // Next round
            this.nextRound();
          }
        }
      } else if (alivePlayers.length === 0) {
        // Double-KO - replay round
        this.nextRound();
      }
      
      // Update FX
      if (this.game.fx) {
        this.game.fx.update(dt);
      }
    } catch (error) {
      console.error('Critical error in versus update:', error);
    }
  }

  nextRound() {
    this.round++;
    this.roundActive = false;
    this.countdown = 3.0;
    this.countdownText = '3';
    this.arrows = [];
    
    // Respawn all players
    this.players.forEach(player => {
      if (!player) return;
      const spawn = this.game.world?.spawns?.[`p${player.id}`] || { x: 32, y: 128 };
      player.respawn(spawn.x, spawn.y);
    });
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
      players: this.players,
      arrows: this.arrows,
      npcs: []
    });
    
    // HUD
    const { w, h } = VIEW;
    
    // Scoreboard (top)
    ctx.fillStyle = PALETTE.bg1;
    ctx.globalAlpha = 0.8;
    ctx.fillRect(0, 0, w, 20);
    ctx.globalAlpha = 1.0;
    
    ctx.font = '8px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = PALETTE.sub;
    ctx.fillText(`Round ${this.round}`, 5, 5);
    
    // Player scores
    let x = 80;
    for (const player of this.players) {
      if (!player) continue;
      ctx.fillStyle = player.color;
      ctx.fillText(`P${player.id}: ${this.scores[player.id] || 0}`, x, 5);
      x += 50;
    }
    
    // Countdown - show during countdown
    if (this.countdown > 0) {
      ctx.fillStyle = PALETTE.accent;
      ctx.font = 'bold 24px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.countdownText, w / 2, h / 2);
    } else if (this.countdownText === 'GO!' && this.roundActive) {
      // Show GO! briefly then clear
      ctx.fillStyle = PALETTE.accent;
      ctx.font = 'bold 24px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('GO!', w / 2, h / 2);
    }
    
    // Pause hint
    if (this.roundActive) {
      ctx.fillStyle = PALETTE.sub;
      ctx.font = '8px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('Start/Options: Pause', w / 2, h - 10);
    }
  }
}

