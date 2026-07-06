import { CelestialObject } from '../../types/astrolabe';
import { MapStyleContext } from '../../types/renderer';

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
