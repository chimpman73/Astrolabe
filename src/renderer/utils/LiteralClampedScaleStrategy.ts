import { SizeClass, SizeUnit } from '../../types/astrolabe';
import { IVisualScaleStrategy } from './IVisualScaleStrategy';
import { ScaleManager } from './ScaleManager';

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
