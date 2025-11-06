// Main Game Entry Point
import { GameLoop } from './engine/loop.js';
import { World } from './engine/world.js';
import { PhysicsSystem } from './engine/physics.js';
import { CollisionSystem } from './engine/collisions.js';
import { InputRouter } from './engine/input/router.js';
import { RenderSystem } from './engine/render.js';
import { FXSystem } from './engine/fx.js';
import { VIEW, CSS_SCALE, PALETTE } from './engine/constants.js';
import { TitleScene } from './scenes/title.js';

class Game {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    if (!this.canvas) {
      console.error('Canvas element not found');
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
    this.world = new World();
    this.physics = new PhysicsSystem(this.world);
    this.collisions = new CollisionSystem();
    this.inputRouter = new InputRouter();
    this.fx = new FXSystem();
    this.renderer = new RenderSystem(this.ctx, this.world, this.fx);
    
    // Scene management
    this.currentScene = null;
    this.scenes = {};
    
    // Initialize scenes
    this.initScenes();
    
    // Start with title screen (already loaded)
    if (this.scenes.title) {
      this.currentScene = this.scenes.title;
      if (this.currentScene && this.currentScene.enter) {
        this.currentScene.enter();
      }
      console.log('Title scene initialized');
    } else {
      console.error('Title scene not found!');
    }
    
    // Start game loop
    this.loop = new GameLoop(
      (dt) => this.update(dt),
      (alpha) => this.render(alpha)
    );
    this.loop.start();
  }

  initScenes() {
    // Directly register title scene (already imported)
    this.scenes.title = new TitleScene(this);
    
    // Lazy load other scenes when needed
    // They will be imported on-demand when switching scenes
  }

  async setScene(sceneName) {
    if (this.currentScene && this.currentScene.exit) {
      this.currentScene.exit();
    }
    
    // If scene doesn't exist, try to load it
    if (!this.scenes[sceneName]) {
      try {
        await this.loadScene(sceneName);
      } catch (error) {
        console.error(`Failed to load scene: ${sceneName}`, error);
        // Fallback to title scene if scene fails to load
        sceneName = 'title';
      }
    }
    
    this.currentScene = this.scenes[sceneName];
    if (this.currentScene && this.currentScene.enter) {
      this.currentScene.enter();
    }
  }

  async loadScene(sceneName) {
    // Don't load if already exists
    if (this.scenes[sceneName]) return;
    
    try {
      if (sceneName === 'modeSelect') {
        const module = await import('./scenes/modeSelect.js');
        this.scenes.modeSelect = new module.ModeSelectScene(this);
      } else if (sceneName === 'lobby') {
        const module = await import('./scenes/lobby.js');
        this.scenes.lobby = new module.LobbyScene(this);
      } else if (sceneName === 'versus') {
        const module = await import('./scenes/versus.js');
        this.scenes.versus = new module.VersusScene(this);
      } else if (sceneName === 'survival') {
        const module = await import('./scenes/survival.js');
        this.scenes.survival = new module.SurvivalScene(this);
      } else if (sceneName === 'results') {
        const module = await import('./scenes/results.js');
        this.scenes.results = new module.ResultsScene(this);
      }
      console.log(`Scene ${sceneName} loaded`);
    } catch (error) {
      console.error(`Failed to load scene ${sceneName}:`, error);
      // Create placeholder scene that just shows a message
      this.scenes[sceneName] = this.createPlaceholderScene(sceneName);
    }
  }

  createPlaceholderScene(sceneName) {
    return {
      enter: () => {},
      exit: () => {},
      update: () => {},
      handleInput: () => {},
      render: (ctx) => {
        ctx.fillStyle = PALETTE.bg0;
        ctx.fillRect(0, 0, VIEW.w, VIEW.h);
        ctx.fillStyle = PALETTE.accent;
        ctx.font = '16px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${sceneName} scene - Coming soon`, VIEW.w / 2, VIEW.h / 2);
      }
    };
  }

  update(dt) {
    // Update input
    this.inputRouter.update();
    
    // Update FX
    this.fx.update(dt);
    
    // Update current scene
    if (this.currentScene && this.currentScene.update) {
      this.currentScene.update(dt);
    }
    
    // Handle input for all bound players
    for (let i = 1; i <= 4; i++) {
      const actions = this.inputRouter.getActions(i);
      if (actions && this.currentScene && this.currentScene.handleInput) {
        this.currentScene.handleInput(actions, i);
      }
    }
  }

  render(alpha) {
    // Render current scene or fallback
    if (this.currentScene && this.currentScene.render) {
      this.currentScene.render(this.ctx, alpha);
    } else {
      // Fallback: render blank screen with message
      this.ctx.fillStyle = PALETTE.bg0;
      this.ctx.fillRect(0, 0, VIEW.w, VIEW.h);
      this.ctx.fillStyle = PALETTE.accent;
      this.ctx.font = '16px monospace';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText('Loading...', VIEW.w / 2, VIEW.h / 2);
    }
  }
}

// Start game when DOM is ready
function initGame() {
  console.log('Initializing game...');
  console.log('DOM ready state:', document.readyState);
  
  const canvas = document.getElementById('game-canvas');
  if (!canvas) {
    console.error('Canvas element not found in DOM');
    return;
  }
  console.log('Canvas found:', canvas);
  
  try {
    window.game = new Game();
    if (!window.game) {
      console.error('Game instance not created');
      return;
    }
    if (!window.game.canvas) {
      console.error('Game canvas not set');
      return;
    }
    if (!window.game.currentScene) {
      console.error('No current scene set');
      return;
    }
    console.log('Game engine initialized successfully');
    console.log('Current scene:', window.game.currentScene);
    console.log('Canvas size:', window.game.canvas.width, 'x', window.game.canvas.height);
  } catch (error) {
    console.error('Error initializing game:', error);
    console.error(error.stack);
  }
}

// Try multiple initialization methods
if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', initGame);
} else {
  // DOM already loaded
  setTimeout(initGame, 100); // Small delay to ensure DOM is fully ready
}

