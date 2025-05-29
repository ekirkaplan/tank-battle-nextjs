export interface Obstacle {
  id: string
  x: number
  y: number
  width: number
  height: number
  type: 'wall' | 'box' | 'rock'
  health?: number
  destructible: boolean
  color: string
}

export class ObstacleManager {
  private obstacles: Map<string, Obstacle> = new Map()
  private nextId: number = 0

  constructor(arenaWidth: number, arenaHeight: number) {
    this.generateMap(arenaWidth, arenaHeight)
  }

  private getObstacleColor(type: 'wall' | 'box' | 'rock'): string {
    switch (type) {
      case 'wall':
        return '#4a5568' // Gray wall
      case 'box':
        return '#8b4513' // Brown box
      case 'rock':
        return '#696969' // Dark gray rock
      default:
        return '#808080'
    }
  }

  private generateMap(width: number, height: number): void {
    // Generate border walls
    const wallThickness = 40

    // Top wall
    this.addObstacle({
      x: width / 2,
      y: wallThickness / 2,
      width: width,
      height: wallThickness,
      type: 'wall',
      destructible: false
    })

    // Bottom wall
    this.addObstacle({
      x: width / 2,
      y: height - wallThickness / 2,
      width: width,
      height: wallThickness,
      type: 'wall',
      destructible: false
    })

    // Left wall
    this.addObstacle({
      x: wallThickness / 2,
      y: height / 2,
      width: wallThickness,
      height: height,
      type: 'wall',
      destructible: false
    })

    // Right wall
    this.addObstacle({
      x: width - wallThickness / 2,
      y: height / 2,
      width: wallThickness,
      height: height,
      type: 'wall',
      destructible: false
    })

    // Generate obstacles across the large map
    // Create a grid pattern of obstacles
    const gridSpacingX = 400
    const gridSpacingY = 400
    const startX = 200
    const startY = 200

    // Generate grid of obstacles
    for (let x = startX; x < width - startX; x += gridSpacingX) {
      for (let y = startY; y < height - startY; y += gridSpacingY) {
        // Random obstacle type at each grid point
        const rand = Math.random()
        
        if (rand < 0.3) {
          // Wall segment
          this.addObstacle({
            x: x,
            y: y,
            width: Math.random() > 0.5 ? 200 : 100,
            height: Math.random() > 0.5 ? 40 : 100,
            type: 'wall',
            destructible: false
          })
        } else if (rand < 0.6) {
          // Destructible box
          this.addObstacle({
            x: x + (Math.random() - 0.5) * 100,
            y: y + (Math.random() - 0.5) * 100,
            width: 60 + Math.random() * 40,
            height: 60 + Math.random() * 40,
            type: 'box',
            destructible: true,
            health: 100
          })
        } else if (rand < 0.8) {
          // Rock formation
          this.addObstacle({
            x: x,
            y: y,
            width: 80 + Math.random() * 40,
            height: 80 + Math.random() * 40,
            type: 'rock',
            destructible: false
          })
        }
      }
    }

    // Add some larger structures
    for (let i = 0; i < 20; i++) {
      const x = 300 + Math.random() * (width - 600)
      const y = 300 + Math.random() * (height - 600)
      
      // Large wall structures
      if (Math.random() > 0.5) {
        // Horizontal wall
        this.addObstacle({
          x: x,
          y: y,
          width: 300 + Math.random() * 200,
          height: 40,
          type: 'wall',
          destructible: false
        })
      } else {
        // Vertical wall
        this.addObstacle({
          x: x,
          y: y,
          width: 40,
          height: 300 + Math.random() * 200,
          type: 'wall',
          destructible: false
        })
      }
    }

    // Add clusters of boxes for cover
    for (let i = 0; i < 30; i++) {
      const centerX = 200 + Math.random() * (width - 400)
      const centerY = 200 + Math.random() * (height - 400)
      const boxCount = 3 + Math.floor(Math.random() * 4)
      
      for (let j = 0; j < boxCount; j++) {
        this.addObstacle({
          x: centerX + (Math.random() - 0.5) * 150,
          y: centerY + (Math.random() - 0.5) * 150,
          width: 50 + Math.random() * 30,
          height: 50 + Math.random() * 30,
          type: 'box',
          destructible: true,
          health: 100
        })
      }
    }
  }

  private addObstacle(config: {
    x: number
    y: number
    width: number
    height: number
    type: 'wall' | 'box' | 'rock'
    destructible: boolean
    health?: number
  }): void {
    const obstacle: Obstacle = {
      id: `obstacle_${this.nextId++}`,
      x: config.x,
      y: config.y,
      width: config.width,
      height: config.height,
      type: config.type,
      destructible: config.destructible,
      health: config.health,
      color: this.getObstacleColor(config.type)
    }

    this.obstacles.set(obstacle.id, obstacle)
  }

  checkCollision(x: number, y: number, radius: number): Obstacle | null {
    for (const [id, obstacle] of this.obstacles) {
      // Circle-rectangle collision
      const closestX = Math.max(obstacle.x - obstacle.width / 2, 
                               Math.min(x, obstacle.x + obstacle.width / 2))
      const closestY = Math.max(obstacle.y - obstacle.height / 2, 
                               Math.min(y, obstacle.y + obstacle.height / 2))
      
      const distanceX = x - closestX
      const distanceY = y - closestY
      const distanceSquared = distanceX * distanceX + distanceY * distanceY

      if (distanceSquared < radius * radius) {
        return obstacle
      }
    }
    return null
  }

  checkLineCollision(x1: number, y1: number, x2: number, y2: number): Obstacle | null {
    for (const [id, obstacle] of this.obstacles) {
      if (this.lineRectIntersection(x1, y1, x2, y2, obstacle)) {
        return obstacle
      }
    }
    return null
  }

  private lineRectIntersection(x1: number, y1: number, x2: number, y2: number, rect: Obstacle): boolean {
    const left = rect.x - rect.width / 2
    const right = rect.x + rect.width / 2
    const top = rect.y - rect.height / 2
    const bottom = rect.y + rect.height / 2

    // Check if line intersects any of the four sides
    return this.lineLineIntersection(x1, y1, x2, y2, left, top, right, top) ||
           this.lineLineIntersection(x1, y1, x2, y2, right, top, right, bottom) ||
           this.lineLineIntersection(x1, y1, x2, y2, right, bottom, left, bottom) ||
           this.lineLineIntersection(x1, y1, x2, y2, left, bottom, left, top)
  }

  private lineLineIntersection(x1: number, y1: number, x2: number, y2: number,
                               x3: number, y3: number, x4: number, y4: number): boolean {
    const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4)
    if (Math.abs(denom) < 0.0001) return false

    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom

    return t >= 0 && t <= 1 && u >= 0 && u <= 1
  }

  damageObstacle(id: string, damage: number): boolean {
    const obstacle = this.obstacles.get(id)
    if (!obstacle || !obstacle.destructible || !obstacle.health) return false

    obstacle.health -= damage
    if (obstacle.health <= 0) {
      this.obstacles.delete(id)
      return true // Obstacle destroyed
    }
    return false
  }

  getObstacles(): Obstacle[] {
    return Array.from(this.obstacles.values())
  }

  // Get push-back vector when colliding with obstacle
  getPushbackVector(x: number, y: number, radius: number, obstacle: Obstacle): { x: number, y: number } {
    const left = obstacle.x - obstacle.width / 2
    const right = obstacle.x + obstacle.width / 2
    const top = obstacle.y - obstacle.height / 2
    const bottom = obstacle.y + obstacle.height / 2

    const closestX = Math.max(left, Math.min(x, right))
    const closestY = Math.max(top, Math.min(y, bottom))

    const dx = x - closestX
    const dy = y - closestY
    const distance = Math.sqrt(dx * dx + dy * dy)

    if (distance === 0) {
      // Player is inside the obstacle, push out based on center
      const centerDx = x - obstacle.x
      const centerDy = y - obstacle.y
      const centerDist = Math.sqrt(centerDx * centerDx + centerDy * centerDy)
      
      return {
        x: (centerDx / centerDist) * radius,
        y: (centerDy / centerDist) * radius
      }
    }

    const overlap = radius - distance
    return {
      x: (dx / distance) * overlap,
      y: (dy / distance) * overlap
    }
  }
}