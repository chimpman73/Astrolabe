import { CelestialObject, CrystalSphere } from '../../types/astrolabe';
import { ParchmentDecoration } from '../store/useSystemStore';

export interface MapStyleContext {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  activeZoom: number;
  activePan: { x: number; y: number };
  objects: CelestialObject[];
  visibleObjects: CelestialObject[];
  positions: Record<string, { x: number; y: number; angle: number; period: number }>;
  activeSphere: CrystalSphere | null;
  isPrimary: (obj: CelestialObject) => boolean;
  project: (x: number, y: number) => { x: number; y: number };
  decorations?: ParchmentDecoration[];
  fontsLoaded?: boolean;
}

export interface MapStyle {
  initialize?(ctx: CanvasRenderingContext2D): void;
  drawBackground(context: MapStyleContext): void;
  drawGrid(context: MapStyleContext): void;
  drawDecorations(context: MapStyleContext): void;
  drawOrbits(context: MapStyleContext, activeVisibleObjects: CelestialObject[]): void;
  drawShell(context: MapStyleContext, shellRadius: number, shellProj: { x: number; y: number }): void;
  drawBodies(context: MapStyleContext, activeVisibleObjects: CelestialObject[]): void;
  drawScaleBar(context: MapStyleContext): void;
  drawForeground(context: MapStyleContext): void;
}
