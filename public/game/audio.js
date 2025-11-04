// Web Audio API - Simple sound effects
export class AudioManager {
  constructor() {
    this.audioContext = null;
    this.enabled = true;
    
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      console.warn('Web Audio API not supported');
      this.enabled = false;
    }
  }

  // Jump: 90ms square, 420→380 Hz
  playJump() {
    if (!this.enabled) return;
    this.playTone(420, 380, 0.09, 'square');
  }

  // Shoot: 120ms triangle, 700→520 Hz
  playShoot() {
    if (!this.enabled) return;
    this.playTone(700, 520, 0.12, 'triangle');
  }

  // Pickup: 150ms square, 600→900 Hz arpeggio
  playPickup() {
    if (!this.enabled) return;
    this.playTone(600, 900, 0.15, 'square');
  }

  // Hit/Death: 220ms noise burst with LPF sweep
  playHit() {
    if (!this.enabled) return;
    this.playNoise(0.22);
  }

  // Menu confirm: 110ms square 500 Hz
  playConfirm() {
    if (!this.enabled) return;
    this.playTone(500, 500, 0.11, 'square');
  }

  playTone(startFreq, endFreq, duration, type = 'square') {
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(startFreq, this.audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(endFreq, this.audioContext.currentTime + duration);
    
    gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
    
    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    oscillator.start();
    oscillator.stop(this.audioContext.currentTime + duration);
  }

  playNoise(duration) {
    const bufferSize = this.audioContext.sampleRate * duration;
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    const noise = this.audioContext.createBufferSource();
    const filter = this.audioContext.createBiquadFilter();
    const gainNode = this.audioContext.createGain();
    
    noise.buffer = buffer;
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2000, this.audioContext.currentTime);
    filter.frequency.exponentialRampToValueAtTime(200, this.audioContext.currentTime + duration);
    
    gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
    
    noise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    noise.start();
    noise.stop(this.audioContext.currentTime + duration);
  }
}

