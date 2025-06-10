export interface HealthBarState {
  currentHealth: number
  maxHealth: number
  displayHealth: number
  flashTimer: number
  flashIntensity: number
  damageShake: number
  lowHealthPulse: number
  regenGlow: number
}

export class HealthBarEffects {
  private animationSpeed: number = 3 // Health bar animation speed
  private flashDuration: number = 0.3 // Flash duration when taking damage
  private shakeIntensity: number = 5 // Shake intensity when taking damage
  private lowHealthThreshold: number = 0.25 // 25% health for low health effects

  updateHealthBar(
    state: HealthBarState, 
    targetHealth: number, 
    deltaTime: number, 
    isRegenerating: boolean = false
  ): void {
    // Animate health bar to target value
    const healthDiff = targetHealth - state.displayHealth
    if (Math.abs(healthDiff) > 0.1) {
      state.displayHealth += healthDiff * this.animationSpeed * deltaTime
    } else {
      state.displayHealth = targetHealth
    }

    // Update flash timer
    if (state.flashTimer > 0) {
      state.flashTimer -= deltaTime
      state.flashIntensity = state.flashTimer / this.flashDuration
    } else {
      state.flashIntensity = 0
    }

    // Update damage shake
    if (state.damageShake > 0) {
      state.damageShake -= deltaTime * 10
      if (state.damageShake < 0) state.damageShake = 0
    }

    // Low health pulse effect
    const healthRatio = state.currentHealth / state.maxHealth
    if (healthRatio <= this.lowHealthThreshold) {
      state.lowHealthPulse = (Math.sin(Date.now() * 0.008) + 1) * 0.5
    } else {
      state.lowHealthPulse = 0
    }

    // Regeneration glow
    if (isRegenerating) {
      state.regenGlow = (Math.sin(Date.now() * 0.01) + 1) * 0.5
    } else {
      state.regenGlow = Math.max(0, state.regenGlow - deltaTime * 2)
    }
  }

  renderHealthBar(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    state: HealthBarState
  ): void {
    ctx.save()

    // Apply damage shake
    if (state.damageShake > 0) {
      const shakeX = (Math.random() - 0.5) * state.damageShake
      const shakeY = (Math.random() - 0.5) * state.damageShake
      ctx.translate(shakeX, shakeY)
    }

    const healthRatio = state.displayHealth / state.maxHealth
    const fillWidth = width * healthRatio

    // Background
    ctx.fillStyle = '#333333'
    ctx.fillRect(x, y, width, height)

    // Low health warning background
    if (state.lowHealthPulse > 0) {
      ctx.fillStyle = `rgba(255, 0, 0, ${state.lowHealthPulse * 0.3})`
      ctx.fillRect(x - 2, y - 2, width + 4, height + 4)
    }

    // Health fill color based on health percentage
    let healthColor: string
    if (healthRatio > 0.6) {
      healthColor = '#00ff00' // Green
    } else if (healthRatio > 0.3) {
      healthColor = '#ffff00' // Yellow
    } else {
      healthColor = '#ff0000' // Red
    }

    // Add regeneration glow
    if (state.regenGlow > 0) {
      const glowIntensity = state.regenGlow * 0.5
      ctx.shadowColor = '#00ff88'
      ctx.shadowBlur = 10 * glowIntensity
      healthColor = `rgba(0, 255, 136, ${0.8 + glowIntensity * 0.2})`
    }

    // Health fill
    ctx.fillStyle = healthColor
    ctx.fillRect(x, y, fillWidth, height)

    // Damage flash overlay
    if (state.flashIntensity > 0) {
      ctx.fillStyle = `rgba(255, 255, 255, ${state.flashIntensity * 0.6})`
      ctx.fillRect(x, y, width, height)
    }

    // Border
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 1
    ctx.strokeRect(x, y, width, height)

    // Health text
    ctx.fillStyle = '#ffffff'
    ctx.font = '12px Arial'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.shadowColor = 'transparent'
    ctx.shadowBlur = 0
    
    const healthText = `${Math.ceil(state.currentHealth)}/${state.maxHealth}`
    ctx.fillText(healthText, x + width / 2, y + height / 2)

    ctx.restore()
  }

  triggerDamageEffect(state: HealthBarState): void {
    state.flashTimer = this.flashDuration
    state.damageShake = this.shakeIntensity
  }

  renderMiniHealthBar(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    currentHealth: number,
    maxHealth: number,
    showBackground: boolean = true
  ): void {
    ctx.save()

    const healthRatio = currentHealth / maxHealth

    if (showBackground) {
      // Background
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
      ctx.fillRect(x - 1, y - 1, width + 2, height + 2)
    }

    // Health fill color
    let healthColor: string
    if (healthRatio > 0.6) {
      healthColor = '#00ff00'
    } else if (healthRatio > 0.3) {
      healthColor = '#ffff00'
    } else {
      healthColor = '#ff0000'
    }

    // Health fill
    ctx.fillStyle = healthColor
    ctx.fillRect(x, y, width * healthRatio, height)

    // Border
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 1
    ctx.strokeRect(x, y, width, height)

    ctx.restore()
  }

  // Create pulsing effect for critical health
  renderCriticalHealthEffect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    radius: number
  ): void {
    const pulse = (Math.sin(Date.now() * 0.01) + 1) * 0.5
    const alpha = pulse * 0.3
    
    ctx.save()
    ctx.globalAlpha = alpha
    ctx.fillStyle = '#ff0000'
    ctx.beginPath()
    ctx.arc(x, y, radius + pulse * 10, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }

  // Animated health pickup effect
  renderHealthPickupEffect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    progress: number // 0 to 1
  ): void {
    ctx.save()
    
    const scale = 1 + progress * 0.5
    const alpha = 1 - progress
    
    ctx.globalAlpha = alpha
    ctx.translate(x, y)
    ctx.scale(scale, scale)
    
    // Plus sign
    ctx.strokeStyle = '#00ff00'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(-8, 0)
    ctx.lineTo(8, 0)
    ctx.moveTo(0, -8)
    ctx.lineTo(0, 8)
    ctx.stroke()
    
    ctx.restore()
  }
}