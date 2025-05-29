export class ObjectPool<T> {
  private pool: T[] = []
  private createFn: () => T
  private resetFn: (obj: T) => void
  private maxSize: number

  constructor(
    createFn: () => T,
    resetFn: (obj: T) => void,
    initialSize: number = 10,
    maxSize: number = 100
  ) {
    this.createFn = createFn
    this.resetFn = resetFn
    this.maxSize = maxSize

    // Pre-allocate initial objects
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(createFn())
    }
  }

  acquire(): T {
    if (this.pool.length > 0) {
      return this.pool.pop()!
    }
    return this.createFn()
  }

  release(obj: T): void {
    if (this.pool.length < this.maxSize) {
      this.resetFn(obj)
      this.pool.push(obj)
    }
  }

  clear(): void {
    this.pool = []
  }

  getStats(): { available: number; maxSize: number } {
    return {
      available: this.pool.length,
      maxSize: this.maxSize
    }
  }
}

// Bullet-specific pool implementation
export interface PooledBullet {
  id: number
  playerId: string
  x: number
  y: number
  vx: number
  vy: number
  damage: number
  active: boolean
}

export class BulletPool extends ObjectPool<PooledBullet> {
  private nextId: number = 0

  constructor(initialSize: number = 50, maxSize: number = 200) {
    super(
      // Create function
      () => ({
        id: 0,
        playerId: '',
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        damage: 0,
        active: false
      }),
      // Reset function
      (bullet) => {
        bullet.active = false
        bullet.playerId = ''
        bullet.x = 0
        bullet.y = 0
        bullet.vx = 0
        bullet.vy = 0
        bullet.damage = 0
      },
      initialSize,
      maxSize
    )
  }

  createBullet(
    playerId: string,
    x: number,
    y: number,
    vx: number,
    vy: number,
    damage: number
  ): PooledBullet {
    const bullet = this.acquire()
    bullet.id = this.nextId++
    bullet.playerId = playerId
    bullet.x = x
    bullet.y = y
    bullet.vx = vx
    bullet.vy = vy
    bullet.damage = damage
    bullet.active = true
    return bullet
  }

  releaseBullet(bullet: PooledBullet): void {
    this.release(bullet)
  }
}