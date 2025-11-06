// Results Scene
import { PALETTE, VIEW } from '../engine/constants.js';

export class ResultsScene {
  constructor(game) {
    this.game = game;
    this.selectedButton = 0;
    this.buttons = ['Play Again', 'Mode Select'];
    this.animationTime = 0;
    this.lastNavTime = 0;
    this.scoreSaved = false;
  }

  enter() {
    this.selectedButton = 0;
    this.animationTime = 0;
    this.lastNavTime = 0;
    this.scoreSaved = false;
    console.log('Results scene entered');
  }

  update(dt) {
    this.animationTime += dt;
    this.lastNavTime += dt;
  }

  exit() {
    // Cleanup
  }

  handleInput(actions, playerId) {
    if (!actions || playerId !== 1) return;

    // Navigation
    if (this.lastNavTime >= 0.2) {
      if (actions.leftPressed) {
        this.selectedButton = Math.max(0, this.selectedButton - 1);
        this.lastNavTime = 0;
      } else if (actions.rightPressed) {
        this.selectedButton = Math.min(this.buttons.length - 1, this.selectedButton + 1);
        this.lastNavTime = 0;
      }
    }

    // Select
    if (actions.jump || actions.shoot) {
      if (this.selectedButton === 0) {
        // Play Again
        if (this.game.matchPlayers) {
          // Versus mode
          this.game.setScene('versus');
        } else {
          // Survival mode
          this.game.setScene('survival');
        }
      } else if (this.selectedButton === 1) {
        // Mode Select
        this.game.setScene('modeSelect');
      }
    }
  }

  render(ctx, alpha) {
    const { w, h } = VIEW;
    
    // Background
    ctx.fillStyle = PALETTE.bg0;
    ctx.fillRect(0, 0, w, h);

    // Title
    ctx.fillStyle = PALETTE.accent;
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    if (this.game.matchWinner) {
      ctx.fillText('VICTORY!', w / 2, 40);
      ctx.fillStyle = this.game.matchWinner.color;
      ctx.font = 'bold 14px monospace';
      ctx.fillText(`Player ${this.game.matchWinner.id} Wins!`, w / 2, 60);
      
      // Save score to database
      if (this.game.matchWinner && !this.scoreSaved) {
        this.saveVersusScore(this.game.matchWinner.id, this.game.matchScores[this.game.matchWinner.id]);
        this.scoreSaved = true;
      }
      
      // Scores
      ctx.fillStyle = PALETTE.sub;
      ctx.font = '10px monospace';
      let y = 85;
      for (const [playerId, score] of Object.entries(this.game.matchScores || {})) {
        ctx.fillText(`Player ${playerId}: ${score}`, w / 2, y);
        y += 15;
      }
    } else {
      ctx.fillText('GAME OVER', w / 2, 50);
      ctx.fillStyle = PALETTE.sub;
      ctx.font = '12px monospace';
      ctx.fillText(`Wave ${this.game.matchWave || 0}`, w / 2, 70);
      
      // Save survival run to database (only once)
      if (this.game.matchWave && !this.scoreSaved) {
        this.saveSurvivalRun(this.game.matchWave);
        this.scoreSaved = true;
      }
    }

    // Buttons
    const buttonY = h - 40;
    const buttonSpacing = 60;
    
    for (let i = 0; i < this.buttons.length; i++) {
      const x = (w / 2) - (buttonSpacing / 2) + (i * buttonSpacing);
      const isSelected = i === this.selectedButton;
      
      // Selection background
      if (isSelected) {
        ctx.fillStyle = PALETTE.bg1;
        ctx.fillRect(x - 35, buttonY - 8, 70, 16);
      }
      
      // Button text
      ctx.fillStyle = isSelected ? PALETTE.accent : PALETTE.sub;
      ctx.font = isSelected ? 'bold 10px monospace' : '8px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.buttons[i], x, buttonY);
    }

    // Instructions
    ctx.fillStyle = PALETTE.sub;
    ctx.font = '8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Left/Right: Navigate | A/Cross: Select', w / 2, h - 10);
  }

  async saveSurvivalRun(wave) {
    try {
      const response = await fetch('/api/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wave: wave,
          duration_seconds: Math.floor(this.animationTime || 0)
        })
      });
      const data = await response.json();
      if (data.ok) {
        console.log('Survival run saved to database:', data);
      } else {
        console.warn('Survival run not saved (database may not be configured):', data);
      }
    } catch (error) {
      console.warn('Failed to save survival run (database may not be configured):', error);
    }
  }

  async saveVersusScore(playerId, wins) {
    try {
      const response = await fetch('/api/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'versus',
          value: wins
        })
      });
      const data = await response.json();
      if (data.ok) {
        console.log('Versus score saved to database:', data);
      } else {
        console.warn('Score not saved (database may not be configured):', data);
      }
    } catch (error) {
      console.warn('Failed to save score (database may not be configured):', error);
    }
  }
}

