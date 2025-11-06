// Game Loop - Fixed Timestep + Interpolated Render
import { FIXED_DT, VIEW } from './constants.js';

export class GameLoop {
  constructor(updateFn, renderFn) {
    this.updateFn = updateFn;
    this.renderFn = renderFn;
    this.running = false;
    this.lastTime = performance.now();
    this.accumulator = 0;
    this.frameId = null;
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.accumulator = 0;
    this.tick();
  }

  stop() {
    this.running = false;
    if (this.frameId) {
      cancelAnimationFrame(this.frameId);
      this.frameId = null;
    }
  }

  tick() {
    if (!this.running) return;
    
    const currentTime = performance.now();
    let frameTime = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;
    
    // Cap frame time to prevent spiral of death
    if (frameTime > 0.25) frameTime = 0.25;
    
    this.accumulator += frameTime;
    
    // Fixed timestep updates
    while (this.accumulator >= FIXED_DT) {
      this.updateFn(FIXED_DT);
      this.accumulator -= FIXED_DT;
    }
    
    // Interpolated render
    const alpha = this.accumulator / FIXED_DT;
    this.renderFn(alpha);
    
    this.frameId = requestAnimationFrame(() => this.tick());
  }
}

