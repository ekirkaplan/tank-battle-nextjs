export enum PowerUpType {
  HEALTH = 'health',
  SPEED = 'speed',
  DAMAGE = 'damage',
  RAPID_FIRE = 'rapid_fire',
  SHIELD = 'shield'
}

export interface PowerUp {
  id: string
  type: PowerUpType
  x: number
  y: number
  radius: number
  duration: number // in milliseconds
  value: number
  respawnTime: number
  createdAt: number
}

export interface PowerUpEffect {
  type: PowerUpType
  value: number
  duration: number
  startTime: number
}

export class PowerUpManager {
  private powerUps: Map<string, PowerUp> = new Map()
  private nextId: number = 0
  private spawnPoints: Array<{ x: number; y: number }> = []
  private lastSpawnTime: number = Date.now()
  private spawnInterval: number = 5000 // 5 seconds

  constructor(arenaWidth: number, arenaHeight: number) {
    // Create spawn points in a grid pattern for large map
    const gridSize = 500
    for (let x = gridSize; x < arenaWidth - gridSize; x += gridSize) {
      for (let y = gridSize; y < arenaHeight - gridSize; y += gridSize) {
        this.spawnPoints.push({ x, y })
      }
    }
    console.log(`PowerUpManager initialized with ${this.spawnPoints.length} spawn points`)
  }

  update(currentTime: number): PowerUp[] {
    // Check if it's time to spawn a new power-up
    if (currentTime - this.lastSpawnTime >= this.spawnInterval && this.powerUps.size < 20) {
      this.spawnRandomPowerUp(currentTime)
      this.lastSpawnTime = currentTime
    }

    // Remove expired power-ups
    const expired: string[] = []
    for (const [id, powerUp] of this.powerUps) {
      if (currentTime - powerUp.createdAt > powerUp.respawnTime) {
        expired.push(id)
      }
    }

    expired.forEach(id => this.powerUps.delete(id))

    return Array.from(this.powerUps.values())
  }

  private spawnRandomPowerUp(currentTime: number): void {
    // Select random spawn point
    const spawnPoint = this.spawnPoints[Math.floor(Math.random() * this.spawnPoints.length)]
    
    // Select random power-up type
    const types = Object.values(PowerUpType)
    const type = types[Math.floor(Math.random() * types.length)]

    const powerUp = this.createPowerUp(type, spawnPoint.x, spawnPoint.y, currentTime)
    this.powerUps.set(powerUp.id, powerUp)
  }

  private createPowerUp(type: PowerUpType, x: number, y: number, currentTime: number): PowerUp {
    const configs = {
      [PowerUpType.HEALTH]: { 
        value: 50, 
        duration: 0, // instant
        respawnTime: 30000,
        radius: 20
      },
      [PowerUpType.SPEED]: { 
        value: 2, // 2x speed multiplier
        duration: 10000, // 10 seconds
        respawnTime: 45000,
        radius: 20
      },
      [PowerUpType.DAMAGE]: { 
        value: 2, // 2x damage multiplier
        duration: 15000, // 15 seconds
        respawnTime: 60000,
        radius: 20
      },
      [PowerUpType.RAPID_FIRE]: { 
        value: 0.5, // 0.5x fire cooldown
        duration: 10000, // 10 seconds
        respawnTime: 45000,
        radius: 20
      },
      [PowerUpType.SHIELD]: { 
        value: 0.5, // 50% damage reduction
        duration: 20000, // 20 seconds
        respawnTime: 90000,
        radius: 25
      }
    }

    const config = configs[type]
    
    return {
      id: `powerup_${this.nextId++}`,
      type,
      x,
      y,
      radius: config.radius,
      duration: config.duration,
      value: config.value,
      respawnTime: config.respawnTime,
      createdAt: currentTime
    }
  }

  checkCollision(playerX: number, playerY: number, playerRadius: number = 20): PowerUp | null {
    for (const [id, powerUp] of this.powerUps) {
      const dx = playerX - powerUp.x
      const dy = playerY - powerUp.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      
      if (distance < playerRadius + powerUp.radius) {
        this.powerUps.delete(id)
        return powerUp
      }
    }
    return null
  }

  getPowerUps(): PowerUp[] {
    return Array.from(this.powerUps.values())
  }

  clear(): void {
    this.powerUps.clear()
  }
}

export class PlayerPowerUpManager {
  private effects: Map<PowerUpType, PowerUpEffect> = new Map()

  applyPowerUp(powerUp: PowerUp, currentTime: number): PowerUpEffect | null {
    if (powerUp.duration === 0) {
      // Instant effect (like health)
      return null
    }

    const effect: PowerUpEffect = {
      type: powerUp.type,
      value: powerUp.value,
      duration: powerUp.duration,
      startTime: currentTime
    }

    this.effects.set(powerUp.type, effect)
    return effect
  }

  update(currentTime: number): void {
    // Remove expired effects
    const expired: PowerUpType[] = []
    
    for (const [type, effect] of this.effects) {
      if (currentTime - effect.startTime >= effect.duration) {
        expired.push(type)
      }
    }

    expired.forEach(type => this.effects.delete(type))
  }

  getActiveEffects(): PowerUpEffect[] {
    return Array.from(this.effects.values())
  }

  hasEffect(type: PowerUpType): boolean {
    return this.effects.has(type)
  }

  getEffectValue(type: PowerUpType): number | null {
    const effect = this.effects.get(type)
    return effect ? effect.value : null
  }

  getSpeedMultiplier(): number {
    return this.getEffectValue(PowerUpType.SPEED) || 1
  }

  getDamageMultiplier(): number {
    return this.getEffectValue(PowerUpType.DAMAGE) || 1
  }

  getFireRateMultiplier(): number {
    return this.getEffectValue(PowerUpType.RAPID_FIRE) || 1
  }

  getDamageReduction(): number {
    return this.getEffectValue(PowerUpType.SHIELD) || 0
  }

  clear(): void {
    this.effects.clear()
  }
}