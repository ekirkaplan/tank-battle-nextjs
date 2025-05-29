import { DeltaCompressor } from '../delta-compression'

describe('DeltaCompressor', () => {
  let compressor: DeltaCompressor

  beforeEach(() => {
    compressor = new DeltaCompressor()
  })

  test('should detect new players', () => {
    const state1 = {
      players: {},
      bullets: {}
    }

    const state2 = {
      players: {
        'player1': { id: 'player1', x: 100, y: 200, angle: 0, health: 100, score: 0 }
      },
      bullets: {}
    }

    const delta = compressor.compressGameState(state2)

    expect(delta.playersJoined).toBeDefined()
    expect(delta.playersJoined).toHaveLength(1)
    expect(delta.playersJoined![0].id).toBe('player1')
  })

  test('should detect player position changes', () => {
    const state1 = {
      players: {
        'player1': { id: 'player1', x: 100, y: 200, angle: 0, health: 100, score: 0 }
      },
      bullets: {}
    }

    // First compression to set baseline
    compressor.compressGameState(state1)

    const state2 = {
      players: {
        'player1': { id: 'player1', x: 150, y: 250, angle: 0.5, health: 100, score: 0 }
      },
      bullets: {}
    }

    const delta = compressor.compressGameState(state2)

    expect(delta.players).toBeDefined()
    expect(delta.players!['player1']).toBeDefined()
    expect(delta.players!['player1'].x).toBe(150)
    expect(delta.players!['player1'].y).toBe(250)
    expect(delta.players!['player1'].angle).toBe(0.5)
    expect(delta.players!['player1'].health).toBeUndefined() // No change
  })

  test('should detect health and score changes', () => {
    const state1 = {
      players: {
        'player1': { id: 'player1', x: 100, y: 200, angle: 0, health: 100, score: 0 }
      },
      bullets: {}
    }

    compressor.compressGameState(state1)

    const state2 = {
      players: {
        'player1': { id: 'player1', x: 100, y: 200, angle: 0, health: 80, score: 1 }
      },
      bullets: {}
    }

    const delta = compressor.compressGameState(state2)

    expect(delta.players).toBeDefined()
    expect(delta.players!['player1'].health).toBe(80)
    expect(delta.players!['player1'].score).toBe(1)
    expect(delta.players!['player1'].x).toBeUndefined() // No change
  })

  test('should detect removed players', () => {
    const state1 = {
      players: {
        'player1': { id: 'player1', x: 100, y: 200, angle: 0, health: 100, score: 0 },
        'player2': { id: 'player2', x: 300, y: 400, angle: 0, health: 100, score: 0 }
      },
      bullets: {}
    }

    compressor.compressGameState(state1)

    const state2 = {
      players: {
        'player1': { id: 'player1', x: 100, y: 200, angle: 0, health: 100, score: 0 }
      },
      bullets: {}
    }

    const delta = compressor.compressGameState(state2)

    expect(delta.playersLeft).toBeDefined()
    expect(delta.playersLeft).toContain('player2')
  })

  test('should track bullet lifecycle', () => {
    const state1 = {
      players: {},
      bullets: {}
    }

    compressor.compressGameState(state1)

    // Add bullets
    const state2 = {
      players: {},
      bullets: {
        '1': { id: 1, x: 100, y: 100, vx: 10, vy: 0 },
        '2': { id: 2, x: 200, y: 200, vx: 0, vy: 10 }
      }
    }

    const delta1 = compressor.compressGameState(state2)
    expect(delta1.bullets?.added).toHaveLength(2)

    // Update bullet positions
    const state3 = {
      players: {},
      bullets: {
        '1': { id: 1, x: 110, y: 100, vx: 10, vy: 0 },
        '2': { id: 2, x: 200, y: 210, vx: 0, vy: 10 }
      }
    }

    const delta2 = compressor.compressGameState(state3)
    expect(delta2.bullets?.updated).toBeDefined()
    expect(delta2.bullets?.updated!['1'].x).toBe(110)
    expect(delta2.bullets?.updated!['2'].y).toBe(210)

    // Remove one bullet
    const state4 = {
      players: {},
      bullets: {
        '2': { id: 2, x: 200, y: 220, vx: 0, vy: 10 }
      }
    }

    const delta3 = compressor.compressGameState(state4)
    expect(delta3.bullets?.removed).toContain(1)
    expect(delta3.bullets?.updated!['2'].y).toBe(220)
  })

  test('should handle no changes efficiently', () => {
    const state = {
      players: {
        'player1': { id: 'player1', x: 100, y: 200, angle: 0, health: 100, score: 0 }
      },
      bullets: {
        '1': { id: 1, x: 100, y: 100, vx: 10, vy: 0 }
      }
    }

    compressor.compressGameState(state)
    const delta = compressor.compressGameState(state) // Same state

    expect(Object.keys(delta).length).toBe(0) // No changes
  })

  test('should ignore tiny position changes', () => {
    const state1 = {
      players: {
        'player1': { id: 'player1', x: 100, y: 200, angle: 0, health: 100, score: 0 }
      },
      bullets: {}
    }

    compressor.compressGameState(state1)

    const state2 = {
      players: {
        'player1': { id: 'player1', x: 100.05, y: 200.05, angle: 0.005, health: 100, score: 0 }
      },
      bullets: {}
    }

    const delta = compressor.compressGameState(state2)
    
    // Should ignore changes below threshold
    expect(delta.players).toBeUndefined()
  })

  test('should handle player snapshots', () => {
    const gameState = {
      players: {
        'player1': { id: 'player1', x: 100, y: 200, angle: 0, health: 100, score: 0 }
      },
      bullets: {
        '1': { id: 1, x: 100, y: 100, vx: 10, vy: 0 }
      },
      arena: { width: 800, height: 600 }
    }

    const snapshot = compressor.createPlayerSnapshot('player1', gameState)
    
    expect(snapshot).toEqual(gameState)
    expect(compressor.getPlayerSnapshot('player1')).toEqual(gameState)

    compressor.removePlayerSnapshot('player1')
    expect(compressor.getPlayerSnapshot('player1')).toBeUndefined()
  })
})