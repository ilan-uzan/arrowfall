// Gamepad API Wrapper
export class GamepadManager {
  constructor() {
    this.gamepads = [];
    this.setupListeners();
  }

  setupListeners() {
    window.addEventListener('gamepadconnected', () => {
      this.updateGamepads();
    });

    window.addEventListener('gamepaddisconnected', () => {
      this.updateGamepads();
    });
  }

  updateGamepads() {
    const pads = navigator.getGamepads();
    if (!pads) {
      this.gamepads = [];
      return;
    }
    this.gamepads = Array.from(pads).filter(p => p !== null);
  }

  getGamepad(index) {
    this.updateGamepads();
    return this.gamepads.find(p => p && p.index === index) || null;
  }

  getAllGamepads() {
    this.updateGamepads();
    return this.gamepads.filter(p => p !== null);
  }

  getConnectedCount() {
    return this.getAllGamepads().length;
  }

  // Request gamepad access (required for some browsers)
  requestAccess() {
    if (navigator.getGamepads) {
      navigator.getGamepads();
    }
  }
}

