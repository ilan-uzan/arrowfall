// Title Scene
import { PALETTE, VIEW } from '../engine/constants.js';

export class TitleScene {
  constructor(game) {
    this.game = game;
    this.selectedButton = 0;
    this.buttons = ['Play', 'How to Play', 'Quit'];
    this.animationTime = 0;
  }

  enter() {
    this.selectedButton = 0;
    this.animationTime = 0;
    // Auto-bind first connected gamepad for menu navigation
    this.game.inputRouter.update();
    const gamepads = this.game.inputRouter.getAllGamepads();
    if (gamepads.length > 0) {
      this.game.inputRouter.playerBindings.clear();
      this.game.inputRouter.bindGamepad(1, gamepads[0].index);
    }
  }

  update(dt) {
    this.animationTime += dt;
    // Continuously check for new gamepads
    this.game.inputRouter.update();
    const gamepads = this.game.inputRouter.getAllGamepads();
    if (gamepads.length > 0 && !this.game.inputRouter.playerBindings.has(1)) {
      this.game.inputRouter.bindGamepad(1, gamepads[0].index);
    }
  }

  exit() {
    // Cleanup if needed
  }

  handleInput(actions, playerId) {
    if (!actions || playerId !== 1) return;

    if (actions.jump || actions.shoot) {
      if (this.selectedButton === 0) {
        // Play - go to mode select
        this.game.setScene('modeSelect');
      } else if (this.selectedButton === 1) {
        // How to Play (future feature - for now just play)
        this.game.setScene('modeSelect');
      } else if (this.selectedButton === 2) {
        // Quit - reload page
        window.location.reload();
      }
    }

    if (actions.left || actions.up) {
      this.selectedButton = Math.max(0, this.selectedButton - 1);
    }
    if (actions.right || actions.down) {
      this.selectedButton = Math.min(this.buttons.length - 1, this.selectedButton + 1);
    }
  }

  render(ctx, alpha) {
    const { w, h } = VIEW;
    
    // Background
    ctx.fillStyle = PALETTE.bg0;
    ctx.fillRect(0, 0, w, h);

    // Title
    ctx.fillStyle = PALETTE.accent;
    ctx.font = 'bold 24px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ARROWFALL', w / 2, h / 3 - 20);

    // Controller status
    const connectedCount = this.game.inputRouter.getConnectedCount();
    ctx.fillStyle = connectedCount > 0 ? PALETTE.accent : PALETTE.accent2;
    ctx.font = '10px monospace';
    ctx.fillText(`Controllers: ${connectedCount} | Left Stick / D-Pad: Navigate | A/Cross: Select`, w / 2, h / 3 + 10);
    
    if (connectedCount === 0) {
      ctx.fillStyle = PALETTE.accent2;
      ctx.font = '10px monospace';
      ctx.fillText('Press any button on controller to connect', w / 2, h / 3 + 22);
    }

    // Buttons
    const buttonY = h / 2;
    const buttonSpacing = 30;
    
    for (let i = 0; i < this.buttons.length; i++) {
      const x = w / 2;
      const y = buttonY + i * buttonSpacing;
      const isSelected = i === this.selectedButton;
      
      ctx.fillStyle = isSelected ? PALETTE.accent : PALETTE.sub;
      ctx.font = '16px monospace';
      ctx.fillText(this.buttons[i], x, y);
      
      if (isSelected) {
        ctx.fillStyle = PALETTE.accent;
        ctx.fillRect(x - 60, y - 8, 4, 16);
        ctx.fillRect(x + 56, y - 8, 4, 16);
      }
    }

    // Animated background elements
    ctx.fillStyle = PALETTE.bg1;
    ctx.globalAlpha = 0.3;
    for (let i = 0; i < 5; i++) {
      const x = (w / 5) * i + Math.sin(this.animationTime + i) * 10;
      const y = h / 4 + Math.cos(this.animationTime * 2 + i) * 5;
      ctx.fillRect(x, y, 8, 8);
    }
    ctx.globalAlpha = 1.0;
  }
}

