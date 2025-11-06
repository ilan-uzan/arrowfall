// Character Select Scene
import { PALETTE, SCENES, PLAYER_COLORS } from '../constants.js';

export class CharacterSelectScene {
  constructor(game) {
    this.game = game;
    this.players = [];
    this.maxPlayers = 4;
    this.readyCount = 0;
  }

  enter() {
    this.players = [];
    this.readyCount = 0;
    this.minPlayers = 2;
    this.maxPlayers = 4;
    
    // Clear all bindings to start fresh
    this.game.inputRouter.playerBindings = {};
    this.game.inputRouter.lastButtonStates = {}; // Reset button states
    this.game.inputRouter.updateGamepads();
  }

  exit() {
    // Setup players for arena
    this.game.setupPlayers(this.players);
  }

  update(dt) {
    // Check for gamepad join (A/Cross button)
    const gamepadIndex = this.game.inputRouter.checkJoinButton();
    if (gamepadIndex >= 0) {
      const playerId = this.players.length + 1;
      if (playerId <= this.maxPlayers && !this.players.find(p => p.id === playerId)) {
        if (this.game.inputRouter.tryBindGamepad(playerId, gamepadIndex)) {
          this.players.push({
            id: playerId,
            color: PLAYER_COLORS[playerId - 1],
            ready: false,
            gamepadIndex
          });
          this.game.audio.playConfirm();
        }
      }
    }
    
    // Check for players leaving (if they press Start/Options while in slot)
    for (let i = this.players.length - 1; i >= 0; i--) {
      const player = this.players[i];
      const actions = this.game.inputRouter.getActions(player.id);
      if (actions && actions.pausePressed && !player.ready) {
        // Player wants to leave
        this.game.inputRouter.unbindPlayer(player.id);
        this.players.splice(i, 1);
        this.game.audio.playConfirm();
      }
    }
  }

  handleInput(actions, playerId) {
    const player = this.players.find(p => p.id === playerId);
    if (!player) return;

    if (actions.jumpPressed) {
      player.ready = !player.ready;
      this.game.audio.playConfirm();
      
      // Count ready players efficiently
      this.readyCount = 0;
      for (const p of this.players) {
        if (p.ready) this.readyCount++;
      }
      
      // Check if all players are ready and we have minimum players
      const allReady = this.players.length >= this.minPlayers && 
                       this.players.every(p => p.ready) && 
                       this.players.length === this.readyCount;
      
      if (allReady) {
        // All ready, start game - setup players first
        this.game.setupPlayers(this.players);
        setTimeout(() => {
          // Reset arena scene
          const arena = this.game.sceneManager.scenes[SCENES.ARENA];
          if (arena) {
            arena.enter();
          }
          this.game.sceneManager.setScene(SCENES.ARENA);
        }, 500);
      }
    }

    // Color cycling (future feature)
    if (actions.left || actions.right) {
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
    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('CHARACTER SELECT', w / 2, 30);

    // Instructions
    this.game.inputRouter.updateGamepads();
    const availableCount = this.game.inputRouter.gamepads.length - this.players.length;
    const connectedCount = this.game.inputRouter.gamepads.length;
    
    ctx.fillStyle = PALETTE.sub;
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`Players: ${this.players.length}/${this.maxPlayers} | Controllers: ${connectedCount}`, w / 2, 48);
    ctx.fillText('Press A/Cross to join | Press Jump when ready | Start to leave', w / 2, 60);

    // Player slots
    const slotWidth = w / 4;
    const slotHeight = 100;
    const startY = h / 2 - 50;

    for (let i = 0; i < this.maxPlayers; i++) {
      const x = i * slotWidth;
      const y = startY;
      const player = this.players.find(p => p.id === i + 1);
      
      // Slot background
      ctx.fillStyle = player ? PALETTE.bg1 : PALETTE.bg0;
      ctx.strokeStyle = player ? PALETTE.accent : PALETTE.sub;
      ctx.lineWidth = 2;
      ctx.fillRect(x + 10, y, slotWidth - 20, slotHeight);
      ctx.strokeRect(x + 10, y, slotWidth - 20, slotHeight);

      if (player) {
        // Player color
        ctx.fillStyle = player.color;
        ctx.fillRect(x + 20, y + 20, 30, 30);

        // Ready indicator
        if (player.ready) {
          ctx.fillStyle = PALETTE.accent3;
          ctx.font = '12px monospace';
          ctx.fillText('READY', x + slotWidth / 2, y + 70);
        } else {
          ctx.fillStyle = PALETTE.sub;
          ctx.font = '10px monospace';
          ctx.fillText('Press JUMP', x + slotWidth / 2, y + 70);
        }
      } else {
        ctx.fillStyle = PALETTE.sub;
        ctx.font = '10px monospace';
        ctx.fillText('Press A/×', x + slotWidth / 2, y + 50);
      }
    }

    // Status messages (optimized - use readyCount instead of filter)
    const allReady = this.players.length >= this.minPlayers && 
                     this.readyCount === this.players.length && 
                     this.players.length >= this.minPlayers;
    
    if (allReady) {
      ctx.fillStyle = PALETTE.accent;
      ctx.font = 'bold 12px monospace';
      ctx.fillText('All players ready! Press Jump to start!', w / 2, h - 30);
    } else if (this.players.length >= this.minPlayers) {
      ctx.fillStyle = PALETTE.ink;
      ctx.font = '12px monospace';
      ctx.fillText(`Waiting for all players to be ready... (${this.readyCount}/${this.players.length})`, w / 2, h - 30);
    } else {
      ctx.fillStyle = PALETTE.accent2;
      ctx.font = '12px monospace';
      ctx.fillText(`Need at least ${this.minPlayers} players (${this.players.length}/${this.minPlayers})`, w / 2, h - 30);
      if (connectedCount < this.minPlayers) {
        ctx.fillStyle = PALETTE.sub;
        ctx.font = '10px monospace';
        ctx.fillText(`Connect ${this.minPlayers - connectedCount} more controller(s)`, w / 2, h - 18);
      } else {
        ctx.fillStyle = PALETTE.sub;
        ctx.font = '10px monospace';
        ctx.fillText('Press A/Cross × on controller to join', w / 2, h - 18);
      }
    }
  }
}

