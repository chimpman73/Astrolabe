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

export const getElementColor = (affinity: string | null) => {
  if (!affinity) return null;
  const elementColors: Record<string, string> = {
    fire: '#eab308', // yellow
    water: '#3b82f6', // blue
    earth: '#8b4513', // brown
    air: '#ffffff', // white
    mixed: '#22c55e', // green
  };
  return elementColors[affinity] || null;
};

export const getBodyColors = (
  obj: CelestialObject,
  isParchment: boolean,
  defaultBg: string,
  defaultStroke: string,
  defaultGold: string
) => {
  let bodyFill = defaultBg;
  let bodyStroke = defaultStroke;

  const elemColor = getElementColor(obj.elementAffinity ?? null);

  if (obj.type === 'star') {
    bodyFill = elemColor || defaultGold;
    bodyStroke = defaultStroke;
  } else if (obj.type === 'moon') {
    bodyFill = elemColor || (isParchment ? '#dcd2b9' : '#555866');
  } else if (obj.type === 'nebula') {
    bodyFill = elemColor || (isParchment ? 'rgba(80,110,200,0.5)' : 'rgba(100,150,255,0.6)');
    bodyStroke = isParchment ? '#5070c8' : '#8aabff';
  } else if (obj.type === 'sargasso') {
    bodyFill = elemColor || (isParchment ? 'rgba(50,140,80,0.5)' : 'rgba(60,190,100,0.6)');
    bodyStroke = isParchment ? '#2a7840' : '#55cc80';
  } else {
    if (elemColor) bodyFill = elemColor;
  }

  return { bodyFill, bodyStroke };
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
