// Survival Scene - Single-player mode with NPCs
import { PALETTE, SCENES, GRAVITY, TILE, PLAYER_COLORS } from '../constants.js';
import { Player } from '../entities/Player.js';
import { Arrow } from '../entities/Arrow.js';
import { NPC } from '../entities/NPC.js';
import { Level } from '../world/Level.js';

export class SurvivalScene {
  constructor(game) {
    this.game = game;
    this.state = 'countdown';
    this.countdown = 3;
    this.countdownTimer = 0;
    this.player = null;
    this.npcs = [];
    this.arrows = [];
    this.particles = [];
    this.level = null;
    this.wave = 1;
    this.waveTimer = 0;
    this.lives = 3;
    this.score = 0;
    this.startTime = 0;
    
    this.loadLevel();
  }

  async loadLevel() {
    try {
      const response = await fetch('/game/world/levels.json');
      const data = await response.json();
      const levelData = data.levels[0];
      this.level = new Level(levelData);
    } catch (error) {
      console.error('Failed to load level:', error);
      this.level = this.createDefaultLevel();
    }
  }

  createDefaultLevel() {
    const width = 20;
    const height = 11;
    const solids = [];
    
    for (let y = 0; y < height; y++) {
      const row = [];
      for (let x = 0; x < width; x++) {
        if (y === 0 || y === height - 1) {
          row.push(true);
        } else if (y === 2 && (x < 5 || x >= width - 5)) {
          row.push(true);
        } else if (y === 8 && (x < 7 || x >= width - 7)) {
          row.push(true);
        } else {
          row.push(false);
        }
      }
      solids.push(row);
    }
    
    return new Level({
      name: 'Survival Arena',
      tileSize: TILE,
      width,
      height,
      solids,
      spawns: { p1: [160, 128], npc1: [32, 128], npc2: [288, 128] }
    });
  }

  enter() {
    // Auto-bind player 1 to keyboard for survival mode
    this.game.inputRouter.bindKeyboard(1);
    
    // Setup player
    const spawn = this.level.spawns.p1 || [160, 128];
    this.player = new Player(spawn[0], spawn[1], 1, PLAYER_COLORS[0], this.game);
    this.player.arrows = 5;
    
    // Spawn initial NPCs
    this.spawnWave();
    
    // Start countdown
    this.state = 'countdown';
    this.countdown = 3;
    this.countdownTimer = 0;
    this.arrows = [];
    this.particles = [];
    this.wave = 1;
    this.waveTimer = 0;
    this.lives = 3;
    this.score = 0;
    this.startTime = Date.now();
    this.playerShootHeld = false;
  }

  exit() {
    // Cleanup
  }

  spawnWave() {
    // Spawn NPCs for current wave
    const npcCount = Math.min(1 + this.wave, 4); // Max 4 NPCs
    
    this.npcs = [];
    for (let i = 0; i < npcCount; i++) {
      const spawnKey = `npc${i + 1}`;
      const spawn = this.level.spawns[spawnKey] || [
        32 + (i * 80),
        128
      ];
      const npc = new NPC(spawn[0], spawn[1], 100 + i, PLAYER_COLORS[(i + 1) % 4], this.game);
      this.npcs.push(npc);
    }
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
    } else if (this.state === 'gameOver') {
      // Wait for scene transition
    }
  }

  updateGame(dt) {
    this.waveTimer += dt;
    
    // Spawn new wave every 20 seconds
    if (this.waveTimer >= 20.0 && this.npcs.length === 0) {
      this.wave++;
      this.waveTimer = 0;
      this.spawnWave();
    }

    // Update player
    if (!this.player.dead) {
      const actions = this.game.inputRouter.getActions(1);
      if (actions) {
        this.player.update(dt, this.level, actions);
      }
    }

    // Update NPCs
    this.npcs.forEach(npc => {
      if (!npc.dead) {
        npc.update(dt, this.level, this.player);
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

    // Check game over
    if (this.player.dead) {
      this.lives--;
      if (this.lives <= 0) {
        this.endGame();
      } else {
        // Respawn
        setTimeout(() => {
          this.player.respawn(this.level.spawns.p1[0], this.level.spawns.p1[1]);
        }, 2000);
      }
    }

    // Check wave complete
    const aliveNPCs = this.npcs.filter(n => !n.dead);
    if (aliveNPCs.length === 0 && this.waveTimer < 20.0) {
      // Wave complete - spawn next wave
      this.wave++;
      this.score += 100 * this.wave;
      this.waveTimer = 0;
      setTimeout(() => {
        this.spawnWave();
      }, 2000);
    }
  }

  checkCollisions(dt) {
    // Arrow vs Player collisions
    for (let i = this.arrows.length - 1; i >= 0; i--) {
      const arrow = this.arrows[i];
      if (arrow.embedded || arrow.ownerId === 1) continue;
      
      if (!this.player.dead && this.checkAABB(arrow.getBounds(), this.player.getBounds())) {
        this.player.die();
        this.arrows.splice(i, 1);
        this.game.triggerScreenShake();
        this.game.triggerHitFlash();
        this.game.triggerSlowMo();
        this.game.audio.playHit();
        this.createDeathParticles(this.player.x, this.player.y, this.player.color);
      }
    }

    // Player arrows vs NPCs
    for (let i = this.arrows.length - 1; i >= 0; i--) {
      const arrow = this.arrows[i];
      if (arrow.embedded || arrow.ownerId !== 1) continue;
      
      for (const npc of this.npcs) {
        if (npc.dead) continue;
        
        if (this.checkAABB(arrow.getBounds(), npc.getBounds())) {
          npc.die();
          this.arrows.splice(i, 1);
          this.score += 50;
          this.game.triggerScreenShake();
          this.game.audio.playHit();
          this.createDeathParticles(npc.x, npc.y, npc.color);
          break;
        }
      }
    }

    // Arrow pickup
    for (let i = this.arrows.length - 1; i >= 0; i--) {
      const arrow = this.arrows[i];
      if (!arrow.embedded) continue;
      
      if (!this.player.dead) {
        const dist = Math.sqrt(
          Math.pow(this.player.x + this.player.width/2 - (arrow.x + arrow.width/2), 2) +
          Math.pow(this.player.y + this.player.height/2 - (arrow.y + arrow.height/2), 2)
        );
        if (dist < 16) {
          if (this.player.pickupArrow()) {
            this.arrows.splice(i, 1);
            this.game.audio.playPickup();
          }
        }
      }
      
      // NPC arrow pickup (handled in NPC behavior)
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
          this.vy += GRAVITY * dt * 0.3;
          this.life -= dt;
          if (this.life <= 0) this.active = false;
        }
      });
    }
  }

  endGame() {
    this.state = 'gameOver';
    const duration = Math.floor((Date.now() - this.startTime) / 1000);
    
    // Save score (optional - can be done later)
    setTimeout(() => {
      // Return to title or show results
      this.game.sceneManager.setScene(SCENES.TITLE);
    }, 3000);
  }

  handleInput(actions, playerId) {
    if (this.state !== 'playing') return;
    // Player input handled in updateGame
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

    // Render NPCs
    this.npcs.forEach(npc => {
      npc.render(ctx);
    });

    // Render player
    if (this.player) {
      this.player.render(ctx);
    }

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
      const scale = this.countdown > 0 ? 1.0 + Math.sin(this.animationTime * 10) * 0.1 : 1.2;
      ctx.save();
      ctx.translate(w / 2, h / 2);
      ctx.scale(scale, scale);
      ctx.translate(-w / 2, -h / 2);
      
      ctx.fillStyle = PALETTE.accent;
      ctx.font = 'bold 32px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const text = this.countdown > 0 ? this.countdown.toString() : 'GO!';
      ctx.fillText(text, w / 2, h / 2);
      ctx.restore();
    }

    // Render game over
    if (this.state === 'gameOver') {
      ctx.fillStyle = PALETTE.accent2;
      ctx.font = 'bold 24px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('GAME OVER', w / 2, h / 2);
      ctx.fillStyle = PALETTE.ink;
      ctx.font = '16px monospace';
      ctx.fillText(`Wave: ${this.wave} | Score: ${this.score}`, w / 2, h / 2 + 30);
    }
  }

  renderHUD(ctx) {
    const { w, h } = this.game.view;

    // Top left: Wave, Score
    ctx.fillStyle = PALETTE.ink;
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`WAVE ${this.wave}`, 10, 18);
    ctx.font = '11px monospace';
    ctx.fillStyle = PALETTE.sub;
    ctx.fillText(`Score: ${this.score}`, 10, 32);

    // Top right: Lives, Arrows
    ctx.textAlign = 'right';
    ctx.font = 'bold 12px monospace';
    ctx.fillStyle = PALETTE.ink;
    ctx.fillText(`LIVES: ${this.lives}`, w - 10, 18);
    ctx.font = '11px monospace';
    ctx.fillStyle = PALETTE.sub;
    if (this.player) {
      ctx.fillText(`Arrows: ${this.player.arrows}`, w - 10, 32);
    }

    // NPC count (center)
    const aliveNPCs = this.npcs.filter(n => !n.dead).length;
    ctx.textAlign = 'center';
    ctx.font = '10px monospace';
    ctx.fillStyle = aliveNPCs > 0 ? PALETTE.accent2 : PALETTE.accent;
    ctx.fillText(`${aliveNPCs} NPCs`, w / 2, 18);

    // Controls hint (bottom)
    if (this.state === 'playing' && this.player && !this.player.dead) {
      ctx.fillStyle = PALETTE.sub;
      ctx.font = '9px monospace';
      ctx.textAlign = 'center';
      ctx.globalAlpha = 0.6;
      ctx.fillText('A/D: Move | W/Space: Jump | S/F: Shoot', w / 2, h - 10);
      ctx.globalAlpha = 1.0;
    }
  }
}

