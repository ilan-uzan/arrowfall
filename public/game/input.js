// Input manager that merges keyboard and gamepad input
export class InputManager {
  constructor(gamepadManager) {
    this.gamepadManager = gamepadManager;
    this.keys = {};
    
    // Keyboard event listeners
    window.addEventListener('keydown', (e) => {
      this.keys[e.key.toLowerCase()] = true;
      this.keys[e.code] = true;
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.key.toLowerCase()] = false;
      this.keys[e.code] = false;
    });
  }

  // Get input for player 1 (keyboard)
  getPlayer1Input() {
    return {
      moveX: (this.keys['a'] || this.keys['ArrowLeft'] ? -1 : 0) + 
             (this.keys['d'] || this.keys['ArrowRight'] ? 1 : 0),
      moveY: 0, // Vertical movement not used for keyboard
      jump: this.keys['w'] || this.keys[' '] || this.keys['ArrowUp'],
      shoot: this.keys['f'],
      pickup: this.keys['e'],
      dash: this.keys['Shift'],
      pause: this.keys['Escape'],
      source: 'keyboard'
    };
  }

  // Get input for player 2 (gamepad or keyboard fallback)
  getPlayer2Input() {
    // Try gamepad first
    if (this.gamepadManager.hasGamepad(2)) {
      const gamepadInput = this.gamepadManager.getInput(2);
      if (gamepadInput) {
        return {
          ...gamepadInput,
          source: 'gamepad'
        };
      }
    }

    // Fallback to keyboard
    return {
      moveX: (this.keys['ArrowLeft'] ? -1 : 0) + 
             (this.keys['ArrowRight'] ? 1 : 0),
      moveY: 0,
      jump: this.keys['ArrowUp'],
      shoot: this.keys['/'],
      pickup: this.keys['.'],
      dash: false,
      pause: false,
      source: 'keyboard'
    };
  }

  // Get input for a specific player
  getPlayerInput(playerId) {
    if (playerId === 1) {
      return this.getPlayer1Input();
    } else {
      return this.getPlayer2Input();
    }
  }
}

