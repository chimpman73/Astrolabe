import { CelestialObject } from '../../types/astrolabe';

export const drawSolidBody = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  obj: CelestialObject,
  size: number,
  bodyFill: string,
  bodyStroke: string,
  drawEquatorialDetail: boolean = false
) => {
  const shape = obj.worldShape ?? 'sphere';
  
  ctx.beginPath();
  switch (shape) {
    case 'disc':
      ctx.ellipse(x, y, size, size * 0.35, 0, 0, 2 * Math.PI);
      break;
    case 'pyramid':
      ctx.moveTo(x, y - size * 1.2);
      ctx.lineTo(x + size, y + size * 0.7);
      ctx.lineTo(x - size, y + size * 0.7);
      ctx.closePath();
      break;
    case 'cluster': {
      // Adjust offset for cluster based on size
      const offs = size * 0.55; 
      ctx.arc(x - offs, y + offs * 0.4, size * 0.65, 0, 2 * Math.PI);
      ctx.moveTo(x + offs + size * 0.65, y + offs * 0.4);
      ctx.arc(x + offs, y + offs * 0.4, size * 0.65, 0, 2 * Math.PI);
      ctx.moveTo(x + size * 0.65, y - offs * 0.6);
      ctx.arc(x, y - offs * 0.6, size * 0.65, 0, 2 * Math.PI);
      break;
    }
    case 'irregular': {
      const ipts: [number, number][] = [
        [0, -1.0], [0.55, -0.65], [1.0, -0.05], [0.7, 0.65],
        [-0.1, 0.88], [-0.65, 0.55], [-0.95, 0.0], [-0.55, -0.7],
      ];
      const iradii = [1.0, 0.82, 0.95, 0.78, 0.88, 0.75, 0.92, 0.80];
      ipts.forEach(([dx, dy], i) => {
        const ir = size * iradii[i];
        if (i === 0) ctx.moveTo(x + dx * ir, y + dy * ir);
        else ctx.lineTo(x + dx * ir, y + dy * ir);
      });
      ctx.closePath();
      break;
    }
    default: // sphere
      ctx.arc(x, y, size, 0, 2 * Math.PI);
  }
  
  ctx.fillStyle = bodyFill;
  ctx.fill();
  ctx.lineWidth = obj.type === 'star' ? 2 : 1.5;
  ctx.strokeStyle = bodyStroke;
  ctx.stroke();

  // Equatorial detail line for sphere/disc
  if (drawEquatorialDetail && (shape === 'sphere' || shape === 'disc') && (obj.type === 'planet' || size > 8)) {
    ctx.beginPath();
    ctx.moveTo(x - size, y);
    ctx.lineTo(x + size, y);
    ctx.stroke();
  }
};

export const drawElementAffinityBadge = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  affinity: string,
  strokeColor: string,
  xOffsetFactor: number = 0.75,
  lineWidth: number = 1
) => {
  const elementColors: Record<string, string> = {
    fire: '#e53e3e', water: '#3182ce', earth: '#8b6914', air: '#a0aec0',
  };
  const badgeColor = elementColors[affinity] ?? '#888';
  
  const badgeSize = Math.max(3, size * 0.42);
  ctx.beginPath();
  ctx.arc(x + size * xOffsetFactor, y - size * xOffsetFactor, badgeSize, 0, 2 * Math.PI);
  ctx.fillStyle = badgeColor;
  ctx.fill();
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = lineWidth;
  ctx.stroke();
};

export const drawStationaryIndicator = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string
) => {
  const ds = size + 5;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x, y - ds);
  ctx.lineTo(x + ds, y);
  ctx.lineTo(x, y + ds);
  ctx.lineTo(x - ds, y);
  ctx.closePath();
  ctx.strokeStyle = color;
  ctx.lineWidth = 0.75;
  ctx.stroke();
  ctx.restore();
};

export const getMotionSuffix = (isStationary?: boolean, direction?: string) => {
  return isStationary ? ' ◆' : direction === 'retrograde' ? ' ↺' : '';
};
