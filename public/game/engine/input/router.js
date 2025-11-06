// Input Router - Pure Gamepad Input
import { GamepadManager } from './gamepad.js';
import { DEADZONE, GAMEPAD_BUTTONS, DPAD } from '../constants.js';

export class InputRouter {
  constructor() {
    this.gamepadManager = new GamepadManager();
    this.playerBindings = new Map(); // playerId -> gamepadIndex
    this.lastButtonStates = new Map(); // Track button states for single-frame detection
    
    // Request gamepad access on user interaction
    window.addEventListener('click', () => this.gamepadManager.requestAccess());
    window.addEventListener('keydown', () => this.gamepadManager.requestAccess());
  }

  update() {
    this.gamepadManager.updateGamepads();
  }

  // Check if any unbound gamepad pressed button 0 (join)
  checkJoinButton() {
    const boundIndices = new Set(this.playerBindings.values());
    const allGamepads = this.gamepadManager.getAllGamepads();
    
    for (const pad of allGamepads) {
      if (boundIndices.has(pad.index)) continue;
      
      const key = `pad${pad.index}`;
      const lastState = this.lastButtonStates.get(key) || {};
      const button0Pressed = pad.buttons[GAMEPAD_BUTTONS.JUMP]?.pressed || false;
      
      // Only return on new press
      if (button0Pressed && !lastState[GAMEPAD_BUTTONS.JUMP]) {
        this.lastButtonStates.set(key, { ...lastState, [GAMEPAD_BUTTONS.JUMP]: true });
        return pad.index;
      }
    }
    return -1;
  }

  // Bind a gamepad to a player
  bindGamepad(playerId, gamepadIndex) {
    if (this.playerBindings.has(playerId)) return false;
    this.playerBindings.set(playerId, gamepadIndex);
    return true;
  }

  // Unbind a player
  unbindPlayer(playerId) {
    this.playerBindings.delete(playerId);
  }

  // Get actions for a player
  getActions(playerId) {
    const gamepadIndex = this.playerBindings.get(playerId);
    if (gamepadIndex === undefined) return null;
    
    return this.getGamepadActions(gamepadIndex);
  }

  getGamepadActions(gamepadIndex) {
    const pad = this.gamepadManager.getGamepad(gamepadIndex);
    if (!pad || !pad.connected) return null;

    // Get analog stick
    const leftStickX = pad.axes[0] || 0;
    
    // D-Pad mapping (for menu navigation)
    let dPadX = 0;
    if (pad.buttons.length > 15) {
      if (pad.buttons[DPAD.RIGHT]?.pressed) dPadX = 1;
      else if (pad.buttons[DPAD.LEFT]?.pressed) dPadX = -1;
    }
    
    // Use D-Pad if stick is not active
    const moveX = Math.abs(leftStickX) > DEADZONE ? leftStickX : dPadX;
    
    // Normalize axis
    const axisX = Math.abs(moveX) < DEADZONE ? 0 : moveX;
    
    // Button states
    const button0Pressed = pad.buttons[GAMEPAD_BUTTONS.JUMP]?.pressed || false;
    const button2Pressed = pad.buttons[GAMEPAD_BUTTONS.SHOOT]?.pressed || false;
    const button9Pressed = pad.buttons[GAMEPAD_BUTTONS.PAUSE]?.pressed || false;
    
    // Track button states for single-frame detection
    const key = `pad${gamepadIndex}`;
    const lastState = this.lastButtonStates.get(key) || {};
    
    // Single-frame press detection (only true on transition from not pressed to pressed)
    const jumpPressed = button0Pressed && !lastState[GAMEPAD_BUTTONS.JUMP];
    const shootPressed = button2Pressed && !lastState[GAMEPAD_BUTTONS.SHOOT];
    const pausePressed = button9Pressed && !lastState[GAMEPAD_BUTTONS.PAUSE];
    
    // Update last button states
    this.lastButtonStates.set(key, {
      [GAMEPAD_BUTTONS.JUMP]: button0Pressed,
      [GAMEPAD_BUTTONS.SHOOT]: button2Pressed,
      [GAMEPAD_BUTTONS.PAUSE]: button9Pressed
    });
    
    return {
      left: axisX < -DEADZONE,
      right: axisX > DEADZONE,
      jump: jumpPressed,
      shoot: shootPressed,
      pause: pausePressed,
      axisX
    };
  }

  getConnectedCount() {
    return this.gamepadManager.getConnectedCount();
  }

  getAllGamepads() {
    return this.gamepadManager.getAllGamepads();
  }
}

