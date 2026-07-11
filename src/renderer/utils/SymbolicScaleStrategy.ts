import { SizeClass, SizeUnit } from '../../types/astrolabe';
import { IVisualScaleStrategy } from './IVisualScaleStrategy';
import { ScaleManager } from './ScaleManager';

export class SymbolicScaleStrategy implements IVisualScaleStrategy {
  getVisualRadius(sizeClass: SizeClass, _physicalSize: number, _unit: SizeUnit, zoomLevel: number): number {
    // Treat the object as an icon. Use the base bookmark visual radius and apply a slight logarithmic zoom scaling.
    const baseRadius = ScaleManager.getBookmarkVisualRadius(sizeClass);
    // Don't shrink below baseRadius when zoomed out. Grow slightly when zoomed in.
    const zoomMultiplier = zoomLevel < 1 ? 1 : Math.pow(zoomLevel, 0.25);
    return Math.max(baseRadius, baseRadius * zoomMultiplier);
  }
}
