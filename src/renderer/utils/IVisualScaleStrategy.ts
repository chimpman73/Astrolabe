import { SizeClass, SizeUnit } from '../../types/astrolabe';

export interface IVisualScaleStrategy {
  getVisualRadius(sizeClass: SizeClass, physicalSize: number, unit: SizeUnit, zoomLevel: number): number;
}
