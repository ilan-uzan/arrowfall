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
    
    // Start with title screen
    this.setScene('title');
    
    // Start game loop
    this.loop = new GameLoop(
      (dt) => this.update(dt),
      (alpha) => this.render(alpha)
    );
    this.loop.start();
  }

  initScenes() {
    // Import and register all scenes
    import('./scenes/title.js').then(module => {
      this.scenes.title = new module.TitleScene(this);
    });
    import('./scenes/modeSelect.js').then(module => {
      this.scenes.modeSelect = new module.ModeSelectScene(this);
    });
    import('./scenes/lobby.js').then(module => {
      this.scenes.lobby = new module.LobbyScene(this);
    });
    import('./scenes/versus.js').then(module => {
      this.scenes.versus = new module.VersusScene(this);
    });
    import('./scenes/survival.js').then(module => {
      this.scenes.survival = new module.SurvivalScene(this);
    });
    import('./scenes/results.js').then(module => {
      this.scenes.results = new module.ResultsScene(this);
    });
  }

  setScene(sceneName) {
    if (this.currentScene && this.currentScene.exit) {
      this.currentScene.exit();
    }
    
    this.currentScene = this.scenes[sceneName];
    if (this.currentScene && this.currentScene.enter) {
      this.currentScene.enter();
    }
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
    // Render current scene
    if (this.currentScene && this.currentScene.render) {
      this.currentScene.render(this.ctx, alpha);
    }
  }
}

// Start game when DOM is ready
function initGame() {
  try {
    window.game = new Game();
    if (!window.game || !window.game.canvas) {
      console.error('Game engine failed to initialize');
    } else {
      console.log('Game engine initialized successfully');
    }
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
  initGame();
}

