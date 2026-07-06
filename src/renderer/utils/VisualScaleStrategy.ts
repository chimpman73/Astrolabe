import { SizeClass, SizeUnit } from '../../types/astrolabe';
import { ScaleManager } from './ScaleManager';

export interface IVisualScaleStrategy {
  getVisualRadius(sizeClass: SizeClass, physicalSize: number, unit: SizeUnit, zoomLevel: number): number;
}

export class SymbolicScaleStrategy implements IVisualScaleStrategy {
  getVisualRadius(sizeClass: SizeClass, _physicalSize: number, _unit: SizeUnit, zoomLevel: number): number {
    // Treat the object as an icon. Use the base bookmark visual radius and apply a slight logarithmic zoom scaling.
    const baseRadius = ScaleManager.getBookmarkVisualRadius(sizeClass);
    // Don't shrink below baseRadius when zoomed out. Grow slightly when zoomed in.
    const zoomMultiplier = zoomLevel < 1 ? 1 : Math.pow(zoomLevel, 0.25);
    return Math.max(baseRadius, baseRadius * zoomMultiplier);
  }
}

export class LiteralClampedScaleStrategy implements IVisualScaleStrategy {
  getVisualRadius(_sizeClass: SizeClass, physicalSize: number, unit: SizeUnit, zoomLevel: number): number {
    const MIN_PIXEL_RADIUS = 3;
    let diameterAu = unit === 'AU' ? physicalSize : ScaleManager.milesToAu(physicalSize);
    
    // Convert to AU and then to whatever pixel space `zoomLevel` implies. 
    // In the NavChart, coordinates are usually 1 unit = 1 AU. So the diameter in pixels 
    // before applying the viewport scale is simply `diameterAu`.
    // The zoomLevel is effectively the multiplier from AU to pixels on the screen.
    const actualPixelRadius = (diameterAu / 2) * zoomLevel;
    
    return Math.max(MIN_PIXEL_RADIUS, actualPixelRadius);
  }
}
