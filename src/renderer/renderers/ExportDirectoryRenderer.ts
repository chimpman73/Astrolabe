import { CelestialObject, CrystalSphere } from '../../types/astrolabe';
import { MapStyleContext, INavigationChartRenderer } from '../../types/renderer';
import { ScaleManager } from '../utils/ScaleManager';
import { calculateSystemPositions } from '../utils/orbitMath';
import { saveCanvasExport } from '../utils/exportHelper';

export interface ExportNavigationChartParams {
  mapTheme: 'parchment' | 'space';
  activeSphere: CrystalSphere | null;
  currentSystemDate: number;
  objects: CelestialObject[];
  visibleObjects: CelestialObject[];
  isPrimary: (obj: CelestialObject) => boolean;
  setToastMessage: (msg: any) => void;
  renderer: INavigationChartRenderer;
}

export async function exportNavigationChart({
  mapTheme,
  activeSphere,
  currentSystemDate,
  objects,
  visibleObjects,
  isPrimary,
  setToastMessage,
  renderer
}: ExportNavigationChartParams): Promise<void> {
  const isParchment = mapTheme === 'parchment';
  
  const primaryObjects = objects.filter((o) => 
    o.distanceOrbited >= 0 && isPrimary(o)
  );
  let maxDist = 0.1;
  primaryObjects.forEach(o => {
    const reach = ScaleManager.getPhysicalReachAU(o);
    if (reach > maxDist) maxDist = reach;
  });
  
  const isCustom = activeSphere?.shellBoundaryType === 'custom' || activeSphere?.shellBoundaryType === 'relativeMargin';
  const shellScale = isCustom ? (activeSphere?.shellCustomScale ?? 1.2) : 2.0;

  // Calculate resolution
  // We want a high-res output, so we calculate an exportZoom that gives us a good size
  const exportZoom = 1200 / (maxDist * shellScale);
  
  const shellRadiusPx = maxDist * shellScale * exportZoom;
  const paddingPx = shellRadiusPx * 0.25;
  const directoryWidthPx = isParchment ? shellRadiusPx : 0;
  
  const paperWidthPx = shellRadiusPx * 2 + paddingPx * 2 + directoryWidthPx;
  const paperHeightPx = shellRadiusPx * 2 + paddingPx * 2;
  
  // Include room for the wooden rods or outer margin (approx 6% padding)
  const exportWidth = Math.round(paperWidthPx * 1.06);
  const exportHeight = Math.round(paperHeightPx * 1.06);

  const exportCanvas = document.createElement('canvas');
  exportCanvas.width = exportWidth;
  exportCanvas.height = exportHeight;
  const ctx = exportCanvas.getContext('2d');
  if (!ctx) return;

  // Center panning to include the asymmetrical offset
  const exportPan = { 
    x: exportWidth / 2 + directoryWidthPx / 2, 
    y: exportHeight / 2 
  };

  const positions = calculateSystemPositions(objects, currentSystemDate);
  const project = (xModel: number, yModel: number) => {
    return {
      x: exportPan.x + xModel * exportZoom,
      y: exportPan.y + yModel * exportZoom,
    };
  };

  const context: MapStyleContext = {
    ctx,
    width: exportWidth,
    height: exportHeight,
    activeZoom: exportZoom,
    activePan: exportPan,
    objects,
    visibleObjects,
    positions,
    activeSphere,
    currentSystemDate,
    isPrimary,
    project,
    fontsLoaded: true // assuming fonts are loaded for export
  };

  // Render the view
  renderer.render(context);

  // Trigger file save
  const dataUrl = exportCanvas.toDataURL('image/png');
  const defaultName = `${activeSphere?.sphereName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_system_nav_chart.png`;

  await saveCanvasExport(dataUrl, defaultName, 'Navigation Chart', setToastMessage);
}
