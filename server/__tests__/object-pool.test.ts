import { ObjectPool, BulletPool } from '../object-pool'

describe('ObjectPool', () => {
  test('should create and reuse objects', () => {
    let createdCount = 0
    let resetCount = 0

    const pool = new ObjectPool<{ id: number; active: boolean }>(
      () => {
        createdCount++
        return { id: createdCount, active: true }
      },
      (obj) => {
        resetCount++
        obj.active = false
      },
      5, // initial size
      10 // max size
    )

    // Initial creation should create 5 objects
    expect(createdCount).toBe(5)

    // Acquire all initial objects
    const objects = []
    for (let i = 0; i < 5; i++) {
      objects.push(pool.acquire())
    }

    // Should not create new objects yet
    expect(createdCount).toBe(5)

    // Acquire one more (should create new)
    const extraObj = pool.acquire()
    expect(createdCount).toBe(6)

    // Release objects back to pool
    for (const obj of objects) {
      pool.release(obj)
    }
    expect(resetCount).toBe(5)

    // Acquire again should reuse
    const reusedObj = pool.acquire()
    expect(createdCount).toBe(6) // No new creation
    expect(reusedObj.active).toBe(false) // Was reset
  })

  test('should respect max size limit', () => {
    const pool = new ObjectPool<number>(
      () => Math.random(),
      () => {},
      0,
      3
    )

    const stats1 = pool.getStats()
    expect(stats1.available).toBe(0)
    expect(stats1.maxSize).toBe(3)

    // Release more than max size
    for (let i = 0; i < 5; i++) {
      pool.release(i)
    }

    const stats2 = pool.getStats()
    expect(stats2.available).toBe(3) // Only kept 3
  })
})

describe('BulletPool', () => {
  let bulletPool: BulletPool

  beforeEach(() => {
    bulletPool = new BulletPool(10, 50)
  })

  test('should create bullets with correct properties', () => {
    const bullet1 = bulletPool.createBullet('player1', 100, 200, 5, -5, 20)
    
    expect(bullet1.id).toBe(0)
    expect(bullet1.playerId).toBe('player1')
    expect(bullet1.x).toBe(100)
    expect(bullet1.y).toBe(200)
    expect(bullet1.vx).toBe(5)
    expect(bullet1.vy).toBe(-5)
    expect(bullet1.damage).toBe(20)
    expect(bullet1.active).toBe(true)

    const bullet2 = bulletPool.createBullet('player2', 150, 250, 10, 0, 25)
    expect(bullet2.id).toBe(1) // Auto-incrementing ID
  })

  test('should reuse released bullets', () => {
    const bullets = []
    
    // Create 10 bullets
    for (let i = 0; i < 10; i++) {
      bullets.push(bulletPool.createBullet(`player${i}`, i * 10, i * 20, 1, 1, 20))
    }

    const stats1 = bulletPool.getStats()
    expect(stats1.available).toBe(0) // All used

    // Release all bullets
    for (const bullet of bullets) {
      bulletPool.releaseBullet(bullet)
    }

    const stats2 = bulletPool.getStats()
    expect(stats2.available).toBe(10) // All returned

    // Create new bullet should reuse
    const reusedBullet = bulletPool.createBullet('newPlayer', 300, 400, 2, 3, 30)
    
    // Should have new ID but reused object
    expect(reusedBullet.id).toBe(10)
    expect(reusedBullet.playerId).toBe('newPlayer')
    expect(reusedBullet.active).toBe(true)

    const stats3 = bulletPool.getStats()
    expect(stats3.available).toBe(9) // One taken from pool
  })

  test('should handle rapid fire scenario', () => {
    const activeBullets = new Map()

    // Simulate rapid fire
    for (let frame = 0; frame < 100; frame++) {
      // Fire new bullets
      if (frame % 5 === 0) {
        const bullet = bulletPool.createBullet('player1', 0, 0, 10, 0, 20)
        activeBullets.set(bullet.id, bullet)
      }

      // Update and remove old bullets
      for (const [id, bullet] of activeBullets) {
        bullet.x += bullet.vx
        
        if (bullet.x > 500) {
          activeBullets.delete(id)
          bulletPool.releaseBullet(bullet)
        }
      }
    }

    const stats = bulletPool.getStats()
    expect(stats.available).toBeGreaterThan(0) // Some bullets returned to pool
    expect(stats.maxSize).toBe(50)
  })
})