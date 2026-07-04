import { CelestialObject } from '../../types/astrolabe';

export interface RenderContext {
  ctx: CanvasRenderingContext2D;
  x: number;
  y: number;
  obj: CelestialObject;
  size: number;
  bodyFill: string;
  bodyStroke: string;
  drawEquatorialDetail?: boolean;
  zoom?: number;
  
  // Advanced context for clouds/rings
  isBookmarkView?: boolean;
  parentX?: number;
  parentY?: number;
  orbitRadius?: number;
  orbitAngle?: number;
  bookmarkWidth?: number; // width in Bookmark view
  bookmarkR?: number; // distance to center in bookmark view
  bookmarkCenterY?: number; // y coordinate of center in bookmark view
}

export abstract class BaseRenderer {
  public abstract draw(context: RenderContext): void;

  protected drawShapePath(ctx: CanvasRenderingContext2D, shape: string, x: number, y: number, s: number): void {
    ctx.beginPath();
    switch (shape) {
      case 'disc':
        ctx.ellipse(x, y, s, s * 0.35, 0, 0, 2 * Math.PI);
        break;
      case 'pyramid':
        ctx.moveTo(x, y - s * 1.2);
        ctx.lineTo(x + s, y + s * 0.7);
        ctx.lineTo(x - s, y + s * 0.7);
        ctx.closePath();
        break;
      case 'cluster': {
        const offs = s * 0.55; 
        ctx.arc(x - offs, y + offs * 0.4, s * 0.65, 0, 2 * Math.PI);
        ctx.moveTo(x + offs + s * 0.65, y + offs * 0.4);
        ctx.arc(x + offs, y + offs * 0.4, s * 0.65, 0, 2 * Math.PI);
        ctx.moveTo(x + s * 0.65, y - offs * 0.6);
        ctx.arc(x, y - offs * 0.6, s * 0.65, 0, 2 * Math.PI);
        break;
      }
      case 'irregular': {
        const ipts: [number, number][] = [
          [0, -1.0], [0.55, -0.65], [1.0, -0.05], [0.7, 0.65],
          [-0.1, 0.88], [-0.65, 0.55], [-0.95, 0.0], [-0.55, -0.7],
        ];
        const iradii = [1.0, 0.82, 0.95, 0.78, 0.88, 0.75, 0.92, 0.80];
        ipts.forEach(([dx, dy], i) => {
          const ir = s * iradii[i];
          if (i === 0) ctx.moveTo(x + dx * ir, y + dy * ir);
          else ctx.lineTo(x + dx * ir, y + dy * ir);
        });
        ctx.closePath();
        break;
      }
      default: // sphere
        ctx.arc(x, y, s, 0, 2 * Math.PI);
    }
  }

  protected drawBaseSolid(context: RenderContext): void {
    const { ctx, x, y, obj, size, bodyFill, bodyStroke } = context;
    const shape = obj.worldShape ?? 'sphere';
    this.drawShapePath(ctx, shape, x, y, size);
    ctx.fillStyle = bodyFill;
    ctx.fill();
    ctx.lineWidth = obj.type === 'star' ? 2 : 1.5;
    ctx.strokeStyle = bodyStroke;
    ctx.stroke();
  }
}
