// Title Screen Scene
import { PALETTE, SCENES } from '../constants.js';

export class TitleScene {
  constructor(game) {
    this.game = game;
    this.selectedButton = 0;
    this.buttons = ['Play', 'Survival', 'How to Play'];
    this.animationTime = 0;
  }

  enter() {
    this.selectedButton = 0;
    this.animationTime = 0;
    // Auto-bind player 1 to keyboard for menu navigation
    this.game.inputRouter.bindKeyboard(1);
  }

  exit() {
    // Cleanup if needed
  }

  update(dt) {
    this.animationTime += dt;
  }

  handleInput(actions, playerId) {
    if (!actions) return;

    if (actions.jumpPressed || actions.shootPressed) {
      if (this.selectedButton === 0) {
        // Play - go to character select for multiplayer
        this.game.sceneManager.setScene(SCENES.CHARACTER_SELECT);
      } else if (this.selectedButton === 1) {
        // Survival Mode - single player with NPCs
        this.game.mode = 'single-player';
        this.game.sceneManager.setScene(SCENES.SURVIVAL);
      } else if (this.selectedButton === 2) {
        // How to Play - show modal (TODO)
        console.log('How to Play');
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

    // Title
    ctx.fillStyle = PALETTE.accent;
    ctx.font = 'bold 24px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ARROWFALL', w / 2, h / 3);

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

    // Animated background elements (simple)
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

