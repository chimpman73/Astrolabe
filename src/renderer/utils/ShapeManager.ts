import { ConstellationData } from './constellation/ConstellationStrategy';
import { OutlineStrategy } from './constellation/OutlineStrategy';
import { InternalGeometricStrategy } from './constellation/InternalGeometricStrategy';

class ShapeManager {
  private shapeList: string[] = [];
  private pathCache: Map<string, Path2D> = new Map();
  private stringCache: Map<string, string> = new Map();
  private graphCache: Map<string, ConstellationData> = new Map();
  private skeletonCache: Map<string, Record<number, ConstellationData>> = new Map();
  private boundsCache: Map<string, {x: number, y: number, w: number, h: number}> = new Map();
  private outlineStrategy = new OutlineStrategy();
  private internalStrategy = new InternalGeometricStrategy();
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

  public getCachedBounds(shapeName: string): {x: number, y: number, w: number, h: number} | null {
    if (!shapeName) return null;
    return this.boundsCache.get(shapeName) || null;
  }

  public getConstellationData(
    shapeName: string, 
    style: 'outline' | 'internal', 
    detailLevel: number,
    seed: string
  ): ConstellationData | null {
    if (!shapeName) return null;
    const cacheKey = `${shapeName}_${style}_${detailLevel}_${seed}`;
    if (this.graphCache.has(cacheKey)) return this.graphCache.get(cacheKey)!;

    const pathData = this.stringCache.get(shapeName);
    const path2d = this.pathCache.get(shapeName);
    if (!pathData || !path2d) return null;

    try {
      let data: ConstellationData | null = null;
      if (style === 'internal') {
        const skeletons = this.skeletonCache.get(shapeName);
        if (skeletons) {
          // Find the closest LOD to the requested detailLevel
          const availableLods = Object.keys(skeletons).map(Number).sort((a,b)=>a-b);
          let bestLod = availableLods[0];
          for (const lod of availableLods) {
            if (detailLevel >= lod) bestLod = lod;
          }
          data = skeletons[bestLod];
        } else {
          // Fallback to runtime generation if no skeleton file exists
          data = this.internalStrategy.generate(pathData, path2d, detailLevel, seed);
        }
      } else {
        data = this.outlineStrategy.generate(pathData, path2d, detailLevel, seed);
      }
      
      if (data) {
        this.graphCache.set(cacheKey, data);
        return data;
      }
      return null;
    } catch (e) {
      console.error(`Failed to generate constellation data for shape: ${shapeName}`, e);
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

          // Try fetching the pre-computed skeleton json
          try {
            const skelResponse = await fetch(`/assets/shapes/${shapeName}_skeleton.json`);
            if (skelResponse.ok) {
              const skelData = await skelResponse.json();
              this.skeletonCache.set(shapeName, skelData);
            }
          } catch (e) {
            // Silently ignore if a shape doesn't have a skeleton file
          }

          // Compute bounding box using SVG DOM
          const svgNamespace = "http://www.w3.org/2000/svg";
          const svgElement = document.createElementNS(svgNamespace, "svg");
          const pathElement = document.createElementNS(svgNamespace, "path");
          pathElement.setAttribute("d", pathData);
          svgElement.appendChild(pathElement);
          svgElement.style.position = 'absolute';
          svgElement.style.visibility = 'hidden';
          svgElement.style.width = '0px';
          svgElement.style.height = '0px';
          document.body.appendChild(svgElement);
          try {
            const bbox = pathElement.getBBox();
            this.boundsCache.set(shapeName, {
              x: bbox.x,
              y: bbox.y,
              w: bbox.width,
              h: bbox.height
            });
          } catch(e) {
            console.warn('Failed to get BBox for', shapeName);
          } finally {
            document.body.removeChild(svgElement);
          }

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
