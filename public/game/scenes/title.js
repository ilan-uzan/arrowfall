// Title Scene - Simplified
import { PALETTE, VIEW } from '../engine/constants.js';

export class TitleScene {
  constructor(game) {
    this.game = game;
    this.animationTime = 0;
  }

  enter() {
    this.animationTime = 0;
    
    // Auto-bind first connected gamepad for menu navigation (only if not already bound)
    this.game.inputRouter.update();
    const gamepads = this.game.inputRouter.getAllGamepads();
    if (gamepads.length > 0 && !this.game.inputRouter.playerBindings.has(1)) {
      // Only clear if we need to bind
      if (this.game.inputRouter.playerBindings.size === 0) {
        this.game.inputRouter.playerBindings.clear();
      }
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
    // Cleanup
  }

  handleInput(actions, playerId) {
    if (!actions || playerId !== 1) return;

    // Single button - just select
    if (actions.jump || actions.shoot) {
      this.game.setScene('modeSelect').catch(err => {
        console.error('Failed to switch to modeSelect:', err);
      });
    }
  }

  render(ctx, alpha) {
    const { w, h } = VIEW;
    
    // Background
    ctx.fillStyle = PALETTE.bg0;
    ctx.fillRect(0, 0, w, h);

    // Big Title
    ctx.fillStyle = PALETTE.accent;
    ctx.font = 'bold 28px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ARROWFALL', w / 2, 60);

    // Subtitle
    ctx.fillStyle = PALETTE.sub;
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('SELECT GAME MODE', w / 2, 80);

    // Single button
    const buttonY = 120;
    const x = w / 2;
    
    // Button background
    ctx.fillStyle = PALETTE.bg1;
    ctx.fillRect(x - 60, buttonY - 12, 120, 24);
    
    // Button text
    ctx.fillStyle = PALETTE.accent;
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('SELECT GAME MODE', x, buttonY);
    
    // Selection arrows
    ctx.fillStyle = PALETTE.accent;
    ctx.fillRect(x - 55, buttonY - 6, 3, 12);
    ctx.fillRect(x + 52, buttonY - 6, 3, 12);

    // Instructions
    ctx.fillStyle = PALETTE.sub;
    ctx.font = '8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('A/Cross: Select', w / 2, h - 20);
    
    const connectedCount = this.game.inputRouter.getConnectedCount();
    if (connectedCount === 0) {
      ctx.fillStyle = PALETTE.accent2;
      ctx.fillText('Press any button on controller to connect', w / 2, h - 10);
    }
  }
}

