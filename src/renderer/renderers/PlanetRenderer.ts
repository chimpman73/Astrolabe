import { BaseRenderer, RenderContext } from './BaseRenderer';

export class PlanetRenderer extends BaseRenderer {
  public draw(context: RenderContext): void {
    const { ctx, x, y, obj, size, drawEquatorialDetail } = context;
    const shape = obj.worldShape ?? 'sphere';

    this.drawBaseSolid(context);

    // Equatorial detail line for sphere/disc/elliptical
    if (drawEquatorialDetail && (shape === 'sphere' || shape === 'disc' || shape === 'elliptical' || shape === 'eliptical') && (obj.type === 'planet' || size > 8)) {
      ctx.beginPath();
      ctx.moveTo(x - size, y);
      ctx.lineTo(x + size, y);
      ctx.stroke();
    }
  }
}
