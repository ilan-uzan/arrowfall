// Arena Scene - Main game loop
import { PALETTE, SCENES, GRAVITY, MOVE_ACC, MAX_SPEED, JUMP_VEL, COYOTE_MS, JUMP_BUFFER_MS, ARROW_SPEED, START_ARROWS, TILE, PLAYER_COLORS } from '../constants.js';
import { Player } from '../entities/Player.js';
import { Arrow } from '../entities/Arrow.js';
import { Level } from '../world/Level.js';

export class ArenaScene {
  constructor(game) {
    this.game = game;
    this.state = 'countdown'; // 'countdown' | 'playing' | 'roundEnd'
    this.countdown = 3;
    this.countdownTimer = 0;
    this.players = [];
    this.arrows = [];
    this.particles = [];
    this.level = null;
    this.roundWins = {};
    this.slowMoTimer = 0;
    
    // Load level
    this.loadLevel();
  }

  async loadLevel() {
    try {
      const response = await fetch('/game/world/levels.json');
      const data = await response.json();
      const levelData = data.levels[0]; // Use first level for MVP
      this.level = new Level(levelData);
    } catch (error) {
      console.error('Failed to load level:', error);
      // Create simple default level
      this.level = this.createDefaultLevel();
    }
  }

  createDefaultLevel() {
    // Simple 20x11 level as per Visual Bible
    const width = 20;
    const height = 11;
    const solids = [];
    
    // Top and bottom walls
    for (let y = 0; y < height; y++) {
      const row = [];
      for (let x = 0; x < width; x++) {
        if (y === 0 || y === height - 1) {
          row.push(true); // Walls
        } else if (y === 2 && (x < 5 || x >= width - 5)) {
          row.push(true); // Top platforms
        } else if (y === 8 && (x < 7 || x >= width - 7)) {
          row.push(true); // Bottom platforms
        } else {
          row.push(false);
        }
      }
      solids.push(row);
    }
    
    return new Level({
      name: 'Arena',
      tileSize: TILE,
      width,
      height,
      solids,
      spawns: { p1: [32, 128], p2: [288, 128], p3: [160, 48], p4: [160, 144] }
    });
  }

  enter() {
    // Setup players from character select
    if (this.game.players && this.game.players.length > 0) {
      this.players = this.game.players.map((config) => {
        const spawnKey = `p${config.id}`;
        const spawn = this.level.spawns[spawnKey] || this.level.spawns.p1 || [32, 128];
        const player = new Player(spawn[0], spawn[1], config.id, config.color, this.game);
        // Ensure player is bound to input
        if (!this.game.inputRouter.playerBindings[config.id]) {
          this.game.inputRouter.bindKeyboard(config.id);
        }
        return player;
      });
    } else {
      // Fallback - create default players and bind them
      this.players = [
        new Player(32, 128, 1, PLAYER_COLORS[0], this.game),
        new Player(288, 128, 2, PLAYER_COLORS[1], this.game)
      ];
      // Bind default players to keyboard
      this.game.inputRouter.bindKeyboard(1);
      this.game.inputRouter.bindKeyboard(2);
    }

    // Initialize round wins
    this.roundWins = {};
    this.players.forEach(p => {
      this.roundWins[p.id] = 0;
    });

    // Start countdown
    this.state = 'countdown';
    this.countdown = 3;
    this.countdownTimer = 0;
    this.arrows = [];
    this.particles = [];
  }

  exit() {
    // Cleanup
  }

  update(dt) {
    if (this.state === 'countdown') {
      this.countdownTimer += dt;
      if (this.countdownTimer >= 1.0) {
        this.countdown--;
        this.countdownTimer = 0;
        if (this.countdown <= 0) {
          this.state = 'playing';
          this.countdown = 0;
        }
      }
    } else if (this.state === 'playing') {
      this.updateGame(dt);
    } else if (this.state === 'roundEnd') {
      // Wait for scene transition
    }
  }

  updateGame(dt) {
    // Update players
    this.players.forEach(player => {
      if (!player.dead) {
        const actions = this.game.inputRouter.getActions(player.id);
        if (actions) {
          player.update(dt, this.level, actions);
        }
      }
    });

    // Update arrows
    this.arrows.forEach(arrow => {
      arrow.update(dt, this.level);
    });

    // Update particles
    this.particles.forEach(particle => {
      particle.update(dt);
    });
    this.particles = this.particles.filter(p => p.active);

    // Check collisions
    this.checkCollisions(dt);

    // Check round end
    const alivePlayers = this.players.filter(p => !p.dead);
    if (alivePlayers.length <= 1) {
      this.endRound(alivePlayers[0]);
    }
  }

  checkCollisions(dt) {
    // Arrow vs Player collisions
    for (const arrow of this.arrows) {
      if (arrow.embedded || !arrow.active) continue;
      
      for (const player of this.players) {
        if (player.dead || player.id === arrow.ownerId) continue;
        
        if (this.checkAABB(arrow.getBounds(), player.getBounds())) {
          // Hit!
          player.die();
          arrow.remove();
          this.game.triggerScreenShake();
          this.game.triggerHitFlash();
          this.game.triggerSlowMo();
          this.game.audio.playHit();
          this.createDeathParticles(player.x, player.y, player.color);
        }
      }
    }

    // Arrow vs Arrow collisions (optional)
    // Stomp collisions (falling fast on opponent)
    for (const player of this.players) {
      if (player.dead || player.vy <= 220) continue; // Not falling fast enough
      
      for (const other of this.players) {
        if (other.dead || player.id === other.id) continue;
        
        const playerFeet = { x: player.x, y: player.y + player.height - 4, width: player.width, height: 4 };
        const otherHead = { x: other.x, y: other.y, width: other.width, height: 4 };
        
        if (this.checkAABB(playerFeet, otherHead)) {
          other.die();
          player.vy = -260; // Bounce
          this.game.triggerScreenShake(8, 0.15);
          this.game.triggerHitFlash();
          this.game.audio.playHit();
          this.createDeathParticles(other.x, other.y, other.color);
        }
      }
    }

    // Arrow pickup
    for (const arrow of this.arrows) {
      if (!arrow.embedded) continue;
      
      for (const player of this.players) {
        if (player.dead) continue;
        
        const dist = Math.sqrt(
          Math.pow(player.x + player.width/2 - (arrow.x + arrow.width/2), 2) +
          Math.pow(player.y + player.height/2 - (arrow.y + arrow.height/2), 2)
        );
        
        if (dist < 16) {
          if (player.pickupArrow()) {
            arrow.remove();
            this.game.audio.playPickup();
          }
        }
      }
    }
  }

  checkAABB(rect1, rect2) {
    return (
      rect1.x < rect2.x + rect2.width &&
      rect1.x + rect1.width > rect2.x &&
      rect1.y < rect2.y + rect2.height &&
      rect1.y + rect1.height > rect2.y
    );
  }

  createDeathParticles(x, y, color) {
    for (let i = 0; i < 24; i++) {
      const angle = (Math.PI * 2 * i) / 24;
      const speed = 50 + Math.random() * 100;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        life: 0.5,
        maxLife: 0.5,
        size: 2 + Math.random() * 2,
        active: true,
        update(dt) {
          this.x += this.vx * dt;
          this.y += this.vy * dt;
          this.vy += GRAVITY * dt * 0.3; // Slower gravity
          this.life -= dt;
          if (this.life <= 0) this.active = false;
        }
      });
    }
  }

  endRound(winner) {
    if (winner) {
      this.roundWins[winner.id] = (this.roundWins[winner.id] || 0) + 1;
      
      // Check if match is over
      if (this.roundWins[winner.id] >= this.game.roundsToWin) {
        // Match complete - go to results
        this.state = 'roundEnd';
        setTimeout(() => {
          this.game.sceneManager.setScene(SCENES.RESULTS);
        }, 2000);
      } else {
        // Next round - restart
        this.state = 'roundEnd';
        setTimeout(() => {
          this.enter(); // Restart round
        }, 2000);
      }
    } else {
      // No winner (draw) - restart
      this.state = 'roundEnd';
      setTimeout(() => {
        this.enter();
      }, 2000);
    }
  }

  handleInput(actions, playerId) {
    if (this.state !== 'playing') return;
    
    const player = this.players.find(p => p.id === playerId);
    if (!player || player.dead) return;

    // Shooting handled in player.update()
    // Pause handled globally
    if (actions.pausePressed) {
      // TODO: Pause menu
    }
  }

  render(ctx) {
    const { w, h } = this.game.view;

    // Render level
    if (this.level) {
      this.level.render(ctx);
    }

    // Render arrows
    this.arrows.forEach(arrow => {
      arrow.render(ctx);
    });

    // Render players
    this.players.forEach(player => {
      player.render(ctx);
    });

    // Render particles
    this.particles.forEach(particle => {
      const alpha = particle.life / particle.maxLife;
      ctx.fillStyle = particle.color;
      ctx.globalAlpha = alpha;
      ctx.fillRect(particle.x - particle.size/2, particle.y - particle.size/2, particle.size, particle.size);
      ctx.globalAlpha = 1.0;
    });

    // Render HUD
    this.renderHUD(ctx);

    // Render countdown
    if (this.state === 'countdown') {
      ctx.fillStyle = PALETTE.accent;
      ctx.font = 'bold 32px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const text = this.countdown > 0 ? this.countdown.toString() : 'GO!';
      ctx.fillText(text, w / 2, h / 2);
    }
  }

  renderHUD(ctx) {
    const { w, h } = this.game.view;

    // Player scores (top corners)
    this.players.forEach((player, index) => {
      const x = index === 0 ? 10 : w - 100;
      const y = 10;
      
      // Wins
      ctx.fillStyle = PALETTE.ink;
      ctx.font = '12px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`P${player.id} Wins: ${this.roundWins[player.id] || 0}`, x, y);
      
      // Arrows
      ctx.fillStyle = PALETTE.sub;
      ctx.font = '10px monospace';
      ctx.fillText(`Arrows: ${player.arrows}`, x, y + 15);
      
      // Player color indicator
      ctx.fillStyle = player.color;
      ctx.fillRect(x, y + 20, 20, 4);
    });
  }
}

