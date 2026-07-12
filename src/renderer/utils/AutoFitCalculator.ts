import { CrystalSphere } from '../../types/astrolabe';
import { ScaleManager } from './ScaleManager';
import { flattenCelestialTree, flattenPhenomenaTree, calculateSystemPositions } from './orbitMath';

export class AutoFitCalculator {
  /**
   * Calculates the optimal zoom and pan to fit the entire system on screen.
   * Expands the Crystal Sphere bounds as much as possible without clipping,
   * leaving exactly enough room for the sphere title.
   */
  public static calculateAutoFit(
    dimensions: { width: number; height: number },
    activeSphere: CrystalSphere | null
  ): { zoom: number; pan: { x: number; y: number } } {
    
    if (!activeSphere) {
      return { 
        zoom: 1, 
        pan: { x: dimensions.width / 2, y: dimensions.height / 2 + 25 } 
      };
    }

    const parentMap = new Map<string, string>();
    const flatBodies = flattenCelestialTree(activeSphere.celestialBodies || [], parentMap);
    const flatPhenomena = flattenPhenomenaTree(activeSphere.celestialBodies || [], parentMap);
    const allObjects = [...flatBodies, ...(activeSphere.phenomena || []), ...flatPhenomena];
    
    const visibleObjects = allObjects.filter(o => !o.isHidden);
    
    if (visibleObjects.length === 0) {
      return { 
        zoom: 1, 
        pan: { x: dimensions.width / 2, y: dimensions.height / 2 + 25 } 
      };
    }
    
    let maxDist = 0.1;
    
    allObjects.forEach((o: any) => {
      let isPrimary = false;
      if (!o.orbitedObjectName) {
        isPrimary = true;
      } else {
        const parent = allObjects.find(p => p.name === o.orbitedObjectName);
        if (parent && !parent.orbitedObjectName && (parent.distanceOrbited || 0) === 0) {
          isPrimary = true;
        }
      }
      
      if (!isPrimary) return;
      
      const reach = ScaleManager.getPhysicalReachAU(o as any);
      if (o.affectsShellBoundary !== false && reach > maxDist) maxDist = reach;
    });
    
    const isCustom = activeSphere.shellBoundaryType === 'custom' || activeSphere.shellBoundaryType === 'relativeMargin';
    const shellScale = isCustom ? (activeSphere.shellCustomScale ?? 1.2) : 2.0;
    
                        const shellRadius = maxDist * shellScale;
    
    // Hardcoded Layout constraints based strictly on Soltan Ephemeris standard proportions
    const directoryStartX_AU = -900.686 * shellRadius;
    const directoryWidthModel = shellRadius;
    
    const mapTopY_AU = -shellRadius;
    const mapBottomY_AU = 526.102 * shellRadius;
    const mapRightX_AU = 474.130 * shellRadius;
    
    const paddingAU = shellRadius * 0.25;

    const paperWidthAU = (mapRightX_AU - directoryStartX_AU) + paddingAU * 2;
    const paperHeightAU = (mapBottomY_AU - mapTopY_AU) + paddingAU * 2;

    const margin = 0.90;
    const targetZoomX = (dimensions.width * margin) / paperWidthAU;
    const topOffsetPx = 0;
    const availableHeight = dimensions.height - topOffsetPx;
    const targetZoomY = (availableHeight * margin) / paperHeightAU;
    const targetZoom = Math.min(targetZoomX, targetZoomY);
    
    // Geometric center of the fixed layout bounds
    const centerXAU = (directoryStartX_AU - paddingAU + mapRightX_AU + paddingAU) / 2;
    const centerYAU = (mapTopY_AU - paddingAU + mapBottomY_AU + paddingAU) / 2;
    
    return {
      zoom: targetZoom,
      pan: { 
         x: dimensions.width / 2 - (centerXAU * targetZoom), 
         y: dimensions.height / 2 - (centerYAU * targetZoom) + (topOffsetPx / 2)
      }
    };
  }
}
