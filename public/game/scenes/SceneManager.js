// Scene manager for Title, Character Select, Arena, Results
export class SceneManager {
  constructor(game) {
    this.game = game;
    this.currentScene = 'title';
    this.scenes = {
      title: null,
      characterSelect: null,
      arena: null,
      results: null
    };
  }

  setScene(sceneName) {
    if (!this.scenes[sceneName]) {
      console.error(`Scene ${sceneName} not found`);
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
  }

  update(dt) {
    if (this.scenes[this.currentScene]?.update) {
      this.scenes[this.currentScene].update(dt);
    }
  }

  render(ctx) {
    if (this.scenes[this.currentScene]?.render) {
      this.scenes[this.currentScene].render(ctx);
    }
  }

  handleInput(actions, playerId) {
    if (this.scenes[this.currentScene]?.handleInput) {
      this.scenes[this.currentScene].handleInput(actions, playerId);
    }
  }
}

