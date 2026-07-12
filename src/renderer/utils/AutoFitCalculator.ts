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
    
    const getMaxAbsoluteReach = (obj: any, allObjs: any[]): number => {
      let reach = ScaleManager.getPhysicalReachAU(obj);
      let curr = obj;
      while (curr.orbitedObjectName) {
        const parent = allObjs.find((p: any) => p.name === curr.orbitedObjectName);
        if (parent) {
          reach += (parent.distanceOrbited || 0);
          curr = parent;
        } else {
          break;
        }
      }
      return reach;
    };

    let maxOrbitX_AU = shellRadius;
    let maxOrbitY_AU = shellRadius;

    allObjects.forEach((o: any) => {
      if (o.type === 'note' || o.type === 'legend' || o.type === 'constellation') return;
      const objMaxReach = getMaxAbsoluteReach(o, allObjects);
      if (objMaxReach > maxOrbitX_AU) maxOrbitX_AU = objMaxReach;
      if (objMaxReach > maxOrbitY_AU) maxOrbitY_AU = objMaxReach;
    });

    let maxNoteX_AU = maxOrbitX_AU;
    let maxNoteY_AU = maxOrbitY_AU;

    allObjects.filter((o:any) => o.type === 'note').forEach((note: any) => {
      const distAU = note.noteDistanceAU || 0;
      const rad = ((note.noteAngle || 0) * Math.PI) / 180;
      const noteX_AU = Math.cos(rad) * distAU;
      const noteY_AU = Math.sin(rad) * distAU;
      const textBufferAU = 0; 
      if (noteX_AU + textBufferAU > maxNoteX_AU) maxNoteX_AU = noteX_AU + textBufferAU;
      if (noteY_AU + textBufferAU > maxNoteY_AU) maxNoteY_AU = noteY_AU + textBufferAU;
    });

    let minLegendX_AU = -shellRadius - shellRadius;
    const legends = allObjects.filter((o:any) => o.type === 'legend');
    if (legends.length > 0) {
      minLegendX_AU = 0;
      legends.forEach((legend: any) => {
        const distAU = legend.legendDistanceAU || 0;
        const rad = ((legend.legendAngle || 0) * Math.PI) / 180;
        const legX_AU = Math.cos(rad) * distAU;
        const textBufferAU = 0;
        if (legX_AU - textBufferAU < minLegendX_AU) minLegendX_AU = legX_AU - textBufferAU;
      });
    }

    const directoryStartX_AU = minLegendX_AU;
    const directoryWidthModel = shellRadius;
    
    const mapTopY_AU = -shellRadius;
    const mapBottomY_AU = Math.max(maxOrbitY_AU, maxNoteY_AU);
    const mapRightX_AU = Math.max(maxOrbitX_AU, maxNoteX_AU);
    
    const paddingAU = shellRadius * 0.25;

    const paperWidthAU = (mapRightX_AU - directoryStartX_AU) + paddingAU * 2;
    const paperHeightAU = (mapBottomY_AU - mapTopY_AU) + paddingAU * 2;

    const margin = 0.90;
    const targetZoomX = (dimensions.width * margin) / paperWidthAU;
    const topOffsetPx = 0;
    const availableHeight = dimensions.height - topOffsetPx;
    const targetZoomY = (availableHeight * margin) / paperHeightAU;
    const targetZoom = Math.min(targetZoomX, targetZoomY);
    
    // Geometric center of the custom bounds
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
