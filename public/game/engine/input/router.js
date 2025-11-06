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
    try {
      const pad = this.gamepadManager.getGamepad(gamepadIndex);
      if (!pad || !pad.connected) {
        // Gamepad disconnected - unbind player
        for (const [playerId, boundIndex] of this.playerBindings.entries()) {
          if (boundIndex === gamepadIndex) {
            this.unbindPlayer(playerId);
            break;
          }
        }
        return null;
      }

      // Validate axes array exists
      if (!pad.axes || !Array.isArray(pad.axes)) {
        return null;
      }

      // Get analog stick with safe access
      const leftStickX = (pad.axes[0] !== undefined) ? pad.axes[0] : 0;
      const leftStickY = (pad.axes[1] !== undefined) ? pad.axes[1] : 0;
      
      // D-Pad mapping (for menu navigation)
      let dPadX = 0;
      let dPadY = 0;
      
      // Check if D-Pad buttons exist (some gamepads have them as buttons, some as axes)
      if (pad.buttons && Array.isArray(pad.buttons) && pad.buttons.length > 15) {
        const dpadRight = pad.buttons[DPAD.RIGHT];
        const dpadLeft = pad.buttons[DPAD.LEFT];
        const dpadDown = pad.buttons[DPAD.DOWN];
        const dpadUp = pad.buttons[DPAD.UP];
        
        if (dpadRight?.pressed) dPadX = 1;
        else if (dpadLeft?.pressed) dPadX = -1;
        if (dpadDown?.pressed) dPadY = 1;
        else if (dpadUp?.pressed) dPadY = -1;
      }
      
      // Use D-Pad if stick is not active (for menu navigation)
      const moveX = Math.abs(leftStickX) > DEADZONE ? leftStickX : dPadX;
      const moveY = Math.abs(leftStickY) > DEADZONE ? leftStickY : dPadY;
      
      // Normalize axis
      const axisX = Math.abs(moveX) < DEADZONE ? 0 : moveX;
      const axisY = Math.abs(moveY) < DEADZONE ? 0 : moveY;
      
      // Button states with safe access
      const buttons = pad.buttons || [];
      const button0Pressed = (buttons[GAMEPAD_BUTTONS.JUMP]?.pressed) || false;
      const button2Pressed = (buttons[GAMEPAD_BUTTONS.SHOOT]?.pressed) || false;
      const button9Pressed = (buttons[GAMEPAD_BUTTONS.PAUSE]?.pressed) || false;
    
    // Track button states for single-frame detection
    const key = `pad${gamepadIndex}`;
    const lastState = this.lastButtonStates.get(key) || {};
    
    // Single-frame press detection (only true on transition from not pressed to pressed)
    const jumpPressed = button0Pressed && !lastState[GAMEPAD_BUTTONS.JUMP];
    const shootPressed = button2Pressed && !lastState[GAMEPAD_BUTTONS.SHOOT];
    const pausePressed = button9Pressed && !lastState[GAMEPAD_BUTTONS.PAUSE];
    
      // Track axis states for single-frame navigation detection
      const lastAxisX = lastState.axisX || 0;
      const lastAxisY = lastState.axisY || 0;
      const leftPressed = axisX < -DEADZONE && lastAxisX >= -DEADZONE;
      const rightPressed = axisX > DEADZONE && lastAxisX <= DEADZONE;
      const upPressed = axisY < -DEADZONE && lastAxisY >= -DEADZONE;
      const downPressed = axisY > DEADZONE && lastAxisY <= DEADZONE;
      
      // Update last button states
      this.lastButtonStates.set(key, {
        [GAMEPAD_BUTTONS.JUMP]: button0Pressed,
        [GAMEPAD_BUTTONS.SHOOT]: button2Pressed,
        [GAMEPAD_BUTTONS.PAUSE]: button9Pressed,
        axisX: axisX,
        axisY: axisY
      });
      
      return {
        left: axisX < -DEADZONE,
        right: axisX > DEADZONE,
        up: axisY < -DEADZONE,
        down: axisY > DEADZONE,
        leftPressed: leftPressed,
        rightPressed: rightPressed,
        upPressed: upPressed,
        downPressed: downPressed,
        jump: jumpPressed,
        shoot: shootPressed,
        pause: pausePressed,
        axisX: axisX,
        axisY: axisY
      };
    } catch (error) {
      console.error('Error getting gamepad actions:', error);
      return null;
    }
  }

  getConnectedCount() {
    return this.gamepadManager.getConnectedCount();
  }

  getAllGamepads() {
    return this.gamepadManager.getAllGamepads();
  }
}

