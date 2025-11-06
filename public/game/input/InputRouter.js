// Gamepad-only input system - PS5 controllers
export class InputRouter {
  constructor() {
    this.gamepads = [];
    this.playerBindings = {}; // playerId -> { type: 'gamepad', id: number }
    
    this.setupGamepad();
  }

  setupGamepad() {
    window.addEventListener('gamepadconnected', (e) => {
      this.updateGamepads();
    });

    window.addEventListener('gamepaddisconnected', (e) => {
      this.updateGamepads();
      // Remove bindings for disconnected pad
      for (const [playerId, binding] of Object.entries(this.playerBindings)) {
        if (binding.type === 'gamepad' && binding.id === e.gamepad.index) {
          delete this.playerBindings[playerId];
        }
      }
    });
  }

  updateGamepads() {
    const pads = navigator.getGamepads();
    this.gamepads = Array.from(pads).filter(p => p !== null);
  }

  // Try to bind a gamepad to a player
  tryBindGamepad(playerId, gamepadIndex) {
    if (this.playerBindings[playerId]) return false;
    this.playerBindings[playerId] = { type: 'gamepad', id: gamepadIndex };
    return true;
  }

  // Get actions for a player (gamepad only)
  getActions(playerId) {
    const binding = this.playerBindings[playerId];
    if (!binding || binding.type !== 'gamepad') return null;
    return this.getGamepadActions(binding.id);
  }

  getGamepadActions(gamepadIndex) {
    this.updateGamepads();
    const pad = this.gamepads.find(p => p && p.index === gamepadIndex);
    if (!pad) return null;

    const deadzone = 0.22;
    const leftStickX = pad.axes[0] || 0;
    const leftStickY = pad.axes[1] || 0;
    const dPadX = pad.buttons[15]?.pressed ? -1 : (pad.buttons[14]?.pressed ? 1 : 0);
    const dPadY = pad.buttons[12]?.pressed ? -1 : (pad.buttons[13]?.pressed ? 1 : 0);
    
    // Use D-Pad for menu navigation if stick is not active
    const moveX = Math.abs(leftStickX) > deadzone ? leftStickX : dPadX;
    const moveY = Math.abs(leftStickY) > deadzone ? leftStickY : dPadY;
    
    return {
      left: moveX < -deadzone,
      right: moveX > deadzone,
      up: moveY < -deadzone,
      down: moveY > deadzone,
      jumpPressed: pad.buttons[0]?.pressed || false, // A/Cross
      shootPressed: pad.buttons[2]?.pressed || pad.buttons[7]?.pressed > 0.3, // X/Square or R2
      pausePressed: pad.buttons[9]?.pressed || false, // Start/Options
      aimX: Math.abs(leftStickX) > deadzone ? leftStickX : 0,
      aimY: Math.abs(leftStickY) > deadzone ? leftStickY : 0
    };
  }

  // Check if any gamepad pressed button 0 (join)
  checkJoinButton() {
    this.updateGamepads();
    for (const pad of this.gamepads) {
      if (pad && pad.buttons[0]?.pressed) {
        return pad.index;
      }
    }
    return -1;
  }

  // Rumble (if supported)
  rumble(gamepadIndex, intensity, duration) {
    const pad = this.gamepads.find(p => p && p.index === gamepadIndex);
    if (!pad || !pad.vibrationActuator) return;

    try {
      pad.vibrationActuator.playEffect('dual-rumble', {
        startDelay: 0,
        duration: duration,
        weakMagnitude: intensity,
        strongMagnitude: intensity
      });
    } catch (e) {
      // Rumble not supported
    }
  }
}

