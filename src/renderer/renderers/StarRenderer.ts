import { BaseRenderer, RenderContext } from './BaseRenderer';

export class StarRenderer extends BaseRenderer {
  public draw(context: RenderContext): void {
    const { ctx, x, y, obj, size, bodyFill } = context;
    const shape = obj.worldShape ?? 'sphere';
    const cSize = obj.coronaSize ?? 1.5;
    const cAlpha = obj.coronaAlpha ?? 0.3;
    
    ctx.save();
    this.drawShapePath(ctx, shape, x, y, size * cSize);
    ctx.fillStyle = bodyFill;
    ctx.globalAlpha = cAlpha;
    ctx.fill();
    ctx.restore();

    this.drawBaseSolid(context);
  }
}
