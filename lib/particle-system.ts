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
  rotation?: number
  rotationSpeed?: number
  trail?: Array<{x: number, y: number}>
  type?: 'circle' | 'square' | 'trail' | 'spark'
}

export class ParticleSystem {
  private particles: Particle[] = []
  private maxParticles: number = 500

  update(deltaTime: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i]
      
      // Store previous position for trail
      if (particle.trail) {
        particle.trail.push({x: particle.x, y: particle.y})
        if (particle.trail.length > 10) {
          particle.trail.shift()
        }
      }
      
      // Update position
      particle.x += particle.vx * deltaTime
      particle.y += particle.vy * deltaTime
      
      // Apply gravity
      particle.vy += particle.gravity * deltaTime
      
      // Update rotation
      if (particle.rotation !== undefined && particle.rotationSpeed !== undefined) {
        particle.rotation += particle.rotationSpeed * deltaTime
      }
      
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
      
      // Render trail first if exists
      if (particle.trail && particle.trail.length > 1) {
        ctx.strokeStyle = particle.color
        ctx.lineWidth = particle.size * 0.5
        ctx.beginPath()
        ctx.moveTo(particle.trail[0].x, particle.trail[0].y)
        for (let i = 1; i < particle.trail.length; i++) {
          ctx.lineTo(particle.trail[i].x, particle.trail[i].y)
        }
        ctx.stroke()
      }
      
      ctx.save()
      ctx.translate(particle.x, particle.y)
      
      if (particle.rotation !== undefined) {
        ctx.rotate(particle.rotation)
      }
      
      ctx.beginPath()
      
      switch (particle.type) {
        case 'square':
          ctx.rect(-particle.size/2, -particle.size/2, particle.size, particle.size)
          break
        case 'spark':
          ctx.rect(-particle.size/2, -particle.size/4, particle.size, particle.size/2)
          break
        case 'trail':
          // Rendered above
          break
        default: // circle
          ctx.arc(0, 0, particle.size, 0, Math.PI * 2)
          break
      }
      
      ctx.fill()
      ctx.restore()
    }
    
    ctx.restore()
  }

  // Enhanced tank explosion effect
  createExplosion(x: number, y: number, size: 'small' | 'medium' | 'large' = 'medium'): void {
    const configs = {
      small: { particles: 20, maxSpeed: 120, maxSize: 3, life: 0.6 },
      medium: { particles: 40, maxSpeed: 180, maxSize: 5, life: 1.0 },
      large: { particles: 60, maxSpeed: 250, maxSize: 8, life: 1.5 }
    }
    
    const config = configs[size]
    
    // Fire particles
    for (let i = 0; i < config.particles; i++) {
      const angle = (Math.PI * 2 * i) / config.particles + Math.random() * 0.5
      const speed = 50 + Math.random() * config.maxSpeed
      
      this.addParticle({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: config.life * (0.7 + Math.random() * 0.3),
        maxLife: config.life,
        size: 2 + Math.random() * config.maxSize,
        color: this.getExplosionColor(),
        alpha: 1,
        shrink: true,
        gravity: 150,
        type: 'circle'
      })
    }
    
    // Debris particles (squares)
    for (let i = 0; i < config.particles / 3; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = 80 + Math.random() * 120
      
      this.addParticle({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: config.life * (0.8 + Math.random() * 0.4),
        maxLife: config.life * 1.2,
        size: 2 + Math.random() * 3,
        color: '#8B4513',
        alpha: 1,
        shrink: false,
        gravity: 300,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 10,
        type: 'square'
      })
    }
    
    // Smoke particles
    for (let i = 0; i < config.particles / 2; i++) {
      this.addParticle({
        x: x + (Math.random() - 0.5) * 30,
        y: y + (Math.random() - 0.5) * 30,
        vx: (Math.random() - 0.5) * 60,
        vy: -70 - Math.random() * 80,
        life: config.life * (1.2 + Math.random() * 0.8),
        maxLife: config.life * 2,
        size: 6 + Math.random() * 8,
        color: this.getSmokeColor(),
        alpha: 0.6,
        shrink: false,
        gravity: -30,
        type: 'circle'
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

  // Damage sparks effect (enhanced)
  createSparks(x: number, y: number, angle?: number): void {
    const particleCount = 8
    
    for (let i = 0; i < particleCount; i++) {
      const sparkAngle = angle !== undefined 
        ? angle + Math.PI + (Math.random() - 0.5) * Math.PI / 3
        : Math.random() * Math.PI * 2
      const speed = 120 + Math.random() * 150
      
      this.addParticle({
        x,
        y,
        vx: Math.cos(sparkAngle) * speed,
        vy: Math.sin(sparkAngle) * speed,
        life: 0.3 + Math.random() * 0.3,
        maxLife: 0.6,
        size: 1 + Math.random() * 2,
        color: Math.random() > 0.5 ? '#ffff00' : '#ff9900',
        alpha: 1,
        shrink: true,
        gravity: 400,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 20,
        type: 'spark'
      })
    }
  }

  // Bullet trail effect
  createBulletTrail(x: number, y: number, angle: number): void {
    this.addParticle({
      x,
      y,
      vx: Math.cos(angle) * 50,
      vy: Math.sin(angle) * 50,
      life: 0.2,
      maxLife: 0.2,
      size: 2,
      color: '#ffff99',
      alpha: 0.8,
      shrink: true,
      gravity: 0,
      trail: [],
      type: 'trail'
    })
  }

  // Tank movement dust clouds
  createDustCloud(x: number, y: number, direction: number): void {
    const particleCount = 3
    
    for (let i = 0; i < particleCount; i++) {
      const spread = (Math.random() - 0.5) * Math.PI / 3
      const dustAngle = direction + Math.PI + spread
      const speed = 30 + Math.random() * 40
      
      this.addParticle({
        x: x + (Math.random() - 0.5) * 15,
        y: y + (Math.random() - 0.5) * 15,
        vx: Math.cos(dustAngle) * speed,
        vy: Math.sin(dustAngle) * speed,
        life: 0.8 + Math.random() * 0.4,
        maxLife: 1.2,
        size: 3 + Math.random() * 4,
        color: this.getDustColor(),
        alpha: 0.4,
        shrink: true,
        gravity: 20,
        type: 'circle'
      })
    }
  }

  // Tank tire tracks
  createTireTrack(x: number, y: number): void {
    this.addParticle({
      x,
      y,
      vx: 0,
      vy: 0,
      life: 3.0,
      maxLife: 3.0,
      size: 2,
      color: '#444444',
      alpha: 0.3,
      shrink: false,
      gravity: 0,
      type: 'circle'
    })
  }

  // Enhanced muzzle flash
  createEnhancedMuzzleFlash(x: number, y: number, angle: number): void {
    // Main flash
    for (let i = 0; i < 8; i++) {
      const spread = (Math.random() - 0.5) * 0.4
      const particleAngle = angle + spread
      const speed = 150 + Math.random() * 150
      
      this.addParticle({
        x,
        y,
        vx: Math.cos(particleAngle) * speed,
        vy: Math.sin(particleAngle) * speed,
        life: 0.08 + Math.random() * 0.08,
        maxLife: 0.16,
        size: 3 + Math.random() * 4,
        color: Math.random() > 0.5 ? '#ffff99' : '#ffcc66',
        alpha: 1,
        shrink: true,
        gravity: 0,
        type: 'circle'
      })
    }
    
    // Side flashes
    for (let i = 0; i < 4; i++) {
      const sideAngle = angle + (Math.random() > 0.5 ? Math.PI/2 : -Math.PI/2)
      const speed = 80 + Math.random() * 80
      
      this.addParticle({
        x,
        y,
        vx: Math.cos(sideAngle) * speed,
        vy: Math.sin(sideAngle) * speed,
        life: 0.05 + Math.random() * 0.05,
        maxLife: 0.1,
        size: 2 + Math.random() * 3,
        color: '#ffff00',
        alpha: 0.8,
        shrink: true,
        gravity: 0,
        type: 'circle'
      })
    }
  }

  // Wall impact effect
  createWallImpact(x: number, y: number, angle: number): void {
    // Sparks flying back
    this.createSparks(x, y, angle)
    
    // Dust particles
    for (let i = 0; i < 5; i++) {
      const dustAngle = angle + Math.PI + (Math.random() - 0.5) * Math.PI / 2
      const speed = 60 + Math.random() * 80
      
      this.addParticle({
        x,
        y,
        vx: Math.cos(dustAngle) * speed,
        vy: Math.sin(dustAngle) * speed,
        life: 0.6 + Math.random() * 0.4,
        maxLife: 1.0,
        size: 2 + Math.random() * 3,
        color: '#888888',
        alpha: 0.6,
        shrink: true,
        gravity: 200,
        type: 'circle'
      })
    }
  }

  // Tank damage flash (for UI feedback)
  createDamageFlash(x: number, y: number, size: number): void {
    this.addParticle({
      x,
      y,
      vx: 0,
      vy: 0,
      life: 0.1,
      maxLife: 0.1,
      size: size * 1.5,
      color: '#ff0000',
      alpha: 0.5,
      shrink: false,
      gravity: 0,
      type: 'circle'
    })
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

  private getExplosionColor(): string {
    const colors = ['#ff6600', '#ff9900', '#ffcc00', '#ff3300', '#ff0000', '#ffff00']
    return colors[Math.floor(Math.random() * colors.length)]
  }

  private getSmokeColor(): string {
    const colors = ['#666666', '#888888', '#555555', '#777777', '#999999']
    return colors[Math.floor(Math.random() * colors.length)]
  }

  private getDustColor(): string {
    const colors = ['#D2B48C', '#DDD', '#C4A484', '#E5E5DC', '#F5DEB3']
    return colors[Math.floor(Math.random() * colors.length)]
  }

  clear(): void {
    this.particles = []
  }

  getParticleCount(): number {
    return this.particles.length
  }
}