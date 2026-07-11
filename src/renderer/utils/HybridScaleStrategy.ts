import { SizeClass, SizeUnit } from '../../types/astrolabe';
import { IVisualScaleStrategy } from './IVisualScaleStrategy';
import { ScaleManager } from './ScaleManager';

export class HybridScaleStrategy implements IVisualScaleStrategy {
  getVisualRadius(sizeClass: SizeClass, physicalSize: number, unit: SizeUnit, zoomLevel: number): number {
    const miniatureSymbolicBaseline = ScaleManager.getNavChartSymbolicRadius(sizeClass);
    
    let diameterAu = unit === 'AU' ? physicalSize : ScaleManager.milesToAu(physicalSize);
    const actualPixelRadius = (diameterAu / 2) * zoomLevel;
    
    return Math.max(miniatureSymbolicBaseline, actualPixelRadius);
  }
}
