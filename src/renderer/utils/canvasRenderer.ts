

import { CelestialRendererFactory } from '../renderers';

export const drawSolidBody = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  obj: any,
  size: number,
  bodyFill: string,
  bodyStroke: string,
  drawEquatorialDetail: boolean = false,
  zoom: number = 1,
  // Add optional advanced cloud/ring context
  isBookmarkView?: boolean,
  parentX?: number,
  parentY?: number,
  orbitRadius?: number,
  orbitAngle?: number,
  bookmarkWidth?: number,
  bookmarkR?: number,
  bookmarkCenterY?: number,
  isExport?: boolean,
  exportScale?: number
) => {
  const renderer = CelestialRendererFactory.getRenderer(obj.type);
  
  ctx.save();
  
  // Rotate the canvas around the object's local origin (x, y)
  // so that "up" (negative Y) points outwards away from the parent.
  // We skip this for clouds because they manually render arcs around the parent coordinate space.
  if (obj.type !== 'cloud' && parentX !== undefined && parentY !== undefined) {
    const angle = Math.atan2(y - parentY, x - parentX);
    ctx.translate(x, y);
    ctx.rotate(angle - Math.PI / 2);
    ctx.translate(-x, -y);
  }

  renderer.draw({
    ctx, x, y, obj, size, bodyFill, bodyStroke, drawEquatorialDetail, zoom,
    isBookmarkView, parentX, parentY, orbitRadius, orbitAngle, bookmarkWidth, bookmarkR, bookmarkCenterY,
    isExport, exportScale
  });

  ctx.restore();
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
  obj: any,
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
  } else if (obj.type === 'cloud') {
    bodyFill = elemColor || (isParchment ? '#808080' : '#a0a0a0');
    bodyStroke = isParchment ? '#505050' : '#d0d0d0';
  } else if (obj.type === 'living_world') {
    bodyFill = elemColor || (isParchment ? '#7c8e6b' : '#3d5c34');
    bodyStroke = isParchment ? '#4a3d31' : '#6b5443';
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

