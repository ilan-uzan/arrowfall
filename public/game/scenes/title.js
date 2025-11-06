// Title Scene
import { PALETTE, VIEW } from '../engine/constants.js';

export class TitleScene {
  constructor(game) {
    this.game = game;
    this.selectedButton = 0;
    this.buttons = ['Play', 'How to Play', 'Quit'];
    this.animationTime = 0;
    this.lastNavTime = 0; // Track navigation timing
  }

  enter() {
    this.selectedButton = 0;
    this.animationTime = 0;
    this.lastNavTime = 0; // Track navigation to prevent rapid scrolling
    
    // Auto-bind first connected gamepad for menu navigation
    this.game.inputRouter.update();
    const gamepads = this.game.inputRouter.getAllGamepads();
    if (gamepads.length > 0) {
      this.game.inputRouter.playerBindings.clear();
      this.game.inputRouter.bindGamepad(1, gamepads[0].index);
      console.log(`Gamepad ${gamepads[0].index} bound to Player 1`);
    } else {
      console.log('No gamepads connected. Waiting for connection...');
    }
  }

  update(dt) {
    this.animationTime += dt;
    this.lastNavTime += dt;
    
    // Continuously check for new gamepads
    this.game.inputRouter.update();
    const gamepads = this.game.inputRouter.getAllGamepads();
    if (gamepads.length > 0 && !this.game.inputRouter.playerBindings.has(1)) {
      this.game.inputRouter.bindGamepad(1, gamepads[0].index);
      console.log(`Gamepad ${gamepads[0].index} auto-bound to Player 1`);
    }
  }

  exit() {
    // Cleanup if needed
  }

  handleInput(actions, playerId) {
    if (!actions || playerId !== 1) return;

    // Navigation with debouncing to prevent rapid scrolling (200ms cooldown)
    if (this.lastNavTime >= 0.2) {
      if (actions.upPressed || actions.leftPressed) {
        this.selectedButton = Math.max(0, this.selectedButton - 1);
        this.lastNavTime = 0;
      } else if (actions.downPressed || actions.rightPressed) {
        this.selectedButton = Math.min(this.buttons.length - 1, this.selectedButton + 1);
        this.lastNavTime = 0;
      }
    }

    // Select button
    if (actions.jump || actions.shoot) {
      if (this.selectedButton === 0) {
        // Play - go to mode select
        this.game.setScene('modeSelect').catch(err => {
          console.error('Failed to switch to modeSelect:', err);
        });
      } else if (this.selectedButton === 1) {
        // How to Play (future feature - for now just play)
        this.game.setScene('modeSelect').catch(err => {
          console.error('Failed to switch to modeSelect:', err);
        });
      } else if (this.selectedButton === 2) {
        // Quit - reload page
        window.location.reload();
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
    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ARROWFALL', w / 2, 40);

    // Controller status
    const connectedCount = this.game.inputRouter.getConnectedCount();
    ctx.fillStyle = connectedCount > 0 ? PALETTE.accent : PALETTE.accent2;
    ctx.font = '8px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`Controllers: ${connectedCount}`, w / 2, 55);
    ctx.fillText('Left Stick / D-Pad: Navigate | A/Cross: Select', w / 2, 65);
    
    if (connectedCount === 0) {
      ctx.fillStyle = PALETTE.accent2;
      ctx.font = '8px monospace';
      ctx.fillText('Press any button on controller to connect', w / 2, 75);
    }

    // Buttons
    const buttonStartY = 100;
    const buttonSpacing = 25;
    
    for (let i = 0; i < this.buttons.length; i++) {
      const x = w / 2;
      const y = buttonStartY + i * buttonSpacing;
      const isSelected = i === this.selectedButton;
      
      // Selection indicator (background)
      if (isSelected) {
        ctx.fillStyle = PALETTE.bg1;
        ctx.fillRect(x - 50, y - 10, 100, 18);
      }
      
      // Button text
      ctx.fillStyle = isSelected ? PALETTE.accent : PALETTE.sub;
      ctx.font = isSelected ? 'bold 14px monospace' : '12px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.buttons[i], x, y);
      
      // Selection arrows
      if (isSelected) {
        ctx.fillStyle = PALETTE.accent;
        // Left arrow
        ctx.fillRect(x - 45, y - 6, 3, 12);
        // Right arrow
        ctx.fillRect(x + 42, y - 6, 3, 12);
      }
    }

    // Animated background elements
    ctx.fillStyle = PALETTE.bg1;
    ctx.globalAlpha = 0.2;
    for (let i = 0; i < 5; i++) {
      const x = (w / 5) * i + Math.sin(this.animationTime + i) * 8;
      const y = 20 + Math.cos(this.animationTime * 2 + i) * 5;
      ctx.fillRect(x, y, 6, 6);
    }
    ctx.globalAlpha = 1.0;
  }
}

