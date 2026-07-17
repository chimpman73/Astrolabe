import { CelestialObject } from '../../types/astrolabe';

export type NoteNodeId = 'center' | 'rotate' | 'tl' | 'tr' | 'bl' | 'br';

interface NoteNodes {
  center: { x: number; y: number };
  rotate: { x: number; y: number };
  tl: { x: number; y: number };
  tr: { x: number; y: number };
  bl: { x: number; y: number };
  br: { x: number; y: number };
}

export function getNoteCorners(note: any) {
  const maxWidth = note.noteMaxWidth || 120;
  const maxHeight = note.noteMaxHeight || 60;
  const halfW = maxWidth / 2;
  const halfH = maxHeight / 2;

  return note.noteCorners || {
    tl: { x: -halfW, y: -halfH },
    tr: { x: halfW, y: -halfH },
    bl: { x: -halfW, y: halfH },
    br: { x: halfW, y: halfH },
  };
}

export function getNoteNodes(
  obj: CelestialObject,
  zoom: number,
  pan: { x: number; y: number },
  baseZoom: number
): NoteNodes {
  const isLegend = obj.type === 'legend';
  const corners = isLegend ? {
    tl: { x: -20, y: -20 },
    tr: { x: 20, y: -20 },
    bl: { x: -20, y: 20 },
    br: { x: 20, y: 20 },
  } : getNoteCorners(obj);
  
  const dist = isLegend ? (obj.legendDistanceAU || 0) : (obj.noteDistanceAU || 0);
  const angle = isLegend ? (obj.legendAngle || 0) : (obj.noteAngle || 0);
  const rot = isLegend ? 0 : (obj.noteRotation || 0);

  // Note position in local space
  const rad = (angle * Math.PI) / 180;
  const xModel = Math.cos(rad) * dist;
  const yModel = Math.sin(rad) * dist;

  // Screen space center
  const cx = pan.x + xModel * zoom;
  const cy = pan.y + yModel * zoom;

  // To find corners in screen space, we rotate the local offsets by `rot`
  const rotRad = (rot * Math.PI) / 180;
  
  const overlayScale = zoom / (baseZoom || 1);

  const rotatePoint = (offsetX: number, offsetY: number) => {
    const rx = offsetX * Math.cos(rotRad) - offsetY * Math.sin(rotRad);
    const ry = offsetX * Math.sin(rotRad) + offsetY * Math.cos(rotRad);
    return { x: cx + rx * overlayScale, y: cy + ry * overlayScale };
  };

  return {
    center: { x: cx, y: cy },
    rotate: rotatePoint(corners.tr.x + 20, corners.tr.y - 20),
    tl: rotatePoint(corners.tl.x, corners.tl.y),
    tr: rotatePoint(corners.tr.x, corners.tr.y),
    bl: rotatePoint(corners.bl.x, corners.bl.y),
    br: rotatePoint(corners.br.x, corners.br.y),
  };
}

export function hitTestNoteNodes(x: number, y: number, nodes: NoteNodes): NoteNodeId | null {
  const HIT_RADIUS = 15; // px
  const distSq = (p: { x: number; y: number }) => (p.x - x) ** 2 + (p.y - y) ** 2;
  const rSq = HIT_RADIUS * HIT_RADIUS;

  if (distSq(nodes.rotate) < rSq) return 'rotate';
  if (distSq(nodes.tl) < rSq) return 'tl';
  if (distSq(nodes.tr) < rSq) return 'tr';
  if (distSq(nodes.bl) < rSq) return 'bl';
  if (distSq(nodes.br) < rSq) return 'br';
  if (distSq(nodes.center) < rSq) return 'center';

  return null;
}
