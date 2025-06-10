export interface FloatingText {
  x: number
  y: number
  vx: number
  vy: number
  text: string
  color: string
  fontSize: number
  life: number
  maxLife: number
  alpha: number
  scale: number
  type: 'damage' | 'heal' | 'kill' | 'notification'
}

export class FloatingTextSystem {
  private texts: FloatingText[] = []
  private maxTexts: number = 50

  update(deltaTime: number): void {
    for (let i = this.texts.length - 1; i >= 0; i--) {
      const text = this.texts[i]
      
      // Update position
      text.x += text.vx * deltaTime
      text.y += text.vy * deltaTime
      
      // Apply upward drift
      text.vy -= 50 * deltaTime
      
      // Update life
      text.life -= deltaTime
      
      // Update alpha and scale based on life
      const lifeRatio = text.life / text.maxLife
      text.alpha = lifeRatio
      
      // Scale animation
      if (lifeRatio > 0.8) {
        // Growing phase
        text.scale = 1 + (1 - lifeRatio) * 2
      } else {
        // Shrinking phase
        text.scale = lifeRatio * 1.2
      }
      
      // Remove expired texts
      if (text.life <= 0) {
        this.texts.splice(i, 1)
      }
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.save()
    
    for (const text of this.texts) {
      ctx.globalAlpha = text.alpha
      ctx.fillStyle = text.color
      ctx.strokeStyle = '#000000'
      ctx.lineWidth = 2
      ctx.font = `bold ${Math.floor(text.fontSize * text.scale)}px Arial`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      
      // Draw text outline
      ctx.strokeText(text.text, text.x, text.y)
      // Draw text fill
      ctx.fillText(text.text, text.x, text.y)
    }
    
    ctx.restore()
  }

  // Damage numbers
  createDamageNumber(x: number, y: number, damage: number): void {
    this.addText({
      x: x + (Math.random() - 0.5) * 20,
      y: y - 10,
      vx: (Math.random() - 0.5) * 50,
      vy: -80,
      text: `-${damage}`,
      color: '#ff4444',
      fontSize: 16,
      life: 1.5,
      maxLife: 1.5,
      alpha: 1,
      scale: 1,
      type: 'damage'
    })
  }

  // Healing numbers
  createHealNumber(x: number, y: number, heal: number): void {
    this.addText({
      x: x + (Math.random() - 0.5) * 20,
      y: y - 10,
      vx: (Math.random() - 0.5) * 50,
      vy: -80,
      text: `+${heal}`,
      color: '#44ff44',
      fontSize: 16,
      life: 1.5,
      maxLife: 1.5,
      alpha: 1,
      scale: 1,
      type: 'heal'
    })
  }

  // Kill notification
  createKillNotification(x: number, y: number, killerName: string, victimName: string): void {
    this.addText({
      x,
      y: y - 30,
      vx: 0,
      vy: -60,
      text: `${killerName} eliminated ${victimName}`,
      color: '#ffff00',
      fontSize: 14,
      life: 3.0,
      maxLife: 3.0,
      alpha: 1,
      scale: 1,
      type: 'kill'
    })
  }

  // Generic notification
  createNotification(x: number, y: number, message: string, color: string = '#ffffff'): void {
    this.addText({
      x,
      y,
      vx: 0,
      vy: -100,
      text: message,
      color,
      fontSize: 18,
      life: 2.0,
      maxLife: 2.0,
      alpha: 1,
      scale: 1,
      type: 'notification'
    })
  }

  // Powerup pickup notification
  createPowerupNotification(x: number, y: number, powerupType: string): void {
    const messages = {
      speed: 'Speed Boost!',
      damage: 'Damage Up!',
      health: 'Health Restored!',
      shield: 'Shield Activated!',
      rapid: 'Rapid Fire!'
    }
    
    const colors = {
      speed: '#00ffff',
      damage: '#ff6600',
      health: '#00ff00',
      shield: '#0066ff',
      rapid: '#ff00ff'
    }
    
    this.createNotification(
      x, 
      y, 
      messages[powerupType as keyof typeof messages] || 'Power Up!',
      colors[powerupType as keyof typeof colors] || '#ffffff'
    )
  }

  // Critical hit effect
  createCriticalHit(x: number, y: number, damage: number): void {
    this.addText({
      x: x + (Math.random() - 0.5) * 30,
      y: y - 20,
      vx: (Math.random() - 0.5) * 100,
      vy: -120,
      text: `CRIT! -${damage}`,
      color: '#ff0066',
      fontSize: 20,
      life: 2.0,
      maxLife: 2.0,
      alpha: 1,
      scale: 1,
      type: 'damage'
    })
  }

  // Multi-kill notification
  createMultiKill(x: number, y: number, killCount: number): void {
    const messages = [
      '', // 0 kills
      '', // 1 kill
      'Double Kill!',
      'Triple Kill!',
      'Multi Kill!',
      'Rampage!',
      'Unstoppable!',
      'Legendary!'
    ]
    
    const message = messages[Math.min(killCount, messages.length - 1)]
    if (message) {
      this.addText({
        x,
        y: y - 40,
        vx: 0,
        vy: -80,
        text: message,
        color: '#ff9900',
        fontSize: 24,
        life: 3.0,
        maxLife: 3.0,
        alpha: 1,
        scale: 1,
        type: 'notification'
      })
    }
  }

  private addText(text: FloatingText): void {
    if (this.texts.length < this.maxTexts) {
      this.texts.push(text)
    }
  }

  clear(): void {
    this.texts = []
  }

  getTextCount(): number {
    return this.texts.length
  }
}