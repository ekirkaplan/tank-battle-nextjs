import { SpatialGrid } from '../spatial-grid'

describe('SpatialGrid', () => {
  let grid: SpatialGrid

  beforeEach(() => {
    grid = new SpatialGrid(1000, 1000, 100)
  })

  afterEach(() => {
    grid.clear()
  })

  test('should insert and retrieve objects', () => {
    const obj1 = { id: '1', x: 50, y: 50, width: 20, height: 20 }
    const obj2 = { id: '2', x: 150, y: 150, width: 20, height: 20 }

    grid.insert(obj1)
    grid.insert(obj2)

    const nearby1 = grid.getNearbyObjects(obj1)
    const nearby2 = grid.getNearbyObjects(obj2)

    expect(nearby1).toHaveLength(0) // obj2 is too far
    expect(nearby2).toHaveLength(0) // obj1 is too far
  })

  test('should find nearby objects within same cell', () => {
    const obj1 = { id: '1', x: 50, y: 50, width: 20, height: 20 }
    const obj2 = { id: '2', x: 60, y: 60, width: 20, height: 20 }

    grid.insert(obj1)
    grid.insert(obj2)

    const nearby1 = grid.getNearbyObjects(obj1)
    const nearby2 = grid.getNearbyObjects(obj2)

    expect(nearby1).toHaveLength(1)
    expect(nearby1[0].id).toBe('2')
    expect(nearby2).toHaveLength(1)
    expect(nearby2[0].id).toBe('1')
  })

  test('should handle objects spanning multiple cells', () => {
    const largeObj = { id: '1', x: 90, y: 90, width: 100, height: 100 }
    const smallObj = { id: '2', x: 150, y: 150, width: 10, height: 10 }

    grid.insert(largeObj)
    grid.insert(smallObj)

    const nearby = grid.getNearbyObjects(smallObj)
    expect(nearby).toHaveLength(1)
    expect(nearby[0].id).toBe('1')
  })

  test('should update object position correctly', () => {
    const obj1 = { id: '1', x: 50, y: 50, width: 20, height: 20 }
    const obj2 = { id: '2', x: 60, y: 60, width: 20, height: 20 }

    grid.insert(obj1)
    grid.insert(obj2)

    // Move obj1 far away
    const movedObj1 = { ...obj1, x: 500, y: 500 }
    grid.update(movedObj1)

    const nearby2 = grid.getNearbyObjects(obj2)
    expect(nearby2).toHaveLength(0) // obj1 moved away

    const nearbyMoved = grid.getNearbyObjects(movedObj1)
    expect(nearbyMoved).toHaveLength(0) // no objects nearby
  })

  test('should remove objects correctly', () => {
    const obj1 = { id: '1', x: 50, y: 50, width: 20, height: 20 }
    const obj2 = { id: '2', x: 60, y: 60, width: 20, height: 20 }

    grid.insert(obj1)
    grid.insert(obj2)

    grid.remove('1')

    const nearby2 = grid.getNearbyObjects(obj2)
    expect(nearby2).toHaveLength(0) // obj1 was removed

    const debug = grid.debug()
    expect(debug.totalObjects).toBe(1)
  })

  test('should handle edge cases at world boundaries', () => {
    const obj1 = { id: '1', x: 0, y: 0, width: 20, height: 20 }
    const obj2 = { id: '2', x: 980, y: 980, width: 20, height: 20 }

    grid.insert(obj1)
    grid.insert(obj2)

    const nearby1 = grid.getNearbyObjects(obj1)
    const nearby2 = grid.getNearbyObjects(obj2)

    expect(nearby1).toHaveLength(0)
    expect(nearby2).toHaveLength(0)
  })

  test('performance test with many objects', () => {
    const objects = []
    const numObjects = 1000

    // Insert many objects
    for (let i = 0; i < numObjects; i++) {
      const obj = {
        id: `obj-${i}`,
        x: Math.random() * 1000,
        y: Math.random() * 1000,
        width: 20,
        height: 20
      }
      objects.push(obj)
      grid.insert(obj)
    }

    // Test query performance
    const startTime = performance.now()
    
    for (let i = 0; i < 100; i++) {
      const randomObj = objects[Math.floor(Math.random() * objects.length)]
      grid.getNearbyObjects(randomObj)
    }
    
    const endTime = performance.now()
    const avgQueryTime = (endTime - startTime) / 100

    // Should be much faster than O(n) comparison
    expect(avgQueryTime).toBeLessThan(5) // Less than 5ms per query

    const debug = grid.debug()
    expect(debug.totalObjects).toBe(numObjects)
  })
})