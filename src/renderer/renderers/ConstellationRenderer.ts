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
    
    const detail = obj.constellationDetail || 1;
    const starCount = obj.constellationStarCount ?? 5;
    const style = obj.constellationStyle || 'internal';
    const seed = obj.name || 'default';

    const constellationData = shapeManager.getConstellationData(shapeName, style, detail, seed);

    if (!constellationData || constellationData.points.length === 0) {
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
    const mappedPoints = constellationData.points.map(pt => ({
      x: (pt.x - cx) * sX,
      y: (pt.y - cy) * sY
    }));

    // For edges, we just map them directly (since they refer to original points, but we can just use the mapped points)
    // Wait, the edges in constellationData contain the actual objects from the points array.
    // If we rely on identity, it's O(N). Let's just create a mappedEdges array based on index if we can,
    // but edges have p1 and p2. We can just map p1 and p2 by applying the same transform.
    
    const mappedEdges = constellationData.edges.map(e => ({
      p1: { x: (e.p1.x - cx) * sX, y: (e.p1.y - cy) * sY },
      p2: { x: (e.p2.x - cx) * sX, y: (e.p2.y - cy) * sY }
    }));

    // A) Draw wireframe
    ctx.beginPath();
    for (const edge of mappedEdges) {
      ctx.moveTo(edge.p1.x, edge.p1.y);
      ctx.lineTo(edge.p2.x, edge.p2.y);
    }
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.stroke();

    // B) Draw Stars
    if (mappedPoints.length > 0) {
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

      // Star Color logic
      const starColor = obj.elementAffinity ? bodyFill : '#ffffff';

      // We have `starCount` stars to place.
      // We can place them anywhere along the valid mappedEdges.
      // If t=0 or t=1, they are exactly on the nodes.
      // We'll use the PRNG to pick a random edge and a random 't' (0 to 1).
      // We will bias 't' towards 0 or 1 (the nodes) so it looks like stars form the points, 
      // but occasionally they fall along the lines.
      
      for (let i = 0; i < starCount; i++) {
        let pt: { x: number, y: number };
        
        if (mappedEdges.length > 0) {
          // Pick a random edge
          const edgeIdx = Math.floor(rng.next() * mappedEdges.length);
          const edge = mappedEdges[edgeIdx];
          
          // Pick a random position along the edge.
          let t = rng.next();
          // Bias towards ends (nodes) - e.g. 50% chance to just be exactly on a node
          const bias = rng.next();
          if (bias < 0.25) t = 0;
          else if (bias < 0.5) t = 1;
          
          pt = {
            x: edge.p1.x + t * (edge.p2.x - edge.p1.x),
            y: edge.p1.y + t * (edge.p2.y - edge.p1.y)
          };
        } else {
          // Fallback if no edges exist
          const ptIdx = Math.floor(rng.next() * mappedPoints.length);
          pt = mappedPoints[ptIdx];
        }
        
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
