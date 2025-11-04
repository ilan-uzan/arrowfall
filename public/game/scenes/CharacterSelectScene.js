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
  }

  exit() {
    // Setup players for arena
    this.game.setupPlayers(this.players);
  }

  update(dt) {
    // Check for gamepad join
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

    // Auto-bind keyboard players
    if (this.players.length < 2) {
      for (let i = 1; i <= 2; i++) {
        if (!this.players.find(p => p.id === i)) {
          this.game.inputRouter.bindKeyboard(i);
          this.players.push({
            id: i,
            color: PLAYER_COLORS[i - 1],
            ready: false
          });
        }
      }
    }
  }

  handleInput(actions, playerId) {
    const player = this.players.find(p => p.id === playerId);
    if (!player) return;

    if (actions.jumpPressed) {
      player.ready = !player.ready;
      this.game.audio.playConfirm();
      
      this.readyCount = this.players.filter(p => p.ready).length;
      if (this.readyCount >= 2 && this.readyCount === this.players.length) {
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

    if (actions.left || actions.right) {
      // Cycle color (TODO: implement color selection)
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
    ctx.fillStyle = PALETTE.sub;
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Press A/Cross on gamepad to join | Press Jump when ready', w / 2, 50);

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

    // Instructions
    if (this.players.length >= 2) {
      ctx.fillStyle = PALETTE.ink;
      ctx.font = '12px monospace';
      ctx.fillText('All players ready to start!', w / 2, h - 20);
    } else {
      ctx.fillStyle = PALETTE.sub;
      ctx.font = '10px monospace';
      ctx.fillText('Need at least 2 players', w / 2, h - 20);
    }
  }
}

