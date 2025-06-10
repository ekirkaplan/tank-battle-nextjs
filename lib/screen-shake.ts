export interface ShakeEvent {
  intensity: number
  duration: number
  decay: number
}

export class ScreenShake {
  private shakeX: number = 0
  private shakeY: number = 0
  private intensity: number = 0
  private duration: number = 0
  private decay: number = 0.95
  private active: boolean = false

  update(deltaTime: number): void {
    if (!this.active) return

    // Update shake duration
    this.duration -= deltaTime

    // Calculate shake offset
    if (this.duration > 0 && this.intensity > 0.1) {
      this.shakeX = (Math.random() - 0.5) * this.intensity
      this.shakeY = (Math.random() - 0.5) * this.intensity
      
      // Decay intensity
      this.intensity *= this.decay
    } else {
      // Stop shaking
      this.stop()
    }
  }

  start(intensity: number, duration: number, decay: number = 0.95): void {
    this.intensity = intensity
    this.duration = duration
    this.decay = decay
    this.active = true
  }

  stop(): void {
    this.shakeX = 0
    this.shakeY = 0
    this.intensity = 0
    this.duration = 0
    this.active = false
  }

  // Preset shake effects
  smallExplosion(): void {
    this.start(8, 0.3, 0.9)
  }

  mediumExplosion(): void {
    this.start(15, 0.5, 0.92)
  }

  largeExplosion(): void {
    this.start(25, 0.8, 0.94)
  }

  tankCollision(): void {
    this.start(12, 0.4, 0.88)
  }

  wallHit(): void {
    this.start(6, 0.2, 0.85)
  }

  tankDestroyed(): void {
    this.start(30, 1.0, 0.95)
  }

  getOffset(): { x: number; y: number } {
    return { x: this.shakeX, y: this.shakeY }
  }

  isActive(): boolean {
    return this.active
  }

  getIntensity(): number {
    return this.intensity
  }
}