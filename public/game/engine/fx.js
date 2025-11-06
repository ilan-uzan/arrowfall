// Effects System - Particles, Screen Shake, Hit Flash
import { GRAVITY, PALETTE } from './constants.js';

export class FXSystem {
  constructor() {
    this.particles = [];
    this.screenShake = { x: 0, y: 0, duration: 0, intensity: 0 };
    this.hitFlash = 0;
  }

  update(dt) {
    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vy += GRAVITY * dt * 0.3; // Slower gravity
      particle.life -= dt;
      
      if (particle.life <= 0) {
        particle.active = false;
        this.particles.splice(i, 1);
      }
    }

    // Update screen shake
    if (this.screenShake.duration > 0) {
      this.screenShake.duration -= dt;
      if (this.screenShake.duration > 0) {
        this.screenShake.x = (Math.random() - 0.5) * 2 * this.screenShake.intensity;
        this.screenShake.y = (Math.random() - 0.5) * 2 * this.screenShake.intensity;
      } else {
        this.screenShake.x = 0;
        this.screenShake.y = 0;
      }
    }

    // Update hit flash
    if (this.hitFlash > 0) {
      this.hitFlash -= dt;
    }
  }

  createDeathParticles(x, y, color, count = 24) {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count;
      const speed = 50 + Math.random() * 100;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        life: 0.5,
        maxLife: 0.5,
        size: 2 + Math.random() * 2,
        active: true
      });
    }
  }

  triggerScreenShake(intensity = 6, duration = 0.12) {
    this.screenShake.intensity = intensity;
    this.screenShake.duration = duration;
  }

  triggerHitFlash(duration = 0.08) {
    this.hitFlash = duration;
  }

  renderParticles(ctx) {
    for (const particle of this.particles) {
      if (!particle.active) continue;
      
      ctx.fillStyle = particle.color;
      ctx.globalAlpha = particle.life / particle.maxLife;
      ctx.fillRect(
        particle.x - particle.size / 2,
        particle.y - particle.size / 2,
        particle.size,
        particle.size
      );
    }
    ctx.globalAlpha = 1.0;
  }

  renderHitFlash(ctx, width, height) {
    if (this.hitFlash > 0) {
      ctx.fillStyle = PALETTE.accent2;
      ctx.globalAlpha = Math.min(this.hitFlash * 5, 0.15);
      ctx.fillRect(0, 0, width, height);
      ctx.globalAlpha = 1.0;
    }
  }
}

