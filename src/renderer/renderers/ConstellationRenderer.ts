import { BaseRenderer } from './BaseRenderer';
import { RenderContext } from '../../types/renderer';
import { shapeManager } from '../utils/ShapeManager';
import { ScaleManager } from '../utils/ScaleManager';

class PRNG {
  private seed: number;
  constructor(str: string) {
    let h = 0;
    for (let i = 0; i < str.length; i++) h = Math.imul(31, h) + str.charCodeAt(i) | 0;
    this.seed = h;
  }
  next() {
    let t = this.seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}

export class ConstellationRenderer extends BaseRenderer {
  public draw(context: RenderContext): void {
    const { ctx, x, y, size, obj, isBookmarkView, bodyFill } = context;
    
    // Never render constellations in bookmark view
    if (isBookmarkView) {
      return;
    }

    // We uniformly scale the constellation based on its size class ('size').
    // We can also use 'arcDegrees' (Arc Width) as an additional uniform scale multiplier.
    const arcMultiplier = (obj.arcDegrees || 30) / 30;
    
    let scaleX = size * arcMultiplier;
    let scaleY = size * arcMultiplier;

    const shapeName = obj.customShapeName || 'star';
    
    ctx.save();
    ctx.translate(x, y);
    
    const detail = obj.constellationDetail || 10;
    const points = shapeManager.getSampledPoints(shapeName, detail);

    if (!points || points.length === 0) {
      ctx.restore();
      return;
    }

    const w = 100;
    const h = 100;
    const cx = 50;
    const cy = 50;

    const sX = (scaleX * 2) / w;
    const sY = (scaleY * 2) / h;
    
    // 1) Draw the background shape (scaled)
    ctx.save();
    ctx.scale(sX, sY);
    ctx.translate(-cx, -cy);
    const path = shapeManager.getCachedPath(shapeName);
    if (path) {
      ctx.fillStyle = '#000000';
      ctx.globalAlpha = obj.constellationFillAlpha ?? 0.2;
      ctx.fill(path);
      ctx.globalAlpha = 1.0;
    }
    ctx.restore();

    // 2) Draw wireframe and stars using absolute mapped coordinates (no scale distortion)
    // Map points to actual scaled coordinates relative to center
    const mappedPoints = points.map(pt => ({
      x: (pt.x - cx) * sX,
      y: (pt.y - cy) * sY
    }));

    // A) Draw wireframe
    ctx.beginPath();
    ctx.moveTo(mappedPoints[0].x, mappedPoints[0].y);
    for (let i = 1; i < mappedPoints.length; i++) {
      ctx.lineTo(mappedPoints[i].x, mappedPoints[i].y);
    }
      ctx.closePath();
      
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.stroke();

      // B) Draw Stars
      const starCount = obj.constellationStarCount ?? 5;
      if (starCount > 0) {
        const time = Date.now() / 1000;
        const rng = new PRNG(obj.name || 'default');

        const getMidSizeForClass = (cls: string): number => {
          switch(cls) {
            case 'A': return 5;
            case 'B': return 50;
            case 'C': return 500;
            case 'D': return 2500;
            case 'E': return 7000;
            case 'F': return 25000;
            case 'G': return 70000;
            case 'H': return 500000;
            case 'I': return 5000000;
            default: return 1000;
          }
        };

        const minClass = obj.constellationStarMinSizeClass || 'A';
        const maxClass = obj.constellationStarMaxSizeClass || 'C';
        const minPhysical = getMidSizeForClass(minClass);
        const maxPhysical = getMidSizeForClass(maxClass);
        
        let minRadius = 0;
        let maxRadius = 0;

        if (isBookmarkView) {
          minRadius = ScaleManager.getBookmarkVisualRadius(minClass as any);
          maxRadius = ScaleManager.getBookmarkVisualRadius(maxClass as any);
        } else {
          minRadius = ScaleManager.getNavChartVisualRadius(minClass as any, minPhysical, 'miles', context.zoom || 1);
          maxRadius = ScaleManager.getNavChartVisualRadius(maxClass as any, maxPhysical, 'miles', context.zoom || 1);
        }

        // Star Color logic: use bodyFill if an element is selected (bodyFill is updated via getElementColor in canvasRenderer), otherwise white
        const starColor = obj.elementAffinity ? bodyFill : '#ffffff';

        for (let i = 0; i < starCount; i++) {
          const ptIdx = Math.floor(rng.next() * mappedPoints.length);
          const pt = mappedPoints[ptIdx];
          
          const sizeLerp = rng.next();
          const baseStarRadius = minRadius + sizeLerp * (maxRadius - minRadius);
          
          // Twinkle logic
          const twinklePhase = rng.next() * Math.PI * 2;
          const twinkleAlpha = 0.6 + 0.4 * Math.sin(time * 3 + twinklePhase); // 0.2 to 1.0
          const currentRadius = baseStarRadius * (0.8 + 0.2 * twinkleAlpha);

          ctx.beginPath();
          ctx.arc(pt.x, pt.y, currentRadius, 0, Math.PI * 2);
          ctx.fillStyle = starColor;
          ctx.shadowBlur = currentRadius * 2;
          ctx.shadowColor = starColor;
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }

    ctx.restore();
  }
}
