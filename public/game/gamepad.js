// Gamepad manager for handling controller input
export class GamepadManager {
  constructor() {
    this.gamepads = [];
    this.bindings = {}; // playerId -> gamepadIndex
    this.polling = false;
    this.lastState = [];

    // Listen for gamepad events
    window.addEventListener('gamepadconnected', (e) => {
      console.log('Gamepad connected:', e.gamepad.id);
      this.updateGamepads();
    });

    window.addEventListener('gamepaddisconnected', (e) => {
      console.log('Gamepad disconnected:', e.gamepad.id);
      // Remove bindings for disconnected pad
      for (const [playerId, index] of Object.entries(this.bindings)) {
        if (index === e.gamepad.index) {
          delete this.bindings[playerId];
        }
      }
      this.updateGamepads();
    });

    this.updateGamepads();
  }

  updateGamepads() {
    const gamepads = navigator.getGamepads();
    this.gamepads = Array.from(gamepads).filter(g => g !== null);
  }

  poll() {
    this.updateGamepads();
    this.lastState = [];
    
    for (let i = 0; i < this.gamepads.length; i++) {
      const gamepad = this.gamepads[i];
      if (!gamepad) continue;

      const state = {
        buttons: Array.from(gamepad.buttons).map(b => b.pressed),
        axes: Array.from(gamepad.axes),
        index: gamepad.index,
        id: gamepad.id
      };
      this.lastState[gamepad.index] = state;
    }
  }

  // Try to bind a gamepad to a player
  tryBind(playerId) {
    this.updateGamepads();
    
    // Check if player already has a binding
    if (this.bindings[playerId] !== undefined) {
      return false;
    }

    // Find first available gamepad
    for (const gamepad of this.gamepads) {
      const isBound = Object.values(this.bindings).includes(gamepad.index);
      if (!isBound) {
        this.bindings[playerId] = gamepad.index;
        return true;
      }
    }

    return false;
  }

  // Check if any gamepad pressed START/OPTIONS (button 9)
  checkJoinButton() {
    this.poll();
    for (const state of this.lastState) {
      if (!state) continue;
      // Button 9 is START/OPTIONS
      if (state.buttons[9] && state.buttons[9] === true) {
        return state.index;
      }
    }
    return -1;
  }

  // Get input state for a player
  getInput(playerId) {
    const gamepadIndex = this.bindings[playerId];
    if (gamepadIndex === undefined) {
      return null;
    }

    const state = this.lastState[gamepadIndex];
    if (!state) {
      this.poll();
      const state = this.lastState[gamepadIndex];
      if (!state) return null;
    }

    const deadzone = 0.20;
    const leftStickX = state.axes[0];
    const leftStickY = state.axes[1];

    return {
      moveX: Math.abs(leftStickX) > deadzone 
        ? Math.sign(leftStickX) 
        : 0,
      moveY: Math.abs(leftStickY) > deadzone 
        ? Math.sign(leftStickY) 
        : 0,
      jump: state.buttons[0] || false, // A/Cross
      shoot: state.buttons[2] || (state.axes[7] > 0.3), // X/Square or R2
      pickup: state.buttons[2] || false, // X/Square
      dash: state.buttons[1] || false, // B/Circle
      gamepadIndex: gamepadIndex,
      gamepadId: state.id
    };
  }

  // Rumble (if supported)
  rumble(gamepadIndex, intensity, duration) {
    const gamepad = this.gamepads.find(g => g && g.index === gamepadIndex);
    if (!gamepad || !gamepad.vibrationActuator) {
      return;
    }

    try {
      gamepad.vibrationActuator.playEffect('dual-rumble', {
        startDelay: 0,
        duration: duration,
        weakMagnitude: intensity,
        strongMagnitude: intensity
      });
    } catch (e) {
      // Rumble not supported
      console.log('Rumble not supported');
    }
  }

  // Unbind a player
  unbind(playerId) {
    delete this.bindings[playerId];
  }

  // Check if player has a gamepad
  hasGamepad(playerId) {
    return this.bindings[playerId] !== undefined;
  }
}

