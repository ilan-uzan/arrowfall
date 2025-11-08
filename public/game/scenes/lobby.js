// Lobby Scene - Join Controllers for Versus Mode
import { PALETTE, VIEW, PLAYER_COLORS } from '../engine/constants.js';
import { Player } from '../engine/entities/player.js';
import { World } from '../engine/world.js';

export class LobbyScene {
  constructor(game) {
    this.game = game;
    this.players = [];
    this.readyCount = 0;
    this.animationTime = 0;
    this.lastNavTime = 0;
  }

  enter() {
    this.players = [];
    this.readyCount = 0;
    this.animationTime = 0;
    this.lastNavTime = 0;
    console.log('Lobby scene entered');
    
    // Ensure input router is updated
    if (this.game.inputRouter) {
      this.game.inputRouter.update();
    }
    
    // Auto-bind first connected gamepad if not already bound
    const gamepads = this.game.inputRouter.getAllGamepads();
    if (gamepads.length > 0 && !this.game.inputRouter.playerBindings.has(1)) {
      this.game.inputRouter.bindGamepad(1, gamepads[0].index);
    }
  }

  update(dt) {
    this.animationTime += dt;
    this.lastNavTime += dt;
    
    // Check for new gamepad presses (join button)
    // Note: inputRouter.update() is called in main game loop
    const joinGamepadIndex = this.game.inputRouter.checkJoinButton();
    
    if (joinGamepadIndex >= 0 && this.players.length < 4) {
      // Find next available player slot
      const playerId = this.players.length + 1;
      this.game.inputRouter.bindGamepad(playerId, joinGamepadIndex);
      
      // Create player
      const spawn = this.game.world.spawns[`p${playerId}`];
      const player = new Player(
        spawn.x, 
        spawn.y, 
        playerId, 
        PLAYER_COLORS[playerId - 1], 
        this.game.physics
      );
      player.ready = false;
      this.players.push(player);
      console.log(`Player ${playerId} joined`);
    }
    
    // Check for ready/start (all players press A/Cross)
    // Use single-frame button press detection to prevent multiple triggers
    for (let i = 1; i <= this.players.length; i++) {
      const actions = this.game.inputRouter.getActions(i);
      if (actions && actions.jumpPressed) {
        const player = this.players[i - 1];
        if (player && !player.ready) {
          player.ready = true;
          this.readyCount++;
          console.log(`Player ${i} ready`);
        }
      }
    }
    
    // Start game if at least 2 players ready
    if (this.readyCount >= 2 && this.players.length >= 2) {
      // Store players for versus scene
      this.game.matchPlayers = this.players;
      this.game.setScene('versus');
    }
  }

  exit() {
    // Cleanup
  }

  handleInput(actions, playerId) {
    if (!actions) return;
    
    // Back to mode select - only player 1 can go back
    if (actions.pause && playerId === 1) {
      // Don't unbind players - just go back to mode select
      // This preserves controller bindings if user wants to return
      this.game.setScene('modeSelect');
    }
  }

  render(ctx, alpha) {
    const { w, h } = VIEW;
    
    // Background
    ctx.fillStyle = PALETTE.bg0;
    ctx.fillRect(0, 0, w, h);

    // Title
    ctx.fillStyle = PALETTE.accent;
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('MULTIPLAYER LOBBY', w / 2, 30);
    ctx.fillStyle = PALETTE.sub;
    ctx.font = '10px monospace';
    ctx.fillText('Press A/× to Join', w / 2, 45);

    // Player slots
    const slotY = 60;
    const slotSpacing = 25;
    
    for (let i = 0; i < 4; i++) {
      const y = slotY + i * slotSpacing;
      const player = this.players[i];
      
      if (player) {
        // Player slot filled
        ctx.fillStyle = player.color;
        ctx.font = '10px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`Player ${i + 1}`, 20, y);
        
        if (player.ready) {
          ctx.fillStyle = PALETTE.accent;
          ctx.textAlign = 'right';
          ctx.fillText('READY', w - 20, y);
        } else {
          ctx.fillStyle = PALETTE.sub;
          ctx.textAlign = 'right';
          ctx.fillText('Press A/× to Ready', w - 20, y);
        }
      } else {
        // Empty slot
        ctx.fillStyle = PALETTE.sub;
        ctx.font = '8px monospace';
        ctx.textAlign = 'left';
        ctx.globalAlpha = 0.5;
        ctx.fillText(`Player ${i + 1} - Press A/×`, 20, y);
        ctx.globalAlpha = 1.0;
      }
    }

    // Instructions
    ctx.fillStyle = PALETTE.sub;
    ctx.font = '8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`Players: ${this.players.length}/4 | Ready: ${this.readyCount}/${Math.max(2, this.players.length)}`, w / 2, h - 30);
    ctx.fillText('Need at least 2 players to start | Start/Options: Back', w / 2, h - 15);
  }
}

