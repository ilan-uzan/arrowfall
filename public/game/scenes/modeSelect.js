// Mode Select Scene
import { PALETTE, VIEW } from '../engine/constants.js';

export class ModeSelectScene {
  constructor(game) {
    this.game = game;
    this.selectedButton = 0;
    this.buttons = ['Multiplayer', 'Survival Mode'];
    this.animationTime = 0;
    this.lastNavTime = 0;
  }

  enter() {
    this.selectedButton = 0;
    this.animationTime = 0;
    this.lastNavTime = 0;
    console.log('Mode Select scene entered');
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
      if (actions.upPressed || actions.leftPressed) {
        this.selectedButton = Math.max(0, this.selectedButton - 1);
        this.lastNavTime = 0;
      } else if (actions.downPressed || actions.rightPressed) {
        this.selectedButton = Math.min(this.buttons.length - 1, this.selectedButton + 1);
        this.lastNavTime = 0;
      }
    }

    // Select mode
    if (actions.jump || actions.shoot) {
      if (this.selectedButton === 0) {
        // Multiplayer mode
        this.game.setScene('lobby').catch(err => {
          console.error('Failed to switch to lobby:', err);
        });
      } else if (this.selectedButton === 1) {
        // Survival mode
        this.game.setScene('survival').catch(err => {
          console.error('Failed to switch to survival:', err);
        });
      }
    }

    // Back to title - preserve controller binding
    if (actions.pause) {
      // Don't clear bindings, just switch scene
      this.game.setScene('title');
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
    ctx.fillText('SELECT MODE', w / 2, 40);

    // Buttons
    const buttonStartY = 90;
    const buttonSpacing = 30;
    
    for (let i = 0; i < this.buttons.length; i++) {
      const x = w / 2;
      const y = buttonStartY + i * buttonSpacing;
      const isSelected = i === this.selectedButton;
      
      // Selection background
      if (isSelected) {
        ctx.fillStyle = PALETTE.bg1;
        ctx.fillRect(x - 70, y - 10, 140, 18);
      }
      
      // Button text
      ctx.fillStyle = isSelected ? PALETTE.accent : PALETTE.sub;
      ctx.font = isSelected ? 'bold 12px monospace' : '10px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.buttons[i], x, y);
      
      // Selection arrows
      if (isSelected) {
        ctx.fillStyle = PALETTE.accent;
        ctx.fillRect(x - 65, y - 6, 3, 12);
        ctx.fillRect(x + 62, y - 6, 3, 12);
      }
    }

    // Instructions
    ctx.fillStyle = PALETTE.sub;
    ctx.font = '8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Start/Options: Back', w / 2, h - 15);
  }
}

