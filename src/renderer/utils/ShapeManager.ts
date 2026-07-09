

class ShapeManager {
  private shapeList: string[] = [];
  private pathCache: Map<string, Path2D> = new Map();
  private stringCache: Map<string, string> = new Map();
  private pointCache: Map<string, {x: number, y: number}[]> = new Map();
  private initialized = false;

  public async init(): Promise<void> {
    if (this.initialized) return;
    try {
      const response = await window.astrolabeAPI?.listShapesDirectory();
      if (response?.success && response.data) {
        this.shapeList = response.data;
        // Preload all shapes into cache
        await Promise.all(this.shapeList.map(shape => this.loadAndCacheShape(shape)));
      }
      this.initialized = true;
    } catch (e) {
      console.error('Failed to initialize ShapeManager', e);
    }
  }

  public getAvailableShapes(): string[] {
    return this.shapeList;
  }

  public getCachedPath(shapeName: string): Path2D | null {
    if (!shapeName) return null;
    return this.pathCache.get(shapeName) || null;
  }

  public getSampledPoints(shapeName: string, detailLevel: number): {x: number, y: number}[] | null {
    if (!shapeName) return null;
    const cacheKey = `${shapeName}_${detailLevel}`;
    if (this.pointCache.has(cacheKey)) return this.pointCache.get(cacheKey)!;

    const pathData = this.stringCache.get(shapeName);
    if (!pathData) return null;

    try {
      const pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      pathEl.setAttribute('d', pathData);
      const totalLength = pathEl.getTotalLength();
      
      const points: {x: number, y: number}[] = [];
      const steps = Math.max(2, detailLevel);
      const stepLength = totalLength / steps;
      
      for (let i = 0; i <= steps; i++) {
        const pt = pathEl.getPointAtLength(i * stepLength);
        points.push({ x: pt.x, y: pt.y });
      }
      
      this.pointCache.set(cacheKey, points);
      return points;
    } catch (e) {
      console.error(`Failed to sample points for shape: ${shapeName}`, e);
      return null;
    }
  }

  private async loadAndCacheShape(shapeName: string): Promise<Path2D | null> {
    if (this.pathCache.has(shapeName)) return this.pathCache.get(shapeName)!;

    try {
      const response = await window.astrolabeAPI?.loadShape(shapeName);
      if (response?.success && response.data) {
        const svgContent = response.data;
        const match = svgContent.match(/<path[^>]*d="([^"]+)"/i);
        if (match && match[1]) {
          const pathData = match[1];
          this.stringCache.set(shapeName, pathData);
          const path2d = new Path2D(pathData);
          this.pathCache.set(shapeName, path2d);
          return path2d;
        }
      }
    } catch (e) {
      console.error(`Failed to load shape: ${shapeName}`, e);
    }
    return null;
  }
}

export const shapeManager = new ShapeManager();
