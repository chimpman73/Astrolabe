import { SizeClass, SizeUnit } from '../../types/astrolabe';
import { IVisualScaleStrategy, LiteralClampedScaleStrategy } from './VisualScaleStrategy';

export class ScaleManager {
  public static readonly AU_IN_MILES = 92955807;

  // Active strategy for Nav Chart zoomable scaling
  private static navChartStrategy: IVisualScaleStrategy = new LiteralClampedScaleStrategy();

  public static setNavChartStrategy(strategy: IVisualScaleStrategy) {
    this.navChartStrategy = strategy;
  }

  public static milesToAu(miles: number): number {
    return miles / this.AU_IN_MILES;
  }

  public static auToMiles(au: number): number {
    return au * this.AU_IN_MILES;
  }

  /**
   * Validates if the given size (in the given unit) falls within the valid range for the SizeClass.
   * Inclusive on the lower bound, exclusive on the upper bound.
   */
  public static isValidSize(sizeClass: SizeClass, size: number, unit: SizeUnit): boolean {
    const miles = unit === 'AU' ? this.auToMiles(size) : size;

    switch (sizeClass) {
      case 'A': return miles < 10;
      case 'B': return miles >= 10 && miles < 100;
      case 'C': return miles >= 100 && miles < 1000;
      case 'D': return miles >= 1000 && miles < 4000;
      case 'E': return miles >= 4000 && miles < 10000;
      case 'F': return miles >= 10000 && miles < 40000;
      case 'G': return miles >= 40000 && miles < 100000;
      case 'H': return miles >= 100000 && miles < 1000000;
      case 'I': return miles >= 1000000 && miles < 10000000;
      case 'J': return miles >= 10000000;
      default: return false;
    }
  }

  /**
   * Returns the static base pixel radius for the Bookmark View, 
   * starting at 5px for Size A and growing up to 32px for Size J.
   */
  public static getBookmarkVisualRadius(sizeClass: SizeClass): number {
    switch (sizeClass) {
      case 'A': return 5;
      case 'B': return 6;
      case 'C': return 7;
      case 'D': return 8;
      case 'E': return 10;
      case 'F': return 12;
      case 'G': return 14;
      case 'H': return 18;
      case 'I': return 24;
      case 'J': return 32;
      default: return 8; // fallback
    }
  }

  /**
   * Returns the pixel radius for the zoomable Navigation Chart view,
   * delegated to the currently active IVisualScaleStrategy.
   */
  public static getNavChartVisualRadius(sizeClass: SizeClass, physicalSize: number, unit: SizeUnit, zoomLevel: number): number {
    return this.navChartStrategy.getVisualRadius(sizeClass, physicalSize, unit, zoomLevel);
  }
}
