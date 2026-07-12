import { RenderContext } from '../../types/renderer';
import { shapeManager } from '../utils/ShapeManager';

export abstract class BaseRenderer {
  public abstract draw(context: RenderContext): void;

  protected drawShapePath(ctx: CanvasRenderingContext2D, shape: string, x: number, y: number, s: number, customShapeName?: string): Path2D | void {
    ctx.beginPath();
    switch (shape) {
      case 'disc': {
        const t = s * 0.15; // thickness of the lip
        // Top face ellipse (clockwise)
        ctx.ellipse(x, y - t, s, s * 0.35, 0, 0, 2 * Math.PI);
        // Lip thickness (clockwise: right edge down, bottom curve right-to-left, left edge up)
        ctx.moveTo(x + s, y - t);
        ctx.lineTo(x + s, y + t);
        // 0 to Math.PI clockwise traces the bottom arc from right to left
        ctx.ellipse(x, y + t, s, s * 0.35, 0, 0, Math.PI, false);
        ctx.lineTo(x - s, y - t);
        break;
      }
      case 'pyramid':
        ctx.moveTo(x, y - s * 1.2);
        ctx.lineTo(x + s, y + s * 0.7);
        ctx.lineTo(x - s, y + s * 0.7);
        ctx.closePath();
        break;
      case 'cluster': {
        const r = s * 0.4;
        const R = s * 0.55;
        const dx = R * 0.866;
        const dy = R * 0.5;
        
        // Top circle
        ctx.moveTo(x + r, y - R);
        ctx.arc(x, y - R, r, 0, 2 * Math.PI);
        // Bottom left circle
        ctx.moveTo(x - dx + r, y + dy);
        ctx.arc(x - dx, y + dy, r, 0, 2 * Math.PI);
        // Bottom right circle
        ctx.moveTo(x + dx + r, y + dy);
        ctx.arc(x + dx, y + dy, r, 0, 2 * Math.PI);
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
      case 'eliptical':
      case 'elliptical':
        ctx.ellipse(x, y, s, s * 0.65, 0, 0, 2 * Math.PI);
        break;
      case 'ring':
        ctx.arc(x, y, s, 0, 2 * Math.PI, false);
        ctx.moveTo(x + s * 0.6, y);
        ctx.arc(x, y, s * 0.6, 0, 2 * Math.PI, true);
        break;
      case 'hollow_world':
        ctx.arc(x, y, s, 0, 2 * Math.PI, false);
        ctx.moveTo(x + s * 0.3, y);
        ctx.arc(x, y, s * 0.3, 0, 2 * Math.PI, true); // Much thicker crust
        break;
      case 'cylinder': {
        const r = s * 0.5;
        const L = s * 0.8;
        const angle = Math.PI / 4;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        ctx.moveTo(-L, -r);
        ctx.lineTo(L, -r);
        ctx.arc(L, 0, r, -Math.PI / 2, Math.PI / 2);
        ctx.lineTo(-L, r);
        ctx.arc(-L, 0, r, Math.PI / 2, -Math.PI / 2);
        ctx.restore();
        break;
      }
      case 'ship':
        ctx.moveTo(x, y - s * 1.2);
        ctx.quadraticCurveTo(x + s * 0.4, y - s * 0.2, x + s * 0.8, y + s * 0.4);
        ctx.lineTo(x, y + s * 0.8);
        ctx.lineTo(x - s * 0.8, y + s * 0.4);
        ctx.quadraticCurveTo(x - s * 0.4, y - s * 0.2, x, y - s * 1.2);
        break;
      case 'rectangular':
        ctx.rect(x - s, y - s * 0.75, s * 2, s * 1.5);
        break;
      case 'castle':
        ctx.moveTo(x - s, y + s);
        ctx.lineTo(x - s, y - s);
        ctx.lineTo(x - s * 0.5, y - s);
        ctx.lineTo(x - s * 0.5, y - s * 0.3);
        ctx.lineTo(x - s * 0.2, y - s * 0.3);
        ctx.lineTo(x - s * 0.2, y - s * 0.8);
        ctx.lineTo(x + s * 0.2, y - s * 0.8);
        ctx.lineTo(x + s * 0.2, y - s * 0.3);
        ctx.lineTo(x + s * 0.5, y - s * 0.3);
        ctx.lineTo(x + s * 0.5, y - s);
        ctx.lineTo(x + s, y - s);
        ctx.lineTo(x + s, y + s);
        ctx.closePath();
        break;
      case 'skull':
        // Outer skull silhouette
        ctx.moveTo(x - s * 0.7, y - s * 0.2);
        ctx.bezierCurveTo(x - s * 0.7, y - s, x + s * 0.7, y - s, x + s * 0.7, y - s * 0.2);
        ctx.bezierCurveTo(x + s * 0.7, y + s * 0.3, x + s * 0.5, y + s * 0.4, x + s * 0.4, y + s * 0.4);
        ctx.lineTo(x + s * 0.3, y + s * 0.9);
        ctx.lineTo(x - s * 0.3, y + s * 0.9);
        ctx.lineTo(x - s * 0.4, y + s * 0.4);
        ctx.bezierCurveTo(x - s * 0.5, y + s * 0.4, x - s * 0.7, y + s * 0.3, x - s * 0.7, y - s * 0.2);
        ctx.closePath();

        // Left eye socket (drawn backwards for cutout)
        ctx.moveTo(x - s * 0.4, y - s * 0.1);
        ctx.bezierCurveTo(x - s * 0.1, y - s * 0.1, x - s * 0.1, y + s * 0.2, x - s * 0.4, y + s * 0.2);
        ctx.bezierCurveTo(x - s * 0.6, y + s * 0.2, x - s * 0.6, y - s * 0.1, x - s * 0.4, y - s * 0.1);

        // Right eye socket (drawn backwards for cutout)
        ctx.moveTo(x + s * 0.4, y - s * 0.1);
        ctx.bezierCurveTo(x + s * 0.6, y - s * 0.1, x + s * 0.6, y + s * 0.2, x + s * 0.4, y + s * 0.2);
        ctx.bezierCurveTo(x + s * 0.1, y + s * 0.2, x + s * 0.1, y - s * 0.1, x + s * 0.4, y - s * 0.1);
        
        // Nose hole (triangle)
        ctx.moveTo(x, y + s * 0.2);
        ctx.lineTo(x + s * 0.1, y + s * 0.4);
        ctx.lineTo(x - s * 0.1, y + s * 0.4);
        ctx.closePath();
        break;
      case 'custom':
        if (customShapeName) {
          const path = shapeManager.getCachedPath(customShapeName);
          if (path) {
            return path;
          }
        }
        // Fallback to sphere
        ctx.arc(x, y, s, 0, 2 * Math.PI);
        break;
      default: // sphere
        ctx.arc(x, y, s, 0, 2 * Math.PI);
    }
  }

  protected applyCustomShapeTransform(ctx: CanvasRenderingContext2D, customShapeName: string | undefined, x: number, y: number, size: number): number {
    ctx.translate(x, y);
    const bounds = (shapeManager as any).getCachedBounds?.(customShapeName ?? '');
    let cx = 50, cy = 50, maxDim = 100;
    if (bounds && bounds.w > 0 && bounds.h > 0) {
      cx = bounds.x + bounds.w / 2;
      cy = bounds.y + bounds.h / 2;
      maxDim = Math.max(bounds.w, bounds.h);
    }
    
    const scale = (2 * size) / maxDim;
    ctx.scale(scale, scale);
    ctx.translate(-cx, -cy);
    return maxDim;
  }

  protected drawBaseSolid(context: RenderContext): void {
    const { ctx, x, y, obj, size, bodyFill, bodyStroke } = context;
    const shape = obj.worldShape ?? 'sphere';
    
    ctx.fillStyle = bodyFill;
    ctx.lineWidth = obj.type === 'star' ? 2 : 1.5;
    
    // If it's a hollow shape and it's small, thin the stroke so the hole remains visible
    if ((shape === 'hollow_world' || shape === 'ring') && size < 6) {
      ctx.lineWidth = Math.min(ctx.lineWidth, size * 0.15);
    }
    
    ctx.strokeStyle = bodyStroke;
    
    if (shape === 'custom' && obj.customShapeName) {
      const path = shapeManager.getCachedPath(obj.customShapeName);
      if (path) {
        ctx.save();
        this.applyCustomShapeTransform(ctx, obj.customShapeName, x, y, size);
        
        ctx.fill(path);
        ctx.stroke(path);
        ctx.restore();
        return;
      }
    }

    this.drawShapePath(ctx, shape, x, y, size, obj.customShapeName);
    ctx.fill();
    ctx.stroke();
  }
}
