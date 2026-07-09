import { CelestialObject, CrystalSphere } from '../../types/astrolabe';
import { ScaleManager } from './ScaleManager';

export class AutoFitCalculator {
  /**
   * Calculates the optimal zoom and pan to fit the entire system on screen.
   * Expands the Crystal Sphere bounds as much as possible without clipping,
   * leaving exactly enough room for the sphere title.
   */
  public static calculateAutoFit(
    dimensions: { width: number; height: number },
    objects: CelestialObject[],
    activeSphere: CrystalSphere | null
  ): { zoom: number; pan: { x: number; y: number } } {
    
    const isPrimary = (o: CelestialObject) => !o.orbitedObjectName;

    const visibleObjects = objects.filter((o: any) => !o.isHidden);
    
    if (visibleObjects.length === 0) {
      return { 
        zoom: 1, 
        pan: { x: dimensions.width / 2, y: dimensions.height / 2 + 25 } 
      };
    }
    
    let maxDist = 0.1;
    let absoluteMaxDist = 0.1;
    
    objects.forEach((o: any) => {
      if (!isPrimary(o)) return;
      const reach = ScaleManager.getPhysicalReachAU(o);
      if (o.affectsShellBoundary !== false && reach > maxDist) maxDist = reach;
      if (reach > absoluteMaxDist) absoluteMaxDist = reach;
    });
    
    const isCustom = activeSphere?.shellBoundaryType === 'custom' || activeSphere?.shellBoundaryType === 'relativeMargin';
    const shellScale = isCustom ? (activeSphere?.shellCustomScale ?? 1.2) : 2.0;
    
    const shellRadius = maxDist * shellScale;
    const viewRadius = Math.max(absoluteMaxDist, shellRadius);
    
    // We offset the pan down by 25px so the title isn't hidden.
    // To prevent the bottom from clipping due to this offset, the maximum 
    // safe pixel radius is exactly half the height minus 25px.
    const maxPixelRadius = Math.min(dimensions.width / 2, dimensions.height / 2 - 25);
    
    const targetZoom = maxPixelRadius / viewRadius;
    
    return {
      zoom: targetZoom,
      pan: { x: dimensions.width / 2, y: dimensions.height / 2 + 25 }
    };
  }
}
