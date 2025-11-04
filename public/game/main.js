// Main game loop and state management
import { Player } from './entities/player.js';
import { Arrow } from './entities/arrow.js';
import { Level } from './world/level.js';
import { GamepadManager } from './gamepad.js';
import { InputManager } from './input.js';
import { UIManager } from './ui.js';

// Game states
const STATE_READY = 'READY';
const STATE_PLAY = 'PLAY';
const STATE_SCORED = 'SCORED';
const STATE_RESULTS = 'RESULTS';

class Game {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;

    // Game systems
    this.gamepadManager = new GamepadManager();
    this.inputManager = new InputManager(this.gamepadManager);
    this.ui = new UIManager();

    // Game state
    this.state = STATE_READY;
    this.stateTimer = 0;
    this.currentRound = 0;
    this.roundsToWin = 5;
    this.player1 = null;
    this.player2 = null;
    this.arrows = [];
    this.level = null;
    this.levels = [];
    this.currentLevelIndex = 0;
    this.screenShake = { x: 0, y: 0, duration: 0 };
    this.hitPause = 0;
    this.p1ShootHeld = false;
    this.p2ShootHeld = false;

    // Load levels
    this.loadLevels();

    // Setup UI listeners
    this.setupUIListeners();

    // Start game loop
    this.lastTime = performance.now();
    this.requestAnimationFrame(this.gameLoop.bind(this));
  }

  async loadLevels() {
    try {
      const response = await fetch('/game/world/levels.json');
      const data = await response.json();
      this.levels = data.levels.map(levelData => new Level(levelData));
      this.startNewMatch();
    } catch (error) {
      console.error('Failed to load levels:', error);
    }
  }

  startNewMatch() {
    this.currentRound = 0;
    this.player1 = new Player(0, 0, 1, '#7dd3fc');
    this.player2 = new Player(0, 0, 2, '#f472b6');
    this.player1.wins = 0;
    this.player2.wins = 0;
    this.arrows = [];
    this.currentLevelIndex = 0;
    this.level = this.levels[this.currentLevelIndex];
    this.state = STATE_READY;
    this.stateTimer = 2.0; // 2 seconds ready state
    this.spawnPlayers();
    this.ui.updateWins(0, 0, this.roundsToWin);
    // Allow single player mode - don't require gamepad
    if (!this.gamepadManager.hasGamepad(2)) {
      this.ui.showJoinOverlay();
    } else {
      this.ui.hideJoinOverlay();
    }
  }

  startNewRound() {
    this.currentRound++;
    this.arrows = [];
    this.player1.respawn(this.level.spawns.p1[0], this.level.spawns.p1[1]);
    // Always spawn Player 2 - can use keyboard or gamepad
    this.player2.respawn(this.level.spawns.p2[0], this.level.spawns.p2[1]);
    this.player2.dead = false;
    this.p1ShootHeld = false;
    this.p2ShootHeld = false;
    this.state = STATE_READY;
    this.stateTimer = 2.0;
    this.ui.showBanner(`Round ${this.currentRound}`, 'ready', 2000);
  }

  spawnPlayers() {
    if (this.level) {
      this.player1.respawn(this.level.spawns.p1[0], this.level.spawns.p1[1]);
      // Always spawn Player 2 - can use keyboard or gamepad
      this.player2.respawn(this.level.spawns.p2[0], this.level.spawns.p2[1]);
      this.player2.dead = false; // Ensure Player 2 is alive
    }
  }

  setupUIListeners() {
    this.ui.setupListeners(
      () => this.handleJoinClick(),
      () => this.handleSaveMatch(),
      () => this.handleCancelMatch()
    );
  }

  handleJoinClick() {
    this.ui.showJoinHint();
    // Poll for START button press
    const checkInterval = setInterval(() => {
      const gamepadIndex = this.gamepadManager.checkJoinButton();
      if (gamepadIndex >= 0) {
        if (this.gamepadManager.tryBind(2)) {
          this.ui.hideJoinOverlay();
          this.spawnPlayers();
          clearInterval(checkInterval);
        }
      }
    }, 100);
  }

  async handleSaveMatch() {
    const matchData = this.ui.getMatchData();
    
    if (!matchData.winner || !matchData.loser) {
      alert('Please enter both winner and loser names');
      return;
    }

    try {
      const response = await fetch('/api/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          winner: matchData.winner,
          loser: matchData.loser,
          winner_kos: matchData.winnerKOs,
          loser_kos: matchData.loserKOs,
          roundsToWin: this.roundsToWin
        })
      });

      if (response.ok) {
        this.ui.showSuccess();
      } else {
        throw new Error('Failed to save match');
      }
    } catch (error) {
      console.error('Error saving match:', error);
      alert('Failed to save match. Please try again.');
    }
  }

  handleCancelMatch() {
    this.ui.hideMatchEndModal();
    this.startNewMatch();
  }

  update(dt) {
    // Handle hit pause
    if (this.hitPause > 0) {
      this.hitPause -= dt;
      if (this.hitPause > 0) return;
    }

    // Update screen shake
    if (this.screenShake.duration > 0) {
      this.screenShake.duration -= dt;
      if (this.screenShake.duration > 0) {
        this.screenShake.x = (Math.random() - 0.5) * 6;
        this.screenShake.y = (Math.random() - 0.5) * 6;
      } else {
        this.screenShake.x = 0;
        this.screenShake.y = 0;
      }
    }

    // Update state timer
    this.stateTimer -= dt;

    // State machine
    switch (this.state) {
      case STATE_READY:
        if (this.stateTimer <= 0) {
          this.state = STATE_PLAY;
          this.stateTimer = 0;
        }
        break;

      case STATE_PLAY:
        this.updatePlay(dt);
        break;

      case STATE_SCORED:
        if (this.stateTimer <= 0) {
          // Check if match is over
          if (this.player1.wins >= this.roundsToWin || this.player2.wins >= this.roundsToWin) {
            this.state = STATE_RESULTS;
            this.showMatchEndModal();
          } else {
            this.startNewRound();
          }
        }
        break;

      case STATE_RESULTS:
        // Waiting for user input
        break;
    }
  }

  updatePlay(dt) {
    // Poll gamepads
    this.gamepadManager.poll();

    // Get input
    const p1Input = this.inputManager.getPlayer1Input();
    const p2Input = this.inputManager.getPlayer2Input();

    // Update players
    if (!this.player1.dead) {
      this.player1.update(dt, this.level, p1Input);
    }
    // Allow Player 2 to work with keyboard fallback if no gamepad
    if (!this.player2.dead) {
      this.player2.update(dt, this.level, p2Input);
    }

    // Handle shooting - check for new key press (not held)
    if (p1Input.shoot && !this.player1.dead && !this.p1ShootHeld) {
      this.p1ShootHeld = true;
      if (this.player1.fireArrow()) {
        const spawnX = this.player1.x + (this.player1.width / 2) + (this.player1.facing * 16);
        const spawnY = this.player1.y + (this.player1.height / 2);
        const arrowSpeed = 520;
        const arrow = new Arrow(
          spawnX,
          spawnY,
          this.player1.facing * arrowSpeed,
          0,
          this.player1.id
        );
        this.arrows.push(arrow);
      }
    }
    if (!p1Input.shoot) {
      this.p1ShootHeld = false;
    }

    if (p2Input.shoot && !this.player2.dead && !this.p2ShootHeld) {
      this.p2ShootHeld = true;
      if (this.player2.fireArrow()) {
        const spawnX = this.player2.x + (this.player2.width / 2) + (this.player2.facing * 16);
        const spawnY = this.player2.y + (this.player2.height / 2);
        const arrowSpeed = 520;
        const arrow = new Arrow(
          spawnX,
          spawnY,
          this.player2.facing * arrowSpeed,
          0,
          this.player2.id
        );
        this.arrows.push(arrow);
      }
    }
    if (!p2Input.shoot) {
      this.p2ShootHeld = false;
    }

    // Update arrows
    for (const arrow of this.arrows) {
      arrow.update(dt, this.level);
    }

    // Check arrow collisions with players
    for (const arrow of this.arrows) {
      if (!this.player1.dead && arrow.checkPlayerCollision(this.player1)) {
        this.player1.knockout();
        this.hitPause = 0.05;
        this.screenShake = { x: 0, y: 0, duration: 0.12 };
        arrow.remove();
      }
      if (!this.player2.dead && arrow.checkPlayerCollision(this.player2)) {
        this.player2.knockout();
        this.hitPause = 0.05;
        this.screenShake = { x: 0, y: 0, duration: 0.12 };
        arrow.remove();
      }
    }

    // Check stomp collisions
    if (!this.player1.dead && this.player1.isStomping()) {
      const p1Feet = this.player1.getFeetBounds();
      const p2Head = this.player2.getHeadBounds();
      if (this.checkAABB(p1Feet, p2Head) && !this.player2.dead) {
        this.player2.knockout();
        this.player1.vy = -260; // Bounce
        this.hitPause = 0.08;
        this.screenShake = { x: 0, y: 0, duration: 0.12 };
      }
    }

    if (!this.player2.dead && this.player2.isStomping()) {
      const p2Feet = this.player2.getFeetBounds();
      const p1Head = this.player1.getHeadBounds();
      if (this.checkAABB(p2Feet, p1Head) && !this.player1.dead) {
        this.player1.knockout();
        this.player2.vy = -260; // Bounce
        this.hitPause = 0.08;
        this.screenShake = { x: 0, y: 0, duration: 0.12 };
      }
    }

    // Check arrow pickups
    for (const arrow of this.arrows) {
      if (arrow.checkPickupCollision(this.player1) && !this.player1.dead) {
        if (this.player1.pickupArrow()) {
          arrow.remove();
        }
      }
      if (arrow.checkPickupCollision(this.player2) && !this.player2.dead) {
        if (this.player2.pickupArrow()) {
          arrow.remove();
        }
      }
    }

    // Remove inactive arrows
    this.arrows = this.arrows.filter(arrow => arrow.active);

    // Check for round end
    const alivePlayers = [];
    if (!this.player1.dead) alivePlayers.push(this.player1);
    if (!this.player2.dead) alivePlayers.push(this.player2);

    if (alivePlayers.length === 1) {
      // Round winner
      const winner = alivePlayers[0];
      winner.wins++;
      this.state = STATE_SCORED;
      this.stateTimer = 1.0;

      // Show banner
      let bannerText = `Player ${winner.id} Wins!`;
      let bannerType = 'winner';
      if (winner.wins === this.roundsToWin - 1) {
        bannerText = 'Match Point!';
        bannerType = 'match-point';
      }
      this.ui.showBanner(bannerText, bannerType, 1000);
    } else if (alivePlayers.length === 0) {
      // Draw (both dead) - restart round
      this.startNewRound();
    }

    // Update UI
    this.ui.updateWins(this.player1.wins, this.player2.wins, this.roundsToWin);
    this.ui.updateArrows(this.player1.arrows, this.player2.arrows);
  }

  checkAABB(rect1, rect2) {
    return (
      rect1.x < rect2.x + rect2.width &&
      rect1.x + rect1.width > rect2.x &&
      rect1.y < rect2.y + rect2.height &&
      rect1.y + rect1.height > rect2.y
    );
  }

  showMatchEndModal() {
    const winner = this.player1.wins >= this.roundsToWin ? this.player1 : this.player2;
    const loser = winner === this.player1 ? this.player2 : this.player1;
    this.ui.showMatchEndModal(
      `Player ${winner.id}`,
      `Player ${loser.id}`,
      0,
      0
    );
  }

  render() {
    // Clear canvas
    this.ctx.fillStyle = '#0e0e12';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Apply screen shake
    this.ctx.save();
    this.ctx.translate(this.screenShake.x, this.screenShake.y);

    // Render level
    if (this.level) {
      this.level.render(this.ctx);
    }

    // Render arrows
    for (const arrow of this.arrows) {
      arrow.render(this.ctx);
    }

    // Render players
    if (this.player1) {
      this.player1.render(this.ctx);
    }
    if (this.player2) {
      this.player2.render(this.ctx);
    }

    this.ctx.restore();
  }

  gameLoop(currentTime) {
    const dt = Math.min((currentTime - this.lastTime) / 1000, 1/30); // Cap at 30 FPS minimum
    this.lastTime = currentTime;

    this.update(dt);
    this.render();

    this.requestAnimationFrame(this.gameLoop.bind(this));
  }

  requestAnimationFrame(callback) {
    if (window.requestAnimationFrame) {
      return window.requestAnimationFrame(callback);
    } else {
      return setTimeout(callback, 16);
    }
  }
}

// Start game when page loads
window.addEventListener('DOMContentLoaded', () => {
  new Game();
});

