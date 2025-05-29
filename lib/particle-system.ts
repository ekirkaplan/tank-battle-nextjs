export interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  size: number
  color: string
  alpha: number
  shrink: boolean
  gravity: number
}

export class ParticleSystem {
  private particles: Particle[] = []
  private maxParticles: number = 500

  update(deltaTime: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i]
      
      // Update position
      particle.x += particle.vx * deltaTime
      particle.y += particle.vy * deltaTime
      
      // Apply gravity
      particle.vy += particle.gravity * deltaTime
      
      // Update life
      particle.life -= deltaTime
      
      // Update alpha based on life
      particle.alpha = particle.life / particle.maxLife
      
      // Update size if shrinking
      if (particle.shrink) {
        particle.size *= 0.98
      }
      
      // Remove dead particles
      if (particle.life <= 0 || particle.size < 0.1) {
        this.particles.splice(i, 1)
      }
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.save()
    
    for (const particle of this.particles) {
      ctx.globalAlpha = particle.alpha
      ctx.fillStyle = particle.color
      
      ctx.beginPath()
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
      ctx.fill()
    }
    
    ctx.restore()
  }

  // Tank explosion effect
  createExplosion(x: number, y: number, color: string = '#ff6600'): void {
    const particleCount = 30
    
    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount + Math.random() * 0.5
      const speed = 100 + Math.random() * 150
      
      this.addParticle({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.8 + Math.random() * 0.4,
        maxLife: 1.2,
        size: 3 + Math.random() * 4,
        color: this.randomizeColor(color),
        alpha: 1,
        shrink: true,
        gravity: 100
      })
    }
    
    // Add smoke particles
    for (let i = 0; i < 10; i++) {
      this.addParticle({
        x: x + (Math.random() - 0.5) * 20,
        y: y + (Math.random() - 0.5) * 20,
        vx: (Math.random() - 0.5) * 50,
        vy: -50 - Math.random() * 50,
        life: 1 + Math.random() * 0.5,
        maxLife: 1.5,
        size: 8 + Math.random() * 4,
        color: '#666666',
        alpha: 0.5,
        shrink: false,
        gravity: -20
      })
    }
  }

  // Bullet hit effect
  createBulletHit(x: number, y: number, angle: number): void {
    const particleCount = 8
    
    for (let i = 0; i < particleCount; i++) {
      const spreadAngle = angle + Math.PI + (Math.random() - 0.5) * Math.PI / 2
      const speed = 50 + Math.random() * 100
      
      this.addParticle({
        x,
        y,
        vx: Math.cos(spreadAngle) * speed,
        vy: Math.sin(spreadAngle) * speed,
        life: 0.3 + Math.random() * 0.2,
        maxLife: 0.5,
        size: 1 + Math.random() * 2,
        color: '#ffff00',
        alpha: 1,
        shrink: true,
        gravity: 200
      })
    }
  }

  // Power-up collection effect
  createPowerUpEffect(x: number, y: number, color: string): void {
    const particleCount = 20
    
    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount
      const speed = 50 + Math.random() * 50
      
      this.addParticle({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.6 + Math.random() * 0.3,
        maxLife: 0.9,
        size: 2 + Math.random() * 3,
        color,
        alpha: 1,
        shrink: true,
        gravity: 0
      })
    }
  }

  // Muzzle flash effect
  createMuzzleFlash(x: number, y: number, angle: number): void {
    const particleCount = 5
    
    for (let i = 0; i < particleCount; i++) {
      const spread = (Math.random() - 0.5) * 0.3
      const particleAngle = angle + spread
      const speed = 100 + Math.random() * 100
      
      this.addParticle({
        x,
        y,
        vx: Math.cos(particleAngle) * speed,
        vy: Math.sin(particleAngle) * speed,
        life: 0.1 + Math.random() * 0.1,
        maxLife: 0.2,
        size: 2 + Math.random() * 2,
        color: '#ffff99',
        alpha: 1,
        shrink: true,
        gravity: 0
      })
    }
  }

  // Damage sparks effect
  createSparks(x: number, y: number): void {
    const particleCount = 5
    
    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = 100 + Math.random() * 100
      
      this.addParticle({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.4 + Math.random() * 0.2,
        maxLife: 0.6,
        size: 1 + Math.random() * 2,
        color: Math.random() > 0.5 ? '#ffff00' : '#ff9900',
        alpha: 1,
        shrink: true,
        gravity: 300
      })
    }
  }

  private addParticle(particle: Particle): void {
    if (this.particles.length < this.maxParticles) {
      this.particles.push(particle)
    }
  }

  private randomizeColor(baseColor: string): string {
    // Add slight variations to the color
    const colors = [baseColor, '#ff9900', '#ffcc00', '#ff3300']
    return colors[Math.floor(Math.random() * colors.length)]
  }

  clear(): void {
    this.particles = []
  }

  getParticleCount(): number {
    return this.particles.length
  }
}