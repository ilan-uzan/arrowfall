// Gamepad API Wrapper
export interface GamepadState {
  id: string;
  index: number;
  connected: boolean;
  buttons: readonly GamepadButton[];
  axes: readonly number[];
}

export class GamepadManager {
  private gamepads: (Gamepad | null)[] = [];

  constructor() {
    this.setupListeners();
  }

  private setupListeners() {
    window.addEventListener('gamepadconnected', () => {
      this.updateGamepads();
    });

    window.addEventListener('gamepaddisconnected', () => {
      this.updateGamepads();
    });
  }

  updateGamepads(): void {
    const pads = navigator.getGamepads();
    if (!pads) {
      this.gamepads = [];
      return;
    }
    this.gamepads = Array.from(pads);
  }

  getGamepad(index: number): Gamepad | null {
    this.updateGamepads();
    return this.gamepads[index] || null;
  }

  getAllGamepads(): Gamepad[] {
    this.updateGamepads();
    return this.gamepads.filter((p): p is Gamepad => p !== null);
  }

  getConnectedCount(): number {
    return this.getAllGamepads().length;
  }

  // Request gamepad access (required for some browsers)
  requestAccess(): void {
    if (navigator.getGamepads) {
      navigator.getGamepads();
    }
  }
}

