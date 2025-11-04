// Main Game Engine - Arrowfall
import { VIEW, CSS_SCALE, PALETTE, SCENES } from './constants.js';
import { AudioManager } from './audio.js';
import { InputRouter } from './input/InputRouter.js';
import { SceneManager } from './scenes/SceneManager.js';
import { TitleScene } from './scenes/TitleScene.js';
import { CharacterSelectScene } from './scenes/CharacterSelectScene.js';
import { ArenaScene } from './scenes/ArenaScene.js';
import { ResultsScene } from './scenes/ResultsScene.js';
import { SurvivalScene } from './scenes/SurvivalScene.js';
import { SettingsScene } from './scenes/SettingsScene.js';

export class GameEngine {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    if (!this.canvas) {
      return;
    }

    // Set canvas logical size and CSS scale
    this.view = VIEW;
    this.canvas.width = this.view.w;
    this.canvas.height = this.view.h;
    this.canvas.style.width = `${this.view.w * CSS_SCALE}px`;
    this.canvas.style.height = `${this.view.h * CSS_SCALE}px`;
    this.canvas.style.imageRendering = 'pixelated';

    this.ctx = this.canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;

    // Game systems
    this.audio = new AudioManager();
    this.inputRouter = new InputRouter();
    this.sceneManager = new SceneManager(this);
    
    // Game state
    this.players = [];
    this.mode = 'local-multiplayer'; // 'local-multiplayer' | 'single-player'
    this.currentRound = 0;
    this.roundsToWin = 5;
    
    // Time management
    this.lastTime = performance.now();
    this.timeScale = 1.0; // For slow-mo effects
    this.screenShake = { x: 0, y: 0, duration: 0 };
    this.hitFlash = 0;

    // Initialize scenes
    this.initScenes();

    // Start game loop
    this.gameLoop();
  }

  initScenes() {
    // Register all scenes
    this.sceneManager.registerScene(SCENES.TITLE, new TitleScene(this));
    this.sceneManager.registerScene(SCENES.CHARACTER_SELECT, new CharacterSelectScene(this));
    this.sceneManager.registerScene(SCENES.ARENA, new ArenaScene(this));
    this.sceneManager.registerScene(SCENES.RESULTS, new ResultsScene(this));
    this.sceneManager.registerScene(SCENES.SURVIVAL, new SurvivalScene(this));
    this.sceneManager.registerScene(SCENES.SETTINGS, new SettingsScene(this));
    
    // Start with title screen
    this.sceneManager.setScene(SCENES.TITLE);
  }

  setupPlayers(playerConfigs) {
    this.players = playerConfigs.map(config => ({
      id: config.id,
      color: config.color,
      score: 0,
      wins: 0,
      arrows: 5,
      ready: false,
      ...config
    }));
  }

  gameLoop() {
    const currentTime = performance.now();
    const dt = Math.min((currentTime - this.lastTime) / 1000, 1/30) * this.timeScale;
    this.lastTime = currentTime;

    // Update screen shake
    this.updateScreenShake(dt);
    
    // Update hit flash
    if (this.hitFlash > 0) {
      this.hitFlash -= dt;
    }

    // Update current scene
    this.sceneManager.update(dt);

    // Handle input for all bound players
    for (let i = 1; i <= 4; i++) {
      const actions = this.inputRouter.getActions(i);
      if (actions) {
        this.sceneManager.handleInput(actions, i);
      }
    }

    // Render
    this.render();

    requestAnimationFrame(() => this.gameLoop());
  }

  updateScreenShake(dt) {
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
  }

  render() {
    const { w, h } = this.view;

    // Clear canvas
    this.ctx.fillStyle = PALETTE.bg0;
    this.ctx.fillRect(0, 0, w, h);

    // Apply screen shake
    this.ctx.save();
    this.ctx.translate(this.screenShake.x, this.screenShake.y);

    // Render current scene
    this.sceneManager.render(this.ctx);

    // Apply hit flash overlay
    if (this.hitFlash > 0) {
      this.ctx.fillStyle = PALETTE.accent2;
      this.ctx.globalAlpha = Math.min(this.hitFlash * 5, 0.15);
      this.ctx.fillRect(0, 0, w, h);
      this.ctx.globalAlpha = 1.0;
    }

    this.ctx.restore();
  }

  triggerScreenShake(intensity = 6, duration = 0.12) {
    this.screenShake = { x: 0, y: 0, duration };
  }

  triggerHitFlash() {
    this.hitFlash = 0.06;
  }

  triggerSlowMo(duration = 0.3) {
    this.timeScale = 0.6;
    setTimeout(() => {
      this.timeScale = 1.0;
    }, duration * 1000);
  }
}

// Start game when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  window.game = new GameEngine();
});

