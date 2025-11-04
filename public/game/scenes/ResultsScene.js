// Results Scene - Match end
import { PALETTE, SCENES } from '../constants.js';

export class ResultsScene {
  constructor(game) {
    this.game = game;
    this.winner = null;
    this.selectedButton = 0;
    this.buttons = ['Next Round', 'Restart', 'Exit'];
    this.particles = [];
    this.animationTime = 0;
  }

  enter() {
    // Find winner from arena scene
    const arena = this.game.sceneManager.scenes.arena;
    if (arena && arena.roundWins) {
      const entries = Object.entries(arena.roundWins);
      if (entries.length > 0) {
        const winnerId = entries.reduce((a, b) => {
          return (arena.roundWins[a[0]] || 0) > (arena.roundWins[b[0]] || 0) ? a : b;
        })[0];
        this.winner = parseInt(winnerId);
      } else {
        this.winner = null;
      }
    } else {
      this.winner = null;
    }
    this.selectedButton = 0;
    this.animationTime = 0;
    this.particles = [];
    
    // Create confetti particles
    this.createConfetti();
  }

  exit() {
    // Cleanup
  }

  createConfetti() {
    const { w, h } = this.game.view;
    for (let i = 0; i < 50; i++) {
      this.particles.push({
        x: w / 2,
        y: h / 2,
        vx: (Math.random() - 0.5) * 200,
        vy: (Math.random() - 0.5) * 200 - 50,
        color: i % 4 === 0 ? PALETTE.accent3 : PALETTE.accent,
        size: 3 + Math.random() * 3,
        life: 1.0,
        maxLife: 1.0,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 5
      });
    }
  }

  update(dt) {
    this.animationTime += dt;
    
    // Update particles
    this.particles.forEach(particle => {
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vy += 400 * dt; // Gravity
      particle.rotation += particle.rotationSpeed * dt;
      particle.life -= dt;
    });
    this.particles = this.particles.filter(p => p.life > 0);
  }

  handleInput(actions, playerId) {
    if (!actions) return;

    if (actions.jumpPressed || actions.shootPressed) {
      if (this.selectedButton === 0) {
        // Next Round
        this.game.sceneManager.setScene(SCENES.ARENA);
      } else if (this.selectedButton === 1) {
        // Restart - go to character select
        this.game.sceneManager.setScene(SCENES.CHARACTER_SELECT);
      } else if (this.selectedButton === 2) {
        // Exit - go to title
        this.game.sceneManager.setScene(SCENES.TITLE);
      }
      this.game.audio.playConfirm();
    }

    if (actions.left) {
      this.selectedButton = Math.max(0, this.selectedButton - 1);
      this.game.audio.playConfirm();
    }
    if (actions.right) {
      this.selectedButton = Math.min(this.buttons.length - 1, this.selectedButton + 1);
      this.game.audio.playConfirm();
    }
  }

  render(ctx) {
    const { w, h } = this.game.view;
    
    // Background
    ctx.fillStyle = PALETTE.bg0;
    ctx.fillRect(0, 0, w, h);

    // Render particles
    this.particles.forEach(particle => {
      const alpha = particle.life / particle.maxLife;
      ctx.save();
      ctx.translate(particle.x, particle.y);
      ctx.rotate(particle.rotation);
      ctx.fillStyle = particle.color;
      ctx.globalAlpha = alpha;
      ctx.fillRect(-particle.size / 2, -particle.size / 2, particle.size, particle.size);
      ctx.restore();
      ctx.globalAlpha = 1.0;
    });

    // Winner banner
    if (this.winner) {
      ctx.fillStyle = PALETTE.accent;
      ctx.font = 'bold 24px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`PLAYER ${this.winner} WINS!`, w / 2, h / 3);
    }

    // Round scores
    const arena = this.game.sceneManager.scenes.arena;
    if (arena && arena.roundWins) {
      ctx.fillStyle = PALETTE.ink;
      ctx.font = '16px monospace';
      ctx.textAlign = 'center';
      let y = h / 2;
      Object.entries(arena.roundWins).forEach(([playerId, wins]) => {
        ctx.fillText(`Player ${playerId}: ${wins} wins`, w / 2, y);
        y += 20;
      });
    } else {
      // Fallback if arena not available
      ctx.fillStyle = PALETTE.sub;
      ctx.font = '14px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('Match Complete!', w / 2, h / 2);
    }

    // Buttons
    const buttonY = h / 2 + 80;
    const buttonSpacing = 30;
    
    for (let i = 0; i < this.buttons.length; i++) {
      const x = w / 2;
      const y = buttonY + i * buttonSpacing;
      const isSelected = i === this.selectedButton;
      
      ctx.fillStyle = isSelected ? PALETTE.accent : PALETTE.sub;
      ctx.font = '14px monospace';
      ctx.fillText(this.buttons[i], x, y);
      
      if (isSelected) {
        ctx.fillStyle = PALETTE.accent;
        ctx.fillRect(x - 60, y - 8, 4, 16);
        ctx.fillRect(x + 56, y - 8, 4, 16);
      }
    }
  }
}

