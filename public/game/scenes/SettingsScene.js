// Settings Scene - Controller selection and controls display
import { PALETTE, SCENES } from '../constants.js';

// Import TitleScene for navigation

export class SettingsScene {
  constructor(game) {
    this.game = game;
    this.selectedButton = 0;
    this.buttons = ['Back'];
    this.selectedTab = 0;
    this.tabs = ['Controllers', 'Gamepad'];
    this.animationTime = 0;
    this.connectedGamepads = [];
  }

  enter() {
    this.selectedButton = 0;
    this.selectedTab = 0;
    this.animationTime = 0;
    // Auto-bind first gamepad for menu navigation
    this.game.inputRouter.updateGamepads();
    if (this.game.inputRouter.gamepads.length > 0 && !this.game.inputRouter.playerBindings[1]) {
      this.game.inputRouter.tryBindGamepad(1, this.game.inputRouter.gamepads[0].index);
    }
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
    this.game.inputRouter.updateGamepads();
    this.connectedGamepads = this.game.inputRouter.gamepads;
  }

  handleInput(actions, playerId) {
    if (!actions) return;

    if (actions.jumpPressed || actions.shootPressed) {
      if (this.selectedButton === 0) {
        // Back
        this.game.sceneManager.setScene(SCENES.TITLE);
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
    
    // Tab navigation with up/down
    if (actions.up) {
      if (this.selectedTab > 0) {
        this.selectedTab--;
        this.game.audio.playConfirm();
      }
    }
    if (actions.down) {
      if (this.selectedTab < this.tabs.length - 1) {
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
      // Optimized loop for controller display
      for (let index = 0; index < this.connectedGamepads.length; index++) {
        const pad = this.connectedGamepads[index];
        let playerId = null;
        
        // Find binding more efficiently
        for (const [pid, binding] of Object.entries(this.game.inputRouter.playerBindings)) {
          if (binding.type === 'gamepad' && binding.id === pad.index) {
            playerId = pid;
            break;
          }
        }
        
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
      }
      
          y += 10;
          ctx.fillStyle = PALETTE.sub;
          ctx.font = '10px monospace';
          ctx.fillText('Tip: Press A/Cross × to join as Player 2+ in Character Select', 20, y);
          y += 15;
          ctx.fillText('Requires at least 2 PS5 controllers for multiplayer', 20, y);
    }
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
      'Cross ×:     Jump',
      'Square ☐:   Shoot',
      'R2:          Shoot (Alt)',
      'Options:     Pause / Join'
    ];
    // Optimized loop
    for (let i = 0; i < gamepadControls.length; i++) {
      ctx.fillText(gamepadControls[i], 30, y);
      y += 15;
    }

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

