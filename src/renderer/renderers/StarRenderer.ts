import { BaseRenderer } from './BaseRenderer';
import { RenderContext } from '../../types/renderer';

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
        const maxDim = this.applyCustomShapeTransform(ctx, obj.customShapeName, x, y, size * cSize);
      
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
