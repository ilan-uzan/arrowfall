// Unified input system - Keyboard + Gamepad
export class InputRouter {
  constructor() {
    this.keys = {};
    this.keyPresses = {}; // Track key presses for frame
    this.gamepads = [];
    this.playerBindings = {}; // playerId -> { type: 'keyboard'|'gamepad', id: number }
    
    this.setupKeyboard();
    this.setupGamepad();
  }

  setupKeyboard() {
    this.keyPresses = {}; // Track key presses for frame
    
    window.addEventListener('keydown', (e) => {
      const key = e.key.toLowerCase();
      const code = e.code;
      
      // Prevent default for game keys
      if (['w', 'a', 's', 'd', ' ', 'f', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
        e.preventDefault();
      }
      
      if (!this.keys[key]) {
        this.keyPresses[key] = true;
        this.keyPresses[code] = true;
      }
      this.keys[key] = true;
      this.keys[code] = true;
    });

    window.addEventListener('keyup', (e) => {
      const key = e.key.toLowerCase();
      const code = e.code;
      this.keys[key] = false;
      this.keys[code] = false;
      this.keyPresses[key] = false;
      this.keyPresses[code] = false;
    });
  }

  setupGamepad() {
    window.addEventListener('gamepadconnected', (e) => {
      console.log('Gamepad connected:', e.gamepad.id);
      this.updateGamepads();
    });

    window.addEventListener('gamepaddisconnected', (e) => {
      console.log('Gamepad disconnected:', e.gamepad.id);
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

  // Bind keyboard to a player
  bindKeyboard(playerId) {
    this.playerBindings[playerId] = { type: 'keyboard', id: playerId };
  }

  // Get actions for a player
  getActions(playerId) {
    const binding = this.playerBindings[playerId];
    if (!binding) return null;

    if (binding.type === 'gamepad') {
      return this.getGamepadActions(binding.id);
    } else {
      return this.getKeyboardActions(playerId);
    }
  }

  getKeyboardActions(playerId) {
    // Default keyboard mappings
    const mappings = {
      1: { left: ['a', 'ArrowLeft'], right: ['d', 'ArrowRight'], jump: ['w', ' '], shoot: ['s', 'f'], pause: ['Escape'] },
      2: { left: ['ArrowLeft'], right: ['ArrowRight'], jump: ['ArrowUp'], shoot: ['ArrowDown'], pause: ['Escape'] },
      3: { left: ['j'], right: ['l'], jump: ['i'], shoot: ['k'], pause: ['Escape'] },
      4: { left: ['Numpad4'], right: ['Numpad6'], jump: ['Numpad8'], shoot: ['Numpad5'], pause: ['Escape'] }
    };

    const map = mappings[playerId] || mappings[1];
    
    // Check for key presses (not just held)
    const jumpPressed = map.jump.some(k => this.keyPresses && this.keyPresses[k]);
    const shootPressed = map.shoot.some(k => this.keyPresses && this.keyPresses[k]);
    
    // Clear key presses after reading
    if (this.keyPresses) {
      for (const key of map.jump) {
        this.keyPresses[key] = false;
      }
      for (const key of map.shoot) {
        this.keyPresses[key] = false;
      }
    }
    
    return {
      left: map.left.some(k => this.keys[k]),
      right: map.right.some(k => this.keys[k]),
      jumpPressed: jumpPressed || map.jump.some(k => this.keys[k]),
      shootPressed: shootPressed || map.shoot.some(k => this.keys[k]),
      pausePressed: map.pause.some(k => this.keys[k]),
      aimX: 0,
      aimY: 0
    };
  }

  getGamepadActions(gamepadIndex) {
    this.updateGamepads();
    const pad = this.gamepads.find(p => p && p.index === gamepadIndex);
    if (!pad) return null;

    const deadzone = 0.22;
    const leftStickX = pad.axes[0] || 0;
    const leftStickY = pad.axes[1] || 0;
    
    return {
      left: Math.abs(leftStickX) > deadzone ? leftStickX < -deadzone : false,
      right: Math.abs(leftStickX) > deadzone ? leftStickX > deadzone : false,
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

