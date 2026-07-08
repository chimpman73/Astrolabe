import { CelestialObject } from './astrolabe';

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

export interface MapStyleContext {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  activeZoom: number;
  activePan: { x: number; y: number };
  objects: CelestialObject[];
  visibleObjects: CelestialObject[];
  positions: Record<string, { x: number; y: number; angle: number; period: number }>;
  activeSphere: import('./astrolabe').CrystalSphere | null;
  isPrimary: (obj: CelestialObject) => boolean;
  project: (x: number, y: number) => { x: number; y: number };
  decorations?: ParchmentDecoration[];
  fontsLoaded?: boolean;
}

export interface ParchmentDecoration {
  type: 'ink' | 'coffee' | 'burn';
  x: number;
  y: number;
  rotation: number;
  scale: number;
  opacity: number;
}

export interface INavigationChartRenderer {
  render(context: MapStyleContext): void;
}
