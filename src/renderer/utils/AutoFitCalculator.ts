import { CrystalSphere } from '../../types/astrolabe';
import { ScaleManager } from './ScaleManager';
import { flattenCelestialTree, flattenPhenomenaTree } from './orbitMath';

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
    
    const topMarginAU = shellRadius * 1.15;
    const rightMarginAU = shellRadius * 1.375;
    const leftMarginAU = shellRadius * 2.184;

    const directoryStartX_AU = -leftMarginAU;
    const mapRightX_AU = rightMarginAU;
    
    const paperWidthAU = leftMarginAU + rightMarginAU;
    const paperHeightAU = topMarginAU * 2;

    const margin = 1.0;
    
    // To match NavigationChartRenderer's exact pixel adjustments:
    // Drawn Width = (paperWidthAU * zoom) - 10
    // Drawn Height = (paperHeightAU * zoom) + 40
    const targetZoomX = (dimensions.width * margin + 10) / paperWidthAU;
    const targetZoomY = (dimensions.height * margin - 40) / paperHeightAU;
    const targetZoom = Math.min(targetZoomX, targetZoomY);
    
    // Geometric center of the custom bounds
    const centerXAU = (directoryStartX_AU + mapRightX_AU) / 2;
    const centerYAU = 0;
    
    return {
      zoom: targetZoom,
      pan: { 
         // Shift x by +5 pixels because the right margin is 10px smaller (shifts center 5px left)
         x: dimensions.width / 2 - (centerXAU * targetZoom) + 5, 
         y: dimensions.height / 2 - (centerYAU * targetZoom)
      }
    };
  }
}
