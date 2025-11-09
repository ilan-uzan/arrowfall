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
      // Clamp to valid range [-1, 1] to prevent NaN or extreme values
      let leftStickX = (pad.axes[0] !== undefined) ? pad.axes[0] : 0;
      let leftStickY = (pad.axes[1] !== undefined) ? pad.axes[1] : 0;
      
      // Clamp to valid range and handle NaN/Infinity
      leftStickX = isNaN(leftStickX) || !isFinite(leftStickX) ? 0 : Math.max(-1, Math.min(1, leftStickX));
      leftStickY = isNaN(leftStickY) || !isFinite(leftStickY) ? 0 : Math.max(-1, Math.min(1, leftStickY));
      
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
      // Only use stick if it's above deadzone, otherwise use D-Pad
      let moveX = 0;
      let moveY = 0;
      
      if (Math.abs(leftStickX) > DEADZONE) {
        moveX = leftStickX;
      } else if (dPadX !== 0) {
        moveX = dPadX;
      }
      
      if (Math.abs(leftStickY) > DEADZONE) {
        moveY = leftStickY;
      } else if (dPadY !== 0) {
        moveY = dPadY;
      }
      
      // Normalize axis - apply deadzone scaling for smoother control
      let axisX = 0;
      let axisY = 0;
      
      if (Math.abs(moveX) > DEADZONE) {
        // Apply deadzone scaling: map [DEADZONE, 1] to [0, 1]
        const sign = moveX > 0 ? 1 : -1;
        const magnitude = (Math.abs(moveX) - DEADZONE) / (1 - DEADZONE);
        axisX = sign * magnitude;
      }
      
      if (Math.abs(moveY) > DEADZONE) {
        const sign = moveY > 0 ? 1 : -1;
        const magnitude = (Math.abs(moveY) - DEADZONE) / (1 - DEADZONE);
        axisY = sign * magnitude;
      }
      
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
      const leftPressed = axisX < -0.15 && lastAxisX >= -0.15;
      const rightPressed = axisX > 0.15 && lastAxisX <= 0.15;
      const upPressed = axisY < -0.15 && lastAxisY >= -0.15;
      const downPressed = axisY > 0.15 && lastAxisY <= 0.15;
      
      // Update last button states
      this.lastButtonStates.set(key, {
        [GAMEPAD_BUTTONS.JUMP]: button0Pressed,
        [GAMEPAD_BUTTONS.SHOOT]: button2Pressed,
        [GAMEPAD_BUTTONS.PAUSE]: button9Pressed,
        axisX: axisX,
        axisY: axisY
      });
      
      // Only set left/right if axisX is significant (above deadzone threshold)
      // This prevents false positives from small axis values
      // Use strict threshold to prevent drift
      const left = axisX < -0.2;
      const right = axisX > 0.2;
      const up = axisY < -0.2;
      const down = axisY > 0.2;
      
      return {
        left: left,
        right: right,
        up: up,
        down: down,
        leftPressed: leftPressed,
        rightPressed: rightPressed,
        upPressed: upPressed,
        downPressed: downPressed,
        jump: jumpPressed, // Single-frame press (for menu navigation)
        jumpHeld: button0Pressed, // Raw button state (for continuous jumping)
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

