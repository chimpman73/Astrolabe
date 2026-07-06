import { BaseRenderer } from './BaseRenderer';
import { RenderContext } from '../../types/renderer';

export class PlanetRenderer extends BaseRenderer {
  public draw(context: RenderContext): void {
    const { ctx, x, y, obj, size, drawEquatorialDetail } = context;
    const shape = obj.worldShape ?? 'sphere';

    this.drawBaseSolid(context);

    // Equatorial detail line for sphere/disc/elliptical
    if (drawEquatorialDetail && (shape === 'sphere' || shape === 'disc' || shape === 'elliptical') && (obj.type === 'planet' || size > 8)) {
      ctx.beginPath();
      ctx.moveTo(x - size, y);
      ctx.lineTo(x + size, y);
      ctx.stroke();
    }
  }
}
