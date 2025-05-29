export interface GridObject {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export class SpatialGrid {
  private grid: Map<string, Set<string>>;
  private objects: Map<string, GridObject>;
  private cellSize: number;
  private worldWidth: number;
  private worldHeight: number;

  constructor(worldWidth: number, worldHeight: number, cellSize: number = 100) {
    this.worldWidth = worldWidth;
    this.worldHeight = worldHeight;
    this.cellSize = cellSize;
    this.grid = new Map();
    this.objects = new Map();
  }

  private getGridKey(x: number, y: number): string {
    const gridX = Math.floor(x / this.cellSize);
    const gridY = Math.floor(y / this.cellSize);
    return `${gridX},${gridY}`;
  }

  private getObjectCells(obj: GridObject): string[] {
    const cells: string[] = [];
    const startX = Math.floor(obj.x / this.cellSize);
    const startY = Math.floor(obj.y / this.cellSize);
    const endX = Math.floor((obj.x + obj.width) / this.cellSize);
    const endY = Math.floor((obj.y + obj.height) / this.cellSize);

    for (let x = startX; x <= endX; x++) {
      for (let y = startY; y <= endY; y++) {
        cells.push(`${x},${y}`);
      }
    }

    return cells;
  }

  insert(obj: GridObject): void {
    this.objects.set(obj.id, obj);
    const cells = this.getObjectCells(obj);

    for (const cell of cells) {
      if (!this.grid.has(cell)) {
        this.grid.set(cell, new Set());
      }
      this.grid.get(cell)!.add(obj.id);
    }
  }

  remove(id: string): void {
    const obj = this.objects.get(id);
    if (!obj) return;

    const cells = this.getObjectCells(obj);
    for (const cell of cells) {
      const cellSet = this.grid.get(cell);
      if (cellSet) {
        cellSet.delete(id);
        if (cellSet.size === 0) {
          this.grid.delete(cell);
        }
      }
    }

    this.objects.delete(id);
  }

  update(obj: GridObject): void {
    this.remove(obj.id);
    this.insert(obj);
  }

  getNearbyObjects(obj: GridObject): GridObject[] {
    const nearbyIds = new Set<string>();
    const cells = this.getObjectCells(obj);

    for (const cell of cells) {
      const cellObjects = this.grid.get(cell);
      if (cellObjects) {
        cellObjects.forEach(id => {
          if (id !== obj.id) {
            nearbyIds.add(id);
          }
        });
      }
    }

    return Array.from(nearbyIds)
      .map(id => this.objects.get(id)!)
      .filter(Boolean);
  }

  clear(): void {
    this.grid.clear();
    this.objects.clear();
  }

  debug(): { gridInfo: Map<string, number>, totalObjects: number } {
    const gridInfo = new Map<string, number>();
    for (const [cell, objects] of this.grid.entries()) {
      gridInfo.set(cell, objects.size);
    }
    return { gridInfo, totalObjects: this.objects.size };
  }
}