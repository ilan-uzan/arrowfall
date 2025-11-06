// Scene manager for Title, Character Select, Arena, Results
export class SceneManager {
  constructor(game) {
    this.game = game;
    this.currentScene = 'title';
    this.scenes = {
      title: null,
      characterSelect: null,
      arena: null,
      results: null,
      survival: null,
      settings: null
    };
  }

  setScene(sceneName) {
    if (!this.scenes[sceneName]) {
      // Scene not found - use default
      return;
    }
    
    // Cleanup previous scene
    if (this.scenes[this.currentScene]?.exit) {
      this.scenes[this.currentScene].exit();
    }
    
    this.currentScene = sceneName;
    
    // Initialize new scene
    if (this.scenes[sceneName]?.enter) {
      this.scenes[sceneName].enter();
    }
  }

  registerScene(name, scene) {
    this.scenes[name] = scene;
    // Also store by scene name for easy access
    if (name === 'arena') {
      this.scenes.arena = scene;
    } else if (name === 'results') {
      this.scenes.results = scene;
    } else if (name === 'title') {
      this.scenes.title = scene;
    } else if (name === 'characterSelect') {
      this.scenes.characterSelect = scene;
    } else if (name === 'survival') {
      this.scenes.survival = scene;
    } else if (name === 'settings') {
      this.scenes.settings = scene;
    }
  }

  update(dt) {
    if (this.scenes[this.currentScene]?.update) {
      this.scenes[this.currentScene].update(dt);
    }
  }

  render(ctx) {
    if (this.scenes[this.currentScene]?.render) {
      try {
        this.scenes[this.currentScene].render(ctx);
      } catch (error) {
        console.error('Error rendering scene:', error);
        // Fallback: draw a simple background
        ctx.fillStyle = '#0d0f1a';
        ctx.fillRect(0, 0, this.game.view.w, this.game.view.h);
        ctx.fillStyle = '#7df9ff';
        ctx.font = '16px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('Rendering Error', this.game.view.w / 2, this.game.view.h / 2);
      }
    } else {
      // No scene loaded - draw fallback
      ctx.fillStyle = '#0d0f1a';
      ctx.fillRect(0, 0, this.game.view.w, this.game.view.h);
      ctx.fillStyle = '#7df9ff';
      ctx.font = '16px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('Scene not loaded', this.game.view.w / 2, this.game.view.h / 2);
    }
  }

  handleInput(actions, playerId) {
    if (this.scenes[this.currentScene]?.handleInput) {
      this.scenes[this.currentScene].handleInput(actions, playerId);
    }
  }
}

