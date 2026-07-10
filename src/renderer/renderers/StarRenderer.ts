import { BaseRenderer } from './BaseRenderer';
import { RenderContext } from '../../types/renderer';
import { shapeManager } from '../utils/ShapeManager';

export class StarRenderer extends BaseRenderer {
  public draw(context: RenderContext): void {
    const { ctx, x, y, obj, size, bodyFill } = context;
    const shape = obj.worldShape ?? 'sphere';
    const cSize = obj.coronaSize ?? 1.5;
    const cAlpha = obj.coronaAlpha ?? 0.3;
    
    ctx.save();
    const customPath = this.drawShapePath(ctx, shape, x, y, size * cSize, obj.customShapeName);
    ctx.fillStyle = bodyFill;
    ctx.globalAlpha = cAlpha;
    
    if (customPath instanceof Path2D) {
      ctx.translate(x, y);
      
      const bounds = (shapeManager as any).getCachedBounds?.(obj.customShapeName);
      let cx = 50, cy = 50, maxDim = 100;
      if (bounds && bounds.w > 0 && bounds.h > 0) {
        cx = bounds.x + bounds.w / 2;
        cy = bounds.y + bounds.h / 2;
        maxDim = Math.max(bounds.w, bounds.h);
      }
      
      const scale = (2 * size) / maxDim;
      ctx.scale(scale, scale);
      ctx.translate(-cx, -cy);
      
      const expansion = (cSize - 1) * maxDim / 2;
      ctx.lineWidth = expansion * 2;
      ctx.lineJoin = 'round';
      ctx.strokeStyle = bodyFill;
      
      ctx.stroke(customPath);
      ctx.fill(customPath);
    } else {
      ctx.fill();
    }
    
    ctx.restore();

    this.drawBaseSolid(context);
  }
}
