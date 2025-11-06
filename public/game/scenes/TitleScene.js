// Title Screen Scene
import { PALETTE, SCENES } from '../constants.js';

export class TitleScene {
  constructor(game) {
    this.game = game;
    this.selectedButton = 0;
    this.buttons = ['Play', 'Survival', 'Settings'];
    this.animationTime = 0;
  }

  enter() {
    this.selectedButton = 0;
    this.animationTime = 0;
    // Auto-bind first connected gamepad for menu navigation
    this.game.inputRouter.updateGamepads();
    if (this.game.inputRouter.gamepads.length > 0) {
      // Clear any existing bindings first
      this.game.inputRouter.playerBindings = {};
      this.game.inputRouter.tryBindGamepad(1, this.game.inputRouter.gamepads[0].index);
    }
  }
  
  update(dt) {
    this.animationTime += dt;
    // Continuously check for new gamepads
    this.game.inputRouter.updateGamepads();
    // Auto-bind first gamepad if not bound
    if (this.game.inputRouter.gamepads.length > 0 && !this.game.inputRouter.playerBindings[1]) {
      this.game.inputRouter.tryBindGamepad(1, this.game.inputRouter.gamepads[0].index);
    }
  }


  handleInput(actions, playerId) {
    if (!actions) return;
    
    // Check controller connection for Play button
    if (this.selectedButton === 0 && (actions.jumpPressed || actions.shootPressed)) {
      this.game.inputRouter.updateGamepads();
      if (this.game.inputRouter.gamepads.length < 2) {
        // Not enough controllers - show error (handled in render)
        this.game.audio.playConfirm(); // Play error sound
        return;
      }
    }

    if (actions.jumpPressed || actions.shootPressed) {
      if (this.selectedButton === 0) {
        // Play - go to character select for multiplayer
        this.game.sceneManager.setScene(SCENES.CHARACTER_SELECT);
      } else if (this.selectedButton === 1) {
        // Survival Mode - single player with NPCs
        this.game.inputRouter.updateGamepads();
        if (this.game.inputRouter.gamepads.length < 1) {
          // Not enough controllers
          this.game.audio.playConfirm();
          return;
        }
        this.game.mode = 'single-player';
        this.game.sceneManager.setScene(SCENES.SURVIVAL);
      } else if (this.selectedButton === 2) {
        // Settings
        this.game.sceneManager.setScene(SCENES.SETTINGS);
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
    if (actions.up) {
      this.selectedButton = Math.max(0, this.selectedButton - 1);
      this.game.audio.playConfirm();
    }
    if (actions.down) {
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
    ctx.fillText('ARROWFALL', w / 2, h / 3 - 20);

    // Check controller status
    this.game.inputRouter.updateGamepads();
    const connectedCount = this.game.inputRouter.gamepads.length;
    const gamepads = this.game.inputRouter.gamepads;
    
    // Subtitle with controller count
    ctx.fillStyle = connectedCount > 0 ? PALETTE.accent : PALETTE.accent2;
    ctx.font = '10px monospace';
    ctx.fillText(`Controllers: ${connectedCount} | Left Stick / D-Pad: Navigate | A/Cross: Select`, w / 2, h / 3 + 10);
    
    if (connectedCount === 0) {
      ctx.fillStyle = PALETTE.accent2;
      ctx.font = '10px monospace';
      ctx.fillText('Press any button on controller to connect', w / 2, h / 3 + 22);
      ctx.fillText('(Some browsers require user interaction)', w / 2, h / 3 + 34);
    } else {
      // Show controller info
      gamepads.forEach((pad, i) => {
        const binding = Object.values(this.game.inputRouter.playerBindings)
          .find(b => b.type === 'gamepad' && b.id === pad.index);
        const boundTo = binding ? `P${Object.keys(this.game.inputRouter.playerBindings).find(id => this.game.inputRouter.playerBindings[id] === binding)}` : 'Unbound';
        
        ctx.fillStyle = PALETTE.sub;
        ctx.font = '9px monospace';
        const padName = pad.id.length > 20 ? pad.id.substring(0, 17) + '...' : pad.id;
        ctx.fillText(`${i + 1}. ${padName} → ${boundTo}`, w / 2, h / 3 + 22 + (i * 12));
        
        // Show button test
        if (pad.buttons[0]?.pressed) {
          ctx.fillStyle = PALETTE.accent;
          ctx.fillText('Button 0 (A/Cross) pressed!', w / 2, h / 3 + 22 + (connectedCount * 12) + 12);
        }
      });
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

