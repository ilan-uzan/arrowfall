// Gamepad-only input system - PS5 controllers
export class InputRouter {
  constructor() {
    this.gamepads = [];
    this.playerBindings = {}; // playerId -> { type: 'gamepad', id: number }
    this.buttonStates = {}; // Track button press states for single-frame detection
    this.lastButtonStates = {}; // Previous frame button states
    
    this.setupGamepad();
  }

  setupGamepad() {
    // Listen for gamepad connection events
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
    
    // Request gamepad access (required for some browsers)
    // User must interact with page first
    if (navigator.getGamepads) {
      // Initial check
      this.updateGamepads();
    }
  }

  updateGamepads() {
    // Poll gamepads - this is required for proper detection
    const pads = navigator.getGamepads();
    if (!pads) {
      this.gamepads = [];
      return;
    }
    this.gamepads = Array.from(pads).filter(p => p !== null);
  }
  
  // Debug: Get raw gamepad info
  getGamepadInfo(gamepadIndex) {
    this.updateGamepads();
    const pad = this.gamepads.find(p => p && p.index === gamepadIndex);
    if (!pad) return null;
    
    return {
      id: pad.id,
      index: pad.index,
      buttons: pad.buttons.map((b, i) => ({ 
        index: i, 
        pressed: b.pressed, 
        value: b.value 
      })),
      axes: pad.axes.map((a, i) => ({ index: i, value: a }))
    };
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

    // Check if gamepad is still connected
    if (!pad.connected) return null;

    const deadzone = 0.22;
    const leftStickX = pad.axes[0] || 0;
    const leftStickY = pad.axes[1] || 0;
    
    // D-Pad mapping for PS5 DualSense
    // Standard gamepad layout: 12=Up, 13=Down, 14=Left, 15=Right
    let dPadX = 0;
    let dPadY = 0;
    
    // Check D-Pad buttons (if they exist)
    if (pad.buttons.length > 15) {
      if (pad.buttons[15]?.pressed) dPadX = 1; // Right
      else if (pad.buttons[14]?.pressed) dPadX = -1; // Left
      
      if (pad.buttons[13]?.pressed) dPadY = 1; // Down
      else if (pad.buttons[12]?.pressed) dPadY = -1; // Up
    }
    
    // Use D-Pad for menu navigation if stick is not active
    const moveX = Math.abs(leftStickX) > deadzone ? leftStickX : dPadX;
    const moveY = Math.abs(leftStickY) > deadzone ? leftStickY : dPadY;
    
    // PS5 DualSense button mapping (standard gamepad layout)
    // Button 0 = Cross (X on Xbox) - Jump
    // Button 1 = Circle (B on Xbox)
    // Button 2 = Square (Y on Xbox) - Shoot
    // Button 3 = Triangle (X on Xbox)
    // Button 7 = R2 trigger (value 0-1) - Shoot alt
    // Button 9 = Options/Start button - Pause/Join
    const button0Pressed = pad.buttons[0]?.pressed || false; // Cross (Jump)
    const button2Pressed = pad.buttons[2]?.pressed || false; // Square (Shoot)
    const button7Pressed = (pad.buttons[7]?.value || 0) > 0.3; // R2 trigger (Shoot alt)
    const button9Pressed = pad.buttons[9]?.pressed || false; // Options/Start
    
    const key = `pad${gamepadIndex}`;
    const lastState = this.lastButtonStates[key] || {};
    
    // Single-frame press detection (only true on transition from not pressed to pressed)
    const jumpPressed = button0Pressed && !lastState.button0;
    const shootPressed = (button2Pressed || button7Pressed) && !(lastState.button2 || lastState.button7);
    const pausePressed = button9Pressed && !lastState.button9;
    
    // Update last button states
    this.lastButtonStates[key] = {
      button0: button0Pressed,
      button2: button2Pressed,
      button7: button7Pressed,
      button9: button9Pressed
    };
    
    return {
      left: moveX < -deadzone,
      right: moveX > deadzone,
      up: moveY < -deadzone,
      down: moveY > deadzone,
      jumpPressed: jumpPressed,
      shootPressed: shootPressed,
      pausePressed: pausePressed,
      aimX: Math.abs(leftStickX) > deadzone ? leftStickX : 0,
      aimY: Math.abs(leftStickY) > deadzone ? leftStickY : 0
    };
  }

  // Check if any unbound gamepad pressed button 0 (join)
  checkJoinButton() {
    this.updateGamepads();
    const boundIndices = Object.values(this.playerBindings)
      .filter(b => b.type === 'gamepad')
      .map(b => b.id);
    
    for (const pad of this.gamepads) {
      if (pad && !boundIndices.includes(pad.index)) {
        const key = `pad${pad.index}`;
        const lastState = this.lastButtonStates[key] || {};
        const button0Pressed = pad.buttons[0]?.pressed || false;
        
        // Only return on new press
        if (button0Pressed && !lastState.button0) {
          // Update state
          this.lastButtonStates[key] = { ...lastState, button0: true };
          return pad.index;
        }
      }
    }
    return -1;
  }
  
  // Get available (unbound) gamepads
  getAvailableGamepads() {
    this.updateGamepads();
    const boundIndices = Object.values(this.playerBindings)
      .filter(b => b.type === 'gamepad')
      .map(b => b.id);
    
    return this.gamepads.filter(pad => pad && !boundIndices.includes(pad.index));
  }
  
  // Unbind a player
  unbindPlayer(playerId) {
    delete this.playerBindings[playerId];
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

