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
    // Get players from lobby or create default
    if (this.game.matchPlayers && this.game.matchPlayers.length >= 2) {
      this.players = this.game.matchPlayers.map(p => {
        const spawn = this.game.world.spawns[`p${p.id}`];
        const newPlayer = new Player(spawn.x, spawn.y, p.id, p.color, this.game.physics);
        newPlayer.wins = 0;
        return newPlayer;
      });
    } else {
      // Fallback: create 2 default players
      const spawn1 = this.game.world.spawns.p1;
      const spawn2 = this.game.world.spawns.p2;
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
      this.scores[p.id] = 0;
    });
    
    this.arrows = [];
    this.round = 1;
    this.roundActive = false;
    this.countdown = 3.0;
    this.countdownText = '3';
    console.log('Versus scene entered');
  }

  update(dt) {
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
    
    // Update all players
    for (const player of this.players) {
      if (player.dead) continue;
      
      const actions = this.game.inputRouter.getActions(player.id);
      const newArrow = player.update(dt, this.game.world, actions);
      if (newArrow) {
        this.arrows.push(newArrow);
      }
    }
    
    // Update arrows
    for (let i = this.arrows.length - 1; i >= 0; i--) {
      const arrow = this.arrows[i];
      arrow.update(dt, this.game.world);
      
      // Check arrow collisions with players
      for (const player of this.players) {
        if (player.dead || arrow.ownerId === player.id) continue;
        if (this.collisions.checkArrowPlayer(arrow, player)) {
          player.die();
          this.game.fx.createDeathParticles(player.x, player.y, player.color);
          this.game.fx.triggerScreenShake(4, 0.1);
          arrow.remove();
        }
      }
      
      // Check arrow pickup
      if (arrow.embedded) {
        for (const player of this.players) {
          if (player.dead) continue;
          if (this.collisions.checkArrowPickup(player, arrow, 16)) {
            if (player.pickupArrow()) {
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
    
    // Check for round end
    const alivePlayers = this.players.filter(p => !p.dead);
    
    if (alivePlayers.length === 1) {
      // Winner!
      alivePlayers[0].wins++;
      this.scores[alivePlayers[0].id] = alivePlayers[0].wins;
      
      if (alivePlayers[0].wins >= WINS_TO_VICTORY) {
        // Match over
        this.game.matchWinner = alivePlayers[0];
        this.game.matchScores = this.scores;
        this.game.setScene('results');
      } else {
        // Next round
        this.nextRound();
      }
    } else if (alivePlayers.length === 0) {
      // Double-KO - replay round
      this.nextRound();
    }
    
    // Update FX
    this.game.fx.update(dt);
  }

  nextRound() {
    this.round++;
    this.roundActive = false;
    this.countdown = 3.0;
    this.countdownText = '3';
    this.arrows = [];
    
    // Respawn all players
    this.players.forEach(player => {
      const spawn = this.game.world.spawns[`p${player.id}`];
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
      ctx.fillStyle = player.color;
      ctx.fillText(`P${player.id}: ${this.scores[player.id]}`, x, 5);
      x += 50;
    }
    
    // Countdown
    if (this.countdown > 0) {
      ctx.fillStyle = PALETTE.accent;
      ctx.font = 'bold 24px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.countdownText, w / 2, h / 2);
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

