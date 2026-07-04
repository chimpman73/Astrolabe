import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { useSystemStore } from '../store/useSystemStore';
import { calculateSystemPositions } from '../utils/orbitMath';
// unused imports removed
import { saveCanvasExport } from '../utils/exportHelper';
import { drawSolidBody, drawStationaryIndicator, getMotionSuffix, getBodyColors, getElementColor } from '../utils/canvasRenderer';

export interface NavChartCanvasHandle {
  handleZoom: (factor: number) => void;
  handleAutoFit: () => void;
  handleExport: () => Promise<void>;
}

export interface NavChartCanvasProps {
  mapTheme: 'parchment' | 'space';
}

export const NavChartCanvas = forwardRef<NavChartCanvasHandle, NavChartCanvasProps>(({ mapTheme }, ref) => {
  const {
    activeSphere,
    currentSystemDate,
    setToastMessage,
  } = useSystemStore();

  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    if (document.fonts) {
      document.fonts.ready.then(() => {
        setFontsLoaded(true);
      });
    }
  }, []);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [dimensions, setDimensions] = useState({ width: 850, height: 600 });

  // ResizeObserver to handle dynamic sizing of the canvas wrapper container
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
  


  // Canvas interaction state (Zoom & Pan)
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });

  // Map theme (space vs parchment) is now a prop

  const objects = activeSphere?.objects || [];
  const visibleObjects = objects.filter(o => !o.isHidden);
  
  // Central body is implicitly (0,0).

  // Resolve positions
  const positions = calculateSystemPositions(objects, currentSystemDate);



  const handleAutoFit = () => {
    if (visibleObjects.length === 0) return;
    
    let maxDist = 0.1;
    objects.forEach(o => {
      const pos = positions[o.name];
      if (!pos) return;
      const dist = Math.sqrt(pos.x * pos.x + pos.y * pos.y);
      const reach = o.type === 'living_world' ? dist + (o.branchExtent || 0) : dist;
      if (reach > maxDist) maxDist = reach;
    });
    
    const isCustom = activeSphere?.shellBoundaryType === 'custom' || activeSphere?.shellBoundaryType === 'relativeMargin';
    const shellScale = isCustom ? (activeSphere?.shellCustomScale ?? 1.2) : 2.0;
    
    // The Crystal Sphere Shell is drawn at shellScale * maxDist. We want it to fit comfortably inside the canvas viewport.
    const targetZoom = (dimensions.height * (0.5 / shellScale)) / maxDist;
    
    setZoom(targetZoom);
    setPan({ x: dimensions.width / 2, y: dimensions.height / 2 });
  };

  useImperativeHandle(ref, () => ({
    handleZoom,
    handleAutoFit,
    handleExport,
  }));

  // Set default zoom based on max distance and active dimensions
  const lastFitSphere = useRef<string | null>(null);

  useEffect(() => {
    if (dimensions.width > 0 && dimensions.height > 0) {
      if (lastFitSphere.current !== activeSphere?.sphereName) {
        handleAutoFit();
        lastFitSphere.current = activeSphere?.sphereName || null;
      }
    }
  }, [activeSphere?.sphereName, dimensions.width, dimensions.height]);

  // Canvas drawing routine
  const drawMap = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    theme: 'parchment' | 'space',
    activeZoom: number,
    activePan: { x: number; y: number }
  ) => {
    const isParchment = theme === 'parchment';
    
    // Color definitions
    const colorBg = isParchment ? '#f9f5e8' : '#06070a';
    const colorGrid = isParchment ? 'rgba(94, 79, 60, 0.05)' : 'rgba(255, 255, 255, 0.03)';
    const colorOrbit = isParchment ? 'rgba(94, 79, 60, 0.18)' : 'rgba(255, 255, 255, 0.15)';
    const colorOrbitDash = isParchment ? 'rgba(143, 50, 36, 0.25)' : 'rgba(68, 128, 230, 0.3)';
    const colorStroke = isParchment ? '#2b2316' : '#ffffff';
    const colorMuted = isParchment ? '#7c694e' : '#888d9e';
    const colorGold = isParchment ? '#b58315' : '#e2b34a';

    // Clear background
    ctx.fillStyle = colorBg;
    ctx.fillRect(0, 0, width, height);

    // Draw Grid (Navigational Lines)
    ctx.strokeStyle = colorGrid;
    ctx.lineWidth = 1;
    const gridSize = 80;
    
    // Draw circular compass-like navigation grids
    ctx.beginPath();
    for (let r = gridSize; r < Math.max(width, height); r += gridSize) {
      ctx.arc(activePan.x, activePan.y, r, 0, 2 * Math.PI);
    }
    ctx.stroke();

    // Radial spokes
    ctx.beginPath();
    const spokes = 12;
    for (let i = 0; i < spokes; i++) {
      const rad = (i * 2 * Math.PI) / spokes;
      const x = Math.cos(rad) * Math.max(width, height);
      const y = Math.sin(rad) * Math.max(width, height);
      ctx.moveTo(activePan.x, activePan.y);
      ctx.lineTo(activePan.x + x, activePan.y + y);
    }
    ctx.stroke();

    // Compass Rose decoration (drawn at coordinate origin)
    const starProjRaw = { x: activePan.x, y: activePan.y };
    if (!isParchment) {
      // Draw a subtle sun icon behind the center if it's space theme
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const rad = (i * Math.PI) / 4;
        ctx.moveTo(starProjRaw.x, starProjRaw.y);
        ctx.lineTo(starProjRaw.x + Math.cos(rad) * 15, starProjRaw.y + Math.sin(rad) * 15);
      }
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Project coordinates from model space (AU) to canvas space
    const project = (xModel: number, yModel: number) => {
      return {
        x: activePan.x + xModel * activeZoom,
        y: activePan.y + yModel * activeZoom,
      };
    };

    // 1. Draw orbits (back-to-front)
    visibleObjects.forEach((obj) => {
      // Find parent coordinate in model space
      let px = 0;
      let py = 0;
      if (obj.orbitedObjectName && obj.orbitedObjectName !== obj.name) {
        const parentPos = positions[obj.orbitedObjectName];
        if (parentPos) {
          px = parentPos.x;
          py = parentPos.y;
        }
      }

      const parentProj = project(px, py);
      const orbitRadius = obj.distanceOrbited * activeZoom;

      if (orbitRadius > 0) {
        ctx.beginPath();
        ctx.arc(parentProj.x, parentProj.y, orbitRadius, 0, 2 * Math.PI);
        const isPrimary = (o: any) => {
          if (!o.orbitedObjectName) return true;
          const parent = visibleObjects.find((p) => p.name === o.orbitedObjectName);
          if (parent && !parent.orbitedObjectName && parent.distanceOrbited === 0) return true;
          return false;
        };
        const isPrimaryOrbit = isPrimary(obj);
        ctx.lineWidth = isPrimaryOrbit ? 1.2 : 0.75;
        ctx.strokeStyle = isPrimaryOrbit ? colorOrbit : colorOrbitDash;
        ctx.stroke();
      }
    });

    // 2. Draw outer Crystal Sphere Shell boundary if max planet exists
      let maxDist = 0.1;
      objects.forEach(o => {
        const pos = positions[o.name];
        if (!pos) return;
        const dist = Math.sqrt(pos.x * pos.x + pos.y * pos.y);
        const reach = o.type === 'living_world' ? dist + (o.branchExtent || 0) : dist;
        if (reach > maxDist) maxDist = reach;
      });
      const shellProj = project(0, 0);
      const isCustom = activeSphere?.shellBoundaryType === 'custom' || activeSphere?.shellBoundaryType === 'relativeMargin';
      const shellScale = isCustom ? (activeSphere?.shellCustomScale ?? 1.2) : 2.0;
      const shellRadius = maxDist * shellScale * activeZoom;

      // Draw thick outer sphere boundary
      ctx.beginPath();
      ctx.arc(shellProj.x, shellProj.y, shellRadius, 0, 2 * Math.PI);
      ctx.strokeStyle = colorStroke;
      ctx.lineWidth = 3;
      ctx.stroke();
      
      ctx.beginPath();
      ctx.arc(shellProj.x, shellProj.y, shellRadius - 5, 0, 2 * Math.PI);
      ctx.lineWidth = 0.75;
      ctx.stroke();

      // Draw shell title
      ctx.font = `bold 24px 'Elan', 'Cinzel', serif`;
      ctx.fillStyle = colorStroke;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(
        (activeSphere?.sphereName || 'CRYSTAL SHELL').toUpperCase() + ' SHELL',
        shellProj.x,
        shellProj.y - shellRadius - 10
      );

    // 3. Draw bodies (nebulas, sargassos, and solid bodies) in array order (z-index)
    visibleObjects.forEach((obj) => {
      const pos = positions[obj.name];
      if (!pos) return;

      // Resolve parent canvas position
      let px = 0, py = 0;
      if (obj.orbitedObjectName) {
        const parentPos = positions[obj.orbitedObjectName];
        if (parentPos) { px = parentPos.x; py = parentPos.y; }
      }
      const parentProj = project(px, py);
      const proj = project(pos.x, pos.y);
      const renderSize = Math.max(3, (obj.size / 100) * 20);

      if (obj.type === 'cloud') {
        if (obj.distanceOrbited <= 0) return;
        const orbitR = obj.distanceOrbited * activeZoom;
        const cloudFill = getElementColor(obj.elementAffinity || null) || (isParchment ? '#808080' : '#a0a0a0');
        
        drawSolidBody(ctx, proj.x, proj.y, obj, renderSize, cloudFill, '#505050', false, activeZoom,
          false, parentProj.x, parentProj.y, orbitR, pos.angle
        );
      } else {
        // Solid body drawing
        const { bodyFill, bodyStroke } = getBodyColors(obj, isParchment, colorBg, colorStroke, colorGold);

        drawSolidBody(ctx, proj.x, proj.y, obj, renderSize, bodyFill, bodyStroke, false, activeZoom);

        // Star sunburst ring removed because it is now drawn as a corona inside drawSolidBody

        // --- Stationary diamond ring indicator ---
        if (obj.isStationary && obj.type !== 'star') {
          drawStationaryIndicator(ctx, proj.x, proj.y, renderSize, colorMuted);
        }
      }

      // Label (with motion indicator suffix)
      const shouldLabel = obj.type !== 'moon' || activeZoom > 150;
      if (shouldLabel) {
          const motionTag = getMotionSuffix(obj.isStationary, obj.orbitDirection);
          ctx.font = obj.type === 'star'
            ? `bold 12px 'Elan', 'Cinzel', serif`
            : `500 10px 'Elan', 'Outfit', sans-serif`;
          ctx.fillStyle = colorStroke;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';
        ctx.fillText(obj.name + motionTag, proj.x, proj.y + renderSize + 5);
      }
    });

  };

  // Redraw canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    drawMap(ctx, dimensions.width, dimensions.height, mapTheme, zoom, pan);
  }, [activeSphere, currentSystemDate, zoom, pan, mapTheme, objects, positions, dimensions, fontsLoaded]);

  // Handle dragging/panning
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    dragStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y,
    });
  };

  const handleMouseUpOrLeave = () => {
    setIsDragging(false);
  };

  // Zoom logic
  const handleZoom = (factor: number) => {
    setZoom((prevZoom) => {
      const newZoom = Math.max(5, Math.min(1000, prevZoom * factor));
      setPan((prevPan) => {
        const mouseX = dimensions.width / 2;
        const mouseY = dimensions.height / 2;
        const modelX = (mouseX - prevPan.x) / prevZoom;
        const modelY = (mouseY - prevPan.y) / prevZoom;
        return {
          x: mouseX - modelX * newZoom,
          y: mouseY - modelY * newZoom,
        };
      });
      return newZoom;
    });
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    const zoomFactor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    setZoom((prevZoom) => {
      const newZoom = Math.max(5, Math.min(1000, prevZoom * zoomFactor));
      setPan((prevPan) => {
        const modelX = (mouseX - prevPan.x) / prevZoom;
        const modelY = (mouseY - prevPan.y) / prevZoom;
        return {
          x: mouseX - modelX * newZoom,
          y: mouseY - modelY * newZoom,
        };
      });
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
      const isPrimaryExp = (obj: any) => {
        if (!obj.orbitedObjectName) return true;
        const parent = objects.find((p) => p.name === obj.orbitedObjectName);
        if (parent && !parent.orbitedObjectName && parent.distanceOrbited === 0) return true;
        return false;
      };
      const primaryObjects = objects.filter((o) => 
        o.distanceOrbited > 0 && isPrimaryExp(o)
      );
      const maxDist = primaryObjects.reduce((max, o) => Math.max(max, o.distanceOrbited), 0.1);
      const isRelative = activeSphere?.shellBoundaryType === 'relativeMargin';
      const shellScale = isRelative ? 1.2 : 2.0;
      const exportZoom = (mapW * (0.8 / shellScale)) / maxDist;
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
    const isPrimaryLabel = (obj: any) => {
      if (!obj.orbitedObjectName) return true;
      const parent = visibleObjects.find((p) => p.name === obj.orbitedObjectName);
      if (parent && !parent.orbitedObjectName && parent.distanceOrbited === 0) return true;
      return false;
    };
    const primaries = visibleObjects.filter((o) => 
      o.type === 'star' || isPrimaryLabel(o)
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
    <div ref={containerRef} className="flex-1 w-full relative min-h-0 overflow-hidden">
      <canvas
        ref={canvasRef}
        width={dimensions.width}
        height={dimensions.height}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUpOrLeave}
        onMouseLeave={handleMouseUpOrLeave}
        onWheel={handleWheel}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        style={{ display: 'block' }}
      />
    </div>
  );
});
