import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle, useMemo } from 'react';
import { useSystemStore } from '../store/useSystemStore';
import { calculateSystemPositions } from '../utils/orbitMath';
// unused imports removed
import { saveCanvasExport } from '../utils/exportHelper';
import { ScaleManager } from '../utils/ScaleManager';
import { VellumStyle } from '../styles/VellumStyle';
import { SpaceStyle } from '../styles/SpaceStyle';
import { MapStyleContext } from '../../types/renderer';

export interface NavChartCanvasHandle {
  handleZoom: (factor: number) => void;
  handleAutoFit: () => void;
  handleExport: () => Promise<void>;
}

const MIN_ZOOM = 5;
const MAX_ZOOM = 1000;

export interface NavChartCanvasProps {
  mapTheme: 'parchment' | 'space';
}

export const NavChartCanvas = forwardRef<NavChartCanvasHandle, NavChartCanvasProps>(({ mapTheme }, ref) => {
  const {
    activeSphere,
    currentSystemDate,
    setToastMessage,
    viewMode,
    decorations,
  } = useSystemStore();

  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [forceRenderState, setForceRenderState] = useState(0);

  const forceRedraw = () => setForceRenderState(s => s + 1);

  const stylesRef = useRef({
    vellum: new VellumStyle(forceRedraw),
    space: new SpaceStyle()
  });

  const objects = activeSphere?.objects || [];
  
  const isPrimary = (obj: any) => {
    if (!obj.orbitedObjectName) return true;
    const parent = objects.find((p: any) => p.name === obj.orbitedObjectName);
    if (parent && !parent.orbitedObjectName && parent.distanceOrbited === 0) return true;
    return false;
  };

  const [dimensions, setDimensions] = useState({ width: 850, height: 600 });
  const [{ zoom, pan }, setViewport] = useState({ zoom: 1, pan: { x: 425, y: 300 } });
  
  const setZoom = (fn: (z: number) => number) => {
      setViewport(prev => ({ ...prev, zoom: fn(prev.zoom) }));
  };

  const setPan = (fn: (p: {x: number, y: number}) => {x: number, y: number}) => {
      setViewport(prev => ({ ...prev, pan: fn(prev.pan) }));
  };

  const panLimits = useMemo(() => {
    if (mapTheme !== 'parchment') return null;
    let maxDist = 0.1;
    objects.forEach((o: any) => {
      if (!isPrimary(o) || o.affectsShellBoundary === false) return;
      const dist = o.distanceOrbited;
      const reach = o.type === 'living_world' ? dist + ((o.sizeUnit === 'AU' ? (o.physicalSize ?? 0) : ((o.physicalSize ?? 0) / 92955807)) / 2) : dist;
      if (reach > maxDist) maxDist = reach;
    });
    const isCustom = activeSphere?.shellBoundaryType === 'custom' || activeSphere?.shellBoundaryType === 'relativeMargin';
    const shellScale = isCustom ? (activeSphere?.shellCustomScale ?? 1.2) : 2.0;
    const shellRadiusModel = maxDist * shellScale;
    
    // 25% padding ensures the 24px title has room to breathe horizontally
    const paddingModel = shellRadiusModel * 0.25;
    const paperWidthModel = shellRadiusModel * 2 + paddingModel * 2;
    const totalWidthModel = paperWidthModel * 1.06; // rod margins
    const totalHeightModel = paperWidthModel;
    
    return { width: totalWidthModel, height: totalHeightModel };
  }, [objects, activeSphere, mapTheme]);

  const minZoomLimit = useMemo(() => {
    if (!panLimits || dimensions.width === 0) return 0.5;
    const deskMargin = 40;
    const minZoomX = (dimensions.width - deskMargin * 2) / panLimits.width;
    const minZoomY = (dimensions.height - deskMargin * 2) / panLimits.height;
    return Math.max(Math.min(minZoomX, minZoomY), 0.1);
  }, [panLimits, dimensions]);

  const constrainPan = (p: { x: number; y: number }, z: number) => {
    if (!panLimits || mapTheme !== 'parchment') return p;
    const paperW = panLimits.width * z;
    const paperH = panLimits.height * z;
    const deskMargin = 40;
    
    let minX, maxX, minY, maxY;
    if (paperW <= dimensions.width) {
      minX = dimensions.width / 2;
      maxX = dimensions.width / 2;
    } else {
      minX = dimensions.width - deskMargin - paperW / 2;
      maxX = paperW / 2 + deskMargin;
    }
    
    if (paperH <= dimensions.height) {
      minY = dimensions.height / 2 + 25; // Shift center down to account for toolbar
      maxY = dimensions.height / 2 + 25;
    } else {
      minY = dimensions.height - deskMargin - paperH / 2;
      maxY = paperH / 2 + deskMargin + 25; // allow panning down slightly more to see top
    }
    
    return {
      x: Math.max(minX, Math.min(p.x, maxX)),
      y: Math.max(minY, Math.min(p.y, maxY))
    };
  };

  useEffect(() => {
    if (mapTheme === 'parchment' && zoom < minZoomLimit) {
      setZoom(() => minZoomLimit);
      setPan(p => constrainPan(p, minZoomLimit));
    }
  }, [minZoomLimit, zoom, mapTheme]);

  useEffect(() => {
    if (document.fonts) {
      document.fonts.ready.then(() => {
        setFontsLoaded(true);
      });
    }
  }, []);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const { width, height } = entries[0].contentRect;
      setDimensions({ width, height });
    });

    resizeObserver.observe(container);
    return () => {
      resizeObserver.disconnect();
    };
  }, []);
  
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const visibleObjects = objects.filter((o: any) => !o.isHidden && (viewMode === 'DM' || !o.isDMOnly));
  
  // Resolve positions
  const positions = calculateSystemPositions(objects, currentSystemDate);

  const handleAutoFit = () => {
    if (visibleObjects.length === 0) return;
    
    let maxDist = 0.1;
    let absoluteMaxDist = 0.1;
    objects.forEach((o: any) => {
      if (!isPrimary(o)) return;
      const dist = o.distanceOrbited;
      const reach = o.type === 'living_world' ? dist + ((o.sizeUnit === 'AU' ? (o.physicalSize ?? 0) : ((o.physicalSize ?? 0) / 92955807)) / 2) : dist;
      if (o.affectsShellBoundary !== false && reach > maxDist) maxDist = reach;
      if (reach > absoluteMaxDist) absoluteMaxDist = reach;
    });
    
    const isCustom = activeSphere?.shellBoundaryType === 'custom' || activeSphere?.shellBoundaryType === 'relativeMargin';
    const shellScale = isCustom ? (activeSphere?.shellCustomScale ?? 1.2) : 2.0;
    
    const shellRadius = maxDist * shellScale;
    const viewRadius = Math.max(absoluteMaxDist, shellRadius);
    
    const minDim = Math.min(dimensions.width, dimensions.height);
    const targetZoom = (minDim * 0.45) / viewRadius;
    
    // Offset the target pan down by 25px so the title isn't hidden under the toolbar
    setViewport({ zoom: targetZoom, pan: { x: dimensions.width / 2, y: dimensions.height / 2 + 25 } });
  };

  useImperativeHandle(ref, () => ({
    handleZoom: (factor: number) => {
        setZoom((z) => {
            const newZoom = Math.max(Math.min(z * factor, MAX_ZOOM), mapTheme === 'parchment' ? minZoomLimit : MIN_ZOOM);
            setPan(p => constrainPan(p, newZoom));
            return newZoom;
        });
    },
    handleAutoFit,
    handleExport,
  }));

  const lastDimensions = useRef({ width: 0, height: 0 });
  const lastFitSphere = useRef<string | null>(null);

  useEffect(() => {
    if (dimensions.width > 0 && dimensions.height > 0) {
      if (
        lastFitSphere.current !== activeSphere?.sphereName ||
        lastDimensions.current.width !== dimensions.width ||
        lastDimensions.current.height !== dimensions.height
      ) {
        handleAutoFit();
        lastFitSphere.current = activeSphere?.sphereName || null;
        lastDimensions.current = dimensions;
      }
    }
  }, [activeSphere?.sphereName, dimensions.width, dimensions.height]);

  const drawMap = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    theme: 'parchment' | 'space',
    activeZoom: number,
    activePan: { x: number; y: number }
  ) => {
    const project = (xModel: number, yModel: number) => {
      return {
        x: activePan.x + xModel * activeZoom,
        y: activePan.y + yModel * activeZoom,
      };
    };

    const culledObjects = new Set<string>();
    visibleObjects.forEach((obj: any) => {
      if (obj.orbitedObjectName && obj.orbitedObjectName !== obj.name && !isPrimary(obj)) {
        const orbitRadiusPx = obj.distanceOrbited * activeZoom;
        const parent = objects.find((o: any) => o.name === obj.orbitedObjectName);
        let cullThreshold = 10;
        if (parent) {
          const parentSize = ScaleManager.getNavChartVisualRadius(parent.sizeClass || 'D', parent.physicalSize || 1000, parent.sizeUnit || 'miles', activeZoom);
          cullThreshold = parentSize + 5;
        }
        if (orbitRadiusPx < cullThreshold) {
          culledObjects.add(obj.name);
        }
      }
    });

    const activeVisibleObjects = visibleObjects.filter((obj: any) => !culledObjects.has(obj.name));
    const activeStyle = theme === 'parchment' ? stylesRef.current.vellum : stylesRef.current.space;

    const context: MapStyleContext = {
      ctx,
      width,
      height,
      activeZoom,
      activePan,
      objects,
      visibleObjects,
      positions,
      activeSphere,
      isPrimary,
      project,
      decorations,
      fontsLoaded
    };

    activeStyle.drawBackground(context);
    activeStyle.drawGrid(context);
    activeStyle.drawDecorations(context);
    activeStyle.drawOrbits(context, activeVisibleObjects);

    let maxDist = 0.1;
    objects.forEach((o: any) => {
      if (!isPrimary(o) || o.affectsShellBoundary === false) return;
      const dist = o.distanceOrbited;
      const reach = o.type === 'living_world' ? dist + ((o.sizeUnit === 'AU' ? (o.physicalSize ?? 0) : ((o.physicalSize ?? 0) / 92955807)) / 2) : dist;
      if (reach > maxDist) maxDist = reach;
    });
    const shellProj = project(0, 0);
    const isCustom = activeSphere?.shellBoundaryType === 'custom' || activeSphere?.shellBoundaryType === 'relativeMargin';
    const shellScale = isCustom ? (activeSphere?.shellCustomScale ?? 1.2) : 2.0;
    const shellRadius = maxDist * shellScale * activeZoom;

    activeStyle.drawShell(context, shellRadius, shellProj);
    
    activeStyle.drawBodies(context, activeVisibleObjects);
    activeStyle.drawScaleBar(context);

    if (activeStyle.drawForeground) {
      activeStyle.drawForeground(context);
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    drawMap(ctx, dimensions.width, dimensions.height, mapTheme, zoom, constrainPan(pan, zoom));
  }, [activeSphere, currentSystemDate, zoom, pan, mapTheme, objects, positions, dimensions, fontsLoaded, decorations, forceRenderState]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;
    setPan(() => constrainPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    }, zoom));
  };

  const handleMouseUpOrLeave = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    const zoomFactor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect || !canvasRef.current) return;
    
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    setZoom((z) => {
      const newZoom = Math.min(Math.max(z * zoomFactor, mapTheme === 'parchment' ? minZoomLimit : MIN_ZOOM), MAX_ZOOM);
      
      // Calculate new pan to zoom toward mouse
      const scale = newZoom / z;
      const newPan = constrainPan({
        x: mouseX - (mouseX - pan.x) * scale,
        y: mouseY - (mouseY - pan.y) * scale,
      }, newZoom);
      
      setPan(() => newPan);
      return newZoom;
    });
  };

  // Export full map layout (Landscape 300 DPI: 11" x 8.5" = 3300px x 2550px)
  const handleExport = async () => {
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
        const reach = o.type === 'living_world' ? o.distanceOrbited + ((o.sizeUnit === 'AU' ? (o.physicalSize ?? 0) : ((o.physicalSize ?? 0) / 92955807)) / 2) : o.distanceOrbited;
        if (reach > maxDist) maxDist = reach;
      });
      const isCustom = activeSphere?.shellBoundaryType === 'custom' || activeSphere?.shellBoundaryType === 'relativeMargin';
      const shellScale = isCustom ? (activeSphere?.shellCustomScale ?? 1.2) : 2.0;
      const minDim = Math.min(mapW, mapH);
      const exportZoom = (minDim * (0.45 / shellScale)) / maxDist;
      const exportPan = { x: mapW / 2, y: mapH / 2 };

      drawMap(mapCtx, mapW, mapH, mapTheme, exportZoom, exportPan);
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
    ctx.fillText(`System Directory â€” Epoch: Day ${currentSystemDate}`, 110, 220);

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
  };


  return (
    <div ref={containerRef} className="navchart-canvas-container">
      <canvas
        ref={canvasRef}
        width={dimensions.width}
        height={dimensions.height}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUpOrLeave}
        onMouseLeave={handleMouseUpOrLeave}
        onWheel={handleWheel}
        className="navchart-canvas"
      />
    </div>
  );
});
