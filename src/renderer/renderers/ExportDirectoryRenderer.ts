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
  const exportWidth = 3300;
  const exportHeight = 2550;

  const exportCanvas = document.createElement('canvas');
  exportCanvas.width = exportWidth;
  exportCanvas.height = exportHeight;

  const ctx = exportCanvas.getContext('2d');
  if (!ctx) return;

  const isParchment = mapTheme === 'parchment';
  const colorBg = isParchment ? '#f4edd8' : '#0f1015';
  const colorStroke = isParchment ? '#2b2316' : '#e2e4ec';
  const colorBorder = isParchment ? '#c8b185' : '#3f4458';
  const colorGold = isParchment ? '#b58315' : '#e2b34a';

  // 1. Fill base background
  ctx.fillStyle = colorBg;
  ctx.fillRect(0, 0, exportWidth, exportHeight);

  // 2. Draw double frame borders
  ctx.lineWidth = 15;
  ctx.strokeStyle = colorBorder;
  ctx.strokeRect(30, 30, exportWidth - 60, exportHeight - 60);

  ctx.lineWidth = 2;
  ctx.strokeStyle = colorStroke;
  ctx.strokeRect(55, 55, exportWidth - 110, exportHeight - 110);

  // 3. Render map on the right pane (from x = 1100 to 3200)
  const mapW = 2100;
  const mapH = 2370;
  const mapX = 1100;
  const mapY = 90;

  // Create virtual canvas for clipping
  const mapCanvas = document.createElement('canvas');
  mapCanvas.width = mapW;
  mapCanvas.height = mapH;
  const mapCtx = mapCanvas.getContext('2d');
  
  if (mapCtx) {
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
    const minDim = Math.min(mapW, mapH);
    const exportZoom = (minDim * (0.45 / shellScale)) / maxDist;
    const exportPan = { x: mapW / 2, y: mapH / 2 };

    const positions = calculateSystemPositions(objects, currentSystemDate);

    const project = (xModel: number, yModel: number) => {
      return {
        x: exportPan.x + xModel * exportZoom,
        y: exportPan.y + yModel * exportZoom,
      };
    };

    const context: MapStyleContext = {
      ctx: mapCtx,
      width: mapW,
      height: mapH,
      activeZoom: exportZoom,
      activePan: exportPan,
      objects,
      visibleObjects,
      positions,
      activeSphere,
      isPrimary,
      project,
      fontsLoaded: true // assuming fonts are loaded for export
    };

    renderer.render(context);
    ctx.drawImage(mapCanvas, mapX, mapY);
  }

  // 4. Draw directory/legend on the left pane (from x = 90 to 1050)
  ctx.save();
  
  // Draw divider line
  ctx.beginPath();
  ctx.moveTo(1080, 90);
  ctx.lineTo(1080, exportHeight - 90);
  ctx.strokeStyle = colorBorder;
  ctx.lineWidth = 4;
  ctx.stroke();

  // Render Directory Header
  ctx.fillStyle = colorStroke;
  ctx.font = "bold 60px 'Mephisto', 'Cinzel', serif";
  ctx.fillText((activeSphere?.sphereName || 'CRYSTAL SPHERE').toUpperCase(), 110, 160);

  ctx.font = "normal 32px 'Mephisto', 'Outfit', sans-serif";
  ctx.fillStyle = isParchment ? '#5e4f3c' : '#8e95ad';
  ctx.fillText(`System Directory — Epoch: Day ${currentSystemDate}`, 110, 220);

  // Render directory items
  let curY = 320;

  // Render primary planets
  const primaries = visibleObjects.filter((o) => 
    o.type === 'star' || isPrimary(o)
  );
  
  primaries.forEach((obj) => {
    if (curY > exportHeight - 200) return; // Bounds limit

    // Draw symbol circle
    ctx.beginPath();
    ctx.arc(140, curY + 20, 25, 0, 2 * Math.PI);
    ctx.strokeStyle = colorStroke;
    ctx.lineWidth = 3;
    ctx.stroke();
    if (obj.type === 'star') {
      ctx.fillStyle = colorGold;
      ctx.fill();
    }

    // Draw details
    ctx.fillStyle = colorStroke;
    ctx.font = "bold 38px 'Mephisto', 'Cinzel', serif";
    ctx.fillText(obj.name, 200, curY + 15);

    ctx.font = "italic 24px 'Mephisto', 'Outfit', sans-serif";
    ctx.fillStyle = isParchment ? '#5e4f3c' : '#8e95ad';
    const period = calculateSystemPositions([obj], 0)[obj.name]?.period || 0;
    ctx.fillText(
      `${obj.type.toUpperCase()} | Dist: ${obj.distanceOrbited.toFixed(2)} AU | Period: ${Math.round(period)} Days`,
      200,
      curY + 50
    );

    ctx.font = "normal 24px 'Mephisto', 'Outfit', sans-serif";
    ctx.fillStyle = colorStroke;
    
    // Wrap description text
    const desc = obj.description || 'No description provided.';
    const words = desc.split(' ');
    let line = '';
    let descY = curY + 85;
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > 800 && n > 0) {
        ctx.fillText(line, 200, descY);
        line = words[n] + ' ';
        descY += 32;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, 200, descY);

    // Check moons under this planet
    const moons = visibleObjects.filter((m) => m.orbitedObjectName === obj.name);
    if (moons.length > 0) {
      ctx.font = "bold 22px 'Mephisto', 'Outfit', sans-serif";
      ctx.fillStyle = isParchment ? '#8f3224' : '#4480e6';
      ctx.fillText(`Moons: ${moons.map((m) => m.name).join(', ')}`, 200, descY + 42);
      descY += 35;
    }

    curY = descY + 90;
  });

  ctx.restore();

  // Trigger file save
  const dataUrl = exportCanvas.toDataURL('image/png');
  const defaultName = `${activeSphere?.sphereName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_system_nav_chart.png`;

  await saveCanvasExport(dataUrl, defaultName, 'Navigation Chart', setToastMessage);
}
