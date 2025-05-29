export interface DeltaState {
  players?: {
    [playerId: string]: {
      x?: number
      y?: number
      angle?: number
      health?: number
      score?: number
    }
  }
  bullets?: {
    added?: any[]
    removed?: number[]
    updated?: {
      [bulletId: string]: {
        x?: number
        y?: number
      }
    }
  }
  powerUps?: {
    added?: any[]
    removed?: string[]
  }
  playersJoined?: any[]
  playersLeft?: string[]
}

export class DeltaCompressor {
  private previousState: any = {}
  private playerSnapshots: Map<string, any> = new Map()

  constructor() {
    this.reset()
  }

  reset(): void {
    this.previousState = {
      players: {},
      bullets: {},
      powerUps: {}
    }
    this.playerSnapshots.clear()
  }

  compressGameState(currentState: any): DeltaState {
    const delta: DeltaState = {}

    // Process player changes
    const playerDeltas: any = {}
    let hasPlayerChanges = false

    for (const playerId in currentState.players) {
      const currentPlayer = currentState.players[playerId]
      const previousPlayer = this.previousState.players[playerId]

      if (!previousPlayer) {
        // New player
        if (!delta.playersJoined) delta.playersJoined = []
        delta.playersJoined.push(currentPlayer)
        hasPlayerChanges = true
      } else {
        // Check for changes
        const playerDelta: any = {}
        let hasChanges = false

        if (Math.abs(currentPlayer.x - previousPlayer.x) > 0.1) {
          playerDelta.x = currentPlayer.x
          hasChanges = true
        }
        if (Math.abs(currentPlayer.y - previousPlayer.y) > 0.1) {
          playerDelta.y = currentPlayer.y
          hasChanges = true
        }
        if (Math.abs(currentPlayer.angle - previousPlayer.angle) > 0.01) {
          playerDelta.angle = currentPlayer.angle
          hasChanges = true
        }
        if (currentPlayer.health !== previousPlayer.health) {
          playerDelta.health = currentPlayer.health
          hasChanges = true
        }
        if (currentPlayer.score !== previousPlayer.score) {
          playerDelta.score = currentPlayer.score
          hasChanges = true
        }

        if (hasChanges) {
          playerDeltas[playerId] = playerDelta
          hasPlayerChanges = true
        }
      }
    }

    // Check for removed players
    for (const playerId in this.previousState.players) {
      if (!currentState.players[playerId]) {
        if (!delta.playersLeft) delta.playersLeft = []
        delta.playersLeft.push(playerId)
        hasPlayerChanges = true
      }
    }

    if (hasPlayerChanges && Object.keys(playerDeltas).length > 0) {
      delta.players = playerDeltas
    }

    // Process bullet changes
    const bulletDeltas: any = {}
    const addedBullets: any[] = []
    const removedBullets: number[] = []
    const updatedBullets: any = {}

    // Find new and updated bullets
    for (const bulletId in currentState.bullets) {
      const currentBullet = currentState.bullets[bulletId]
      const previousBullet = this.previousState.bullets[bulletId]

      if (!previousBullet) {
        addedBullets.push(currentBullet)
      } else {
        // Only send position updates for bullets
        const bulletDelta: any = {}
        if (Math.abs(currentBullet.x - previousBullet.x) > 0.1 ||
            Math.abs(currentBullet.y - previousBullet.y) > 0.1) {
          bulletDelta.x = currentBullet.x
          bulletDelta.y = currentBullet.y
          updatedBullets[bulletId] = bulletDelta
        }
      }
    }

    // Find removed bullets
    for (const bulletId in this.previousState.bullets) {
      if (!currentState.bullets[bulletId]) {
        removedBullets.push(parseInt(bulletId))
      }
    }

    if (addedBullets.length > 0 || removedBullets.length > 0 || Object.keys(updatedBullets).length > 0) {
      delta.bullets = {}
      if (addedBullets.length > 0) delta.bullets.added = addedBullets
      if (removedBullets.length > 0) delta.bullets.removed = removedBullets
      if (Object.keys(updatedBullets).length > 0) delta.bullets.updated = updatedBullets
    }

    // Process power-up changes
    const addedPowerUps: any[] = []
    const removedPowerUps: string[] = []

    // Find new power-ups
    for (const powerUpId in currentState.powerUps) {
      if (!this.previousState.powerUps[powerUpId]) {
        addedPowerUps.push(currentState.powerUps[powerUpId])
      }
    }

    // Find removed power-ups
    for (const powerUpId in this.previousState.powerUps) {
      if (!currentState.powerUps[powerUpId]) {
        removedPowerUps.push(powerUpId)
      }
    }

    if (addedPowerUps.length > 0 || removedPowerUps.length > 0) {
      delta.powerUps = {}
      if (addedPowerUps.length > 0) delta.powerUps.added = addedPowerUps
      if (removedPowerUps.length > 0) delta.powerUps.removed = removedPowerUps
    }

    // Update previous state
    this.previousState = JSON.parse(JSON.stringify(currentState))

    return delta
  }

  // Create snapshot for specific player (for reconnection)
  createPlayerSnapshot(playerId: string, gameState: any): any {
    const snapshot = {
      players: gameState.players,
      bullets: gameState.bullets,
      powerUps: gameState.powerUps,
      obstacles: gameState.obstacles,
      arena: gameState.arena
    }
    this.playerSnapshots.set(playerId, snapshot)
    return snapshot
  }

  getPlayerSnapshot(playerId: string): any {
    return this.playerSnapshots.get(playerId)
  }

  removePlayerSnapshot(playerId: string): void {
    this.playerSnapshots.delete(playerId)
  }
}