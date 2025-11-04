// Settings Scene - Controller selection and controls display
import { PALETTE, SCENES } from '../constants.js';

// Import TitleScene for navigation

export class SettingsScene {
  constructor(game) {
    this.game = game;
    this.selectedButton = 0;
    this.buttons = ['Back', 'Controls Help'];
    this.selectedTab = 0;
    this.tabs = ['Controllers', 'Keyboard', 'Gamepad'];
    this.animationTime = 0;
    this.gamepads = [];
    this.connectedGamepads = [];
  }

  enter() {
    this.selectedButton = 0;
    this.selectedTab = 0;
    this.animationTime = 0;
    // Auto-bind player 1 to keyboard for menu navigation
    this.game.inputRouter.bindKeyboard(1);
    this.updateGamepads();
  }

  exit() {
    // Cleanup
  }

  update(dt) {
    this.animationTime += dt;
    this.updateGamepads();
  }

  updateGamepads() {
    const pads = navigator.getGamepads();
    this.connectedGamepads = Array.from(pads).filter(p => p !== null);
  }

  handleInput(actions, playerId) {
    if (!actions) return;

    if (actions.jumpPressed || actions.shootPressed) {
      if (this.selectedButton === 0) {
        // Back
        this.game.sceneManager.setScene(SCENES.TITLE);
        this.game.audio.playConfirm();
      } else if (this.selectedButton === 1) {
        // Controls help is shown in tabs
        this.game.audio.playConfirm();
      }
    }

    if (actions.left) {
      if (this.selectedTab > 0) {
        this.selectedTab--;
        this.game.audio.playConfirm();
      }
    }
    if (actions.right) {
      if (this.selectedTab < this.tabs.length - 1) {
        this.selectedTab++;
        this.game.audio.playConfirm();
      }
    }
    
    // Tab navigation with up/down (only if not on button)
    if (actions.up) {
      if (this.selectedButton > 0) {
        this.selectedButton--;
        this.game.audio.playConfirm();
      } else if (this.selectedTab > 0) {
        this.selectedTab--;
        this.game.audio.playConfirm();
      }
    }
    if (actions.down) {
      if (this.selectedButton < this.buttons.length - 1) {
        this.selectedButton++;
        this.game.audio.playConfirm();
      } else if (this.selectedTab < this.tabs.length - 1) {
        this.selectedTab++;
        this.game.audio.playConfirm();
      }
    }
  }

  render(ctx) {
    const { w, h } = this.game.view;
    
    // Background
    ctx.fillStyle = PALETTE.bg0;
    ctx.fillRect(0, 0, w, h);

    // Title
    ctx.fillStyle = PALETTE.accent;
    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('SETTINGS', w / 2, 30);

    // Tabs
    const tabY = 50;
    const tabSpacing = 80;
    for (let i = 0; i < this.tabs.length; i++) {
      const x = w / 2 - (this.tabs.length - 1) * tabSpacing / 2 + i * tabSpacing;
      const isSelected = i === this.selectedTab;
      
      ctx.fillStyle = isSelected ? PALETTE.accent : PALETTE.sub;
      ctx.font = '12px monospace';
      ctx.fillText(this.tabs[i], x, tabY);
      
      if (isSelected) {
        ctx.fillStyle = PALETTE.accent;
        ctx.fillRect(x - 20, tabY + 5, 40, 2);
      }
    }

    // Content area
    const contentY = 80;
    ctx.fillStyle = PALETTE.bg1;
    ctx.fillRect(10, contentY, w - 20, h - contentY - 50);

    // Render tab content
    if (this.selectedTab === 0) {
      this.renderControllers(ctx, w, h, contentY);
    } else if (this.selectedTab === 1) {
      this.renderKeyboard(ctx, w, h, contentY);
    } else if (this.selectedTab === 2) {
      this.renderGamepad(ctx, w, h, contentY);
    }

    // Back button
    const buttonY = h - 30;
    ctx.fillStyle = this.selectedButton === 0 ? PALETTE.accent : PALETTE.sub;
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('← Back', w / 2, buttonY);
    
    if (this.selectedButton === 0) {
      ctx.fillStyle = PALETTE.accent;
      ctx.fillRect(w / 2 - 35, buttonY - 8, 4, 16);
      ctx.fillRect(w / 2 + 31, buttonY - 8, 4, 16);
    }
  }

  renderControllers(ctx, w, h, startY) {
    ctx.fillStyle = PALETTE.ink;
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    let y = startY + 15;
    ctx.fillText('CONNECTED CONTROLLERS:', 20, y);
    y += 20;

    if (this.connectedGamepads.length === 0) {
      ctx.fillStyle = PALETTE.sub;
      ctx.font = '11px monospace';
      ctx.fillText('No controllers detected', 20, y);
      y += 15;
      ctx.fillText('• Connect PS5/Xbox/3rd party Bluetooth controller', 20, y);
      y += 15;
      ctx.fillText('• Press any button on controller', 20, y);
      y += 15;
      ctx.fillText('• Press A/Cross to join as Player 2+', 20, y);
    } else {
      ctx.font = '11px monospace';
      this.connectedGamepads.forEach((pad, index) => {
        const binding = Object.values(this.game.inputRouter.playerBindings)
          .find(b => b.type === 'gamepad' && b.id === pad.index);
        const playerId = binding ? Object.keys(this.game.inputRouter.playerBindings)
          .find(id => this.game.inputRouter.playerBindings[id] === binding) : null;
        
        ctx.fillStyle = PALETTE.ink;
        // Shorten controller name if too long
        const padName = pad.id.length > 25 ? pad.id.substring(0, 22) + '...' : pad.id;
        ctx.fillText(`${index + 1}. ${padName}`, 20, y);
        if (playerId) {
          ctx.fillStyle = PALETTE.accent;
          ctx.font = 'bold 11px monospace';
          ctx.fillText(`→ P${playerId}`, 180, y);
        } else {
          ctx.fillStyle = PALETTE.sub;
          ctx.font = '11px monospace';
          ctx.fillText(`→ Not assigned`, 180, y);
        }
        y += 18;
      });
      
      y += 10;
      ctx.fillStyle = PALETTE.sub;
      ctx.font = '10px monospace';
      ctx.fillText('Tip: Press A/Cross to join as Player 2+ in Character Select', 20, y);
    }
  }

  renderKeyboard(ctx, w, h, startY) {
    ctx.fillStyle = PALETTE.ink;
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    let y = startY + 15;
    
    // Player 1 Controls
    ctx.fillStyle = PALETTE.accent;
    ctx.font = 'bold 12px monospace';
    ctx.fillText('PLAYER 1:', 20, y);
    y += 18;

    ctx.fillStyle = PALETTE.ink;
    ctx.font = '11px monospace';
    const p1Controls = [
      'Move Left:  A or ←',
      'Move Right: D or →',
      'Jump:       W or Space',
      'Shoot:      S or F'
    ];
    p1Controls.forEach(control => {
      ctx.fillText(control, 30, y);
      y += 15;
    });

    y += 12;
    ctx.fillStyle = PALETTE.accent;
    ctx.font = 'bold 12px monospace';
    ctx.fillText('PLAYER 2 (Fallback):', 20, y);
    y += 18;

    ctx.fillStyle = PALETTE.ink;
    ctx.font = '11px monospace';
    const p2Controls = [
      'Move Left:  ←',
      'Move Right: →',
      'Jump:       ↑',
      'Shoot:      ↓'
    ];
    p2Controls.forEach(control => {
      ctx.fillText(control, 30, y);
      y += 15;
    });
  }

  renderGamepad(ctx, w, h, startY) {
    ctx.fillStyle = PALETTE.ink;
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    let y = startY + 15;
    
    ctx.fillStyle = PALETTE.accent;
    ctx.font = 'bold 12px monospace';
    ctx.fillText('GAMEPAD CONTROLS:', 20, y);
    y += 18;

    ctx.fillStyle = PALETTE.ink;
    ctx.font = '11px monospace';
    const gamepadControls = [
      'Left Stick:  Move',
      'A / Cross ×: Jump',
      'X / Square ☐: Shoot',
      'R2 / RT:     Shoot (Alt)',
      'Start/Options: Pause / Join'
    ];
    gamepadControls.forEach(control => {
      ctx.fillText(control, 30, y);
      y += 15;
    });

    y += 12;
    ctx.fillStyle = PALETTE.sub;
    ctx.font = '10px monospace';
    ctx.fillText('✓ PS5 DualSense', 20, y);
    y += 12;
    ctx.fillText('✓ Xbox Controller', 20, y);
    y += 12;
    ctx.fillText('✓ 3rd Party Bluetooth', 20, y);
  }
}

