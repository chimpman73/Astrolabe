import React, { useRef, useEffect, useState } from 'react';
import { useSystemStore } from '../store/useSystemStore';
import { calculateSystemPositions } from '../utils/orbitMath';
import { Play, Pause, FastForward, RotateCcw, Download, ZoomIn, ZoomOut, Maximize, ChevronLeft } from 'lucide-react';
import { saveCanvasExport } from '../utils/exportHelper';
import { drawSolidBody, drawStationaryIndicator, getMotionSuffix, getBodyColors } from '../utils/canvasRenderer';

interface NavChartViewProps {
  onCollapse?: () => void;
}

export const NavChartView: React.FC<NavChartViewProps> = ({ onCollapse }) => {
  const {
    activeSphere,
    currentSystemDate,
    setCurrentSystemDate,
    advanceSystemDate,
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
  
  // Animation state
  const [isPlaying, setIsPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState(1); // days per frame
  const animationRef = useRef<number | null>(null);

  // Canvas interaction state (Zoom & Pan)
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });

  // Map theme (space vs parchment)
  const [mapTheme, setMapTheme] = useState<'parchment' | 'space'>('parchment');

  const objects = activeSphere?.objects || [];
  
  // Central body is implicitly (0,0).

  // Resolve positions
  const positions = calculateSystemPositions(objects, currentSystemDate);

  // Playback loop
  useEffect(() => {
    if (isPlaying) {
      const step = () => {
        advanceSystemDate(playSpeed);
        animationRef.current = requestAnimationFrame(step);
      };
      animationRef.current = requestAnimationFrame(step);
    } else {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    }

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isPlaying, playSpeed, advanceSystemDate]);

  const handleAutoFit = () => {
    if (objects.length === 0) return;
    
    const isPrimary = (obj: any) => {
      if (!obj.orbitedObjectName) return true;
      const parent = objects.find((o) => o.name === obj.orbitedObjectName);
      if (parent && !parent.orbitedObjectName && parent.distanceOrbited === 0) return true;
      return false;
    };
    
    // Find max distance of primary objects
    const primaryObjects = objects.filter((o) => 
      o.distanceOrbited > 0 && isPrimary(o)
    );
    const maxDist = primaryObjects.reduce((max, o) => Math.max(max, o.distanceOrbited), 0.1);
    
    const isRelative = activeSphere?.shellBoundaryType === 'relativeMargin';
    const shellScale = isRelative ? 1.2 : 2.0;
    
    // The Crystal Sphere Shell is drawn at shellScale * maxDist. We want it to fit comfortably inside the canvas viewport.
    const minSize = Math.min(dimensions.width, dimensions.height);
    const targetZoom = (minSize * (0.44 / shellScale)) / maxDist; 
    
    setZoom(targetZoom);
    setPan({ x: dimensions.width / 2, y: dimensions.height / 2 });
  };

  // Set default zoom based on max distance and active dimensions
  useEffect(() => {
    handleAutoFit();
  }, [activeSphere, dimensions.width, dimensions.height]);

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
    objects.forEach((obj) => {
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
          const parent = objects.find((p) => p.name === o.orbitedObjectName);
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
    const isPrimaryOuter = (obj: any) => {
      if (!obj.orbitedObjectName) return true;
      const parent = objects.find((p) => p.name === obj.orbitedObjectName);
      if (parent && !parent.orbitedObjectName && parent.distanceOrbited === 0) return true;
      return false;
    };
    const primaryObjects = objects.filter((o) => 
      o.distanceOrbited > 0 && isPrimaryOuter(o)
    );
    if (primaryObjects.length > 0) {
      const maxDist = primaryObjects.reduce((max, o) => Math.max(max, o.distanceOrbited), 0.1);
      const shellProj = project(0, 0);
      const isRelative = activeSphere?.shellBoundaryType === 'relativeMargin';
      const shellRadius = maxDist * (isRelative ? 1.2 : 2) * activeZoom;

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
    }

    // 3a. Draw nebula / sargasso cloud shapes (rendered behind all solid bodies)
    // Cloud spans the orbital path, bounding points map to polar coordinates
    objects.forEach((obj) => {
      if (obj.type !== 'nebula' && obj.type !== 'sargasso') return;

      const pos = positions[obj.name];
      if (!pos || obj.distanceOrbited <= 0) return;

      // Resolve parent canvas position
      let px = 0, py = 0;
      if (obj.orbitedObjectName) {
        const parentPos = positions[obj.orbitedObjectName];
        if (parentPos) { px = parentPos.x; py = parentPos.y; }
      }
      const parentProj = project(px, py);

      const orbitR = obj.distanceOrbited * activeZoom;
      const arcDegrees = obj.arcDegrees ?? 30;
      const arcHalf = (arcDegrees / 2) * (Math.PI / 180);
      const centerAngle = pos.angle * (Math.PI / 180);

      // Match the planet render scale to ensure clouds have proportional thickness (radial depth)
      const renderSize = Math.max(3, (obj.size / 100) * 20);
      const halfH = Math.max(8, renderSize * 1.5);

      const isNebula = obj.type === 'nebula';
      const cloudFill = isParchment
        ? (isNebula ? 'rgba(80,110,200,0.4)' : 'rgba(50,150,80,0.4)')
        : (isNebula ? 'rgba(100,150,255,0.45)' : 'rgba(60,200,100,0.45)');

      const isFullRing = arcDegrees >= 359;
      const numBumps = Math.max(3, Math.floor(arcDegrees / 20));
      const numSegments = Math.max(40, Math.floor(arcDegrees * 1.5));

      ctx.save();
      ctx.beginPath();
      
      // Outer edge
      for (let i = 0; i <= numSegments; i++) {
        const t = i / numSegments;
        const nx = -1 + 2 * t; // -1 to 1
        const envelope = isFullRing ? 1 : (1 - nx * nx);
        const bump = 0.85 + 0.15 * Math.cos(nx * Math.PI * numBumps);
        
        const angle = centerAngle + nx * arcHalf;
        const rOuter = orbitR + halfH * envelope * bump;
        
        const x = parentProj.x + rOuter * Math.cos(angle);
        const y = parentProj.y + rOuter * Math.sin(angle);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      
      // Inner edge
      for (let i = numSegments; i >= 0; i--) {
        const t = i / numSegments;
        const nx = -1 + 2 * t;
        const envelope = isFullRing ? 1 : (1 - nx * nx);
        const bump = 0.85 + 0.15 * Math.cos(nx * Math.PI * numBumps);
        
        const angle = centerAngle + nx * arcHalf;
        const rInner = orbitR - halfH * envelope * bump;
        
        const x = parentProj.x + rInner * Math.cos(angle);
        const y = parentProj.y + rInner * Math.sin(angle);
        ctx.lineTo(x, y);
      }
      
      ctx.closePath();
      ctx.fillStyle = cloudFill;
      ctx.fill();
      ctx.restore();
    });

    // 3b. Draw solid bodies and labels (front-to-back)
    objects.forEach((obj) => {
      const pos = positions[obj.name];
      if (!pos) return;

      const proj = project(pos.x, pos.y);
      const renderSize = Math.max(3, (obj.size / 100) * 20);

      const { bodyFill, bodyStroke } = getBodyColors(obj, isParchment, colorBg, colorStroke, colorGold);

      // Draw Body (shape-aware) — skipped for cloud types; they are drawn as clouds in pass 3a
      if (obj.type !== 'nebula' && obj.type !== 'sargasso') {
        drawSolidBody(ctx, proj.x, proj.y, obj, renderSize, bodyFill, bodyStroke, false);

        // Star sunburst ring
        if (obj.type === 'star') {
          ctx.beginPath();
          ctx.arc(proj.x, proj.y, renderSize + 4, 0, 2 * Math.PI);
          ctx.strokeStyle = colorMuted;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }

      // --- Stationary diamond ring indicator ---
      if (obj.isStationary && obj.type !== 'star') {
        drawStationaryIndicator(ctx, proj.x, proj.y, renderSize, colorMuted);
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
    setZoom((prev) => Math.max(5, Math.min(1000, prev * factor)));
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
    ctx.fillText(`System Directory — Epoch: Day ${currentSystemDate}`, 110, 220);

    // Render directory items
    let curY = 320;

    // Render primary planets
    const isPrimaryLabel = (obj: any) => {
      if (!obj.orbitedObjectName) return true;
      const parent = objects.find((p) => p.name === obj.orbitedObjectName);
      if (parent && !parent.orbitedObjectName && parent.distanceOrbited === 0) return true;
      return false;
    };
    const primaries = objects.filter((o) => 
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
      const moons = objects.filter((m) => m.orbitedObjectName === obj.name);
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
    <div className="navchart-view-content">
      
      {/* Toolbar Overlay */}
      <div className="p-3 bg-opacity-70 backdrop-blur-md border-b border-[var(--color-border-parchment)] flex items-center justify-between bg-[var(--color-bg-panel)] shrink-0">
        
        <div className="flex items-center gap-2">
          {onCollapse && (
            <button
              onClick={onCollapse}
              className="p-1 rounded hover:bg-[var(--color-bg-base)] text-[var(--color-text-muted)] border border-transparent hover:border-[var(--color-border-parchment)] transition-all"
              title="Collapse Map Panel"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          )}
          <h4 className="font-title text-xs font-bold tracking-wider text-[var(--color-text-main)] whitespace-nowrap">
            Navigation Chart
          </h4>
          
          <div className="w-[1px] h-4 bg-[var(--color-border-parchment)] mx-1" />
          
          <div className="text-[10px] font-semibold hidden md:inline">
            Epoch: <span className="font-mono text-xs text-[var(--color-accent-red)]">{Math.round(currentSystemDate)}</span> Days
          </div>
        </div>

        {/* Map navigation and theme items */}
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-bold text-[var(--color-text-muted)] uppercase mr-1 hidden sm:inline">Skin:</span>
          <button
            onClick={() => setMapTheme('parchment')}
            className={`px-1.5 py-0.5 border border-[var(--color-border-parchment)] text-[9px] ${mapTheme === 'parchment' ? 'bg-[var(--color-accent-gold)] text-[#2b2316] font-semibold' : 'bg-transparent text-[var(--color-text-muted)]'}`}
          >
            Vellum
          </button>
          <button
            onClick={() => setMapTheme('space')}
            className={`px-1.5 py-0.5 border border-[var(--color-border-parchment)] text-[9px] ${mapTheme === 'space' ? 'bg-blue-600 text-white font-semibold' : 'bg-transparent text-[var(--color-text-muted)]'}`}
          >
            Starfield
          </button>

          <div className="w-[1px] h-4 bg-[var(--color-border-parchment)] mx-1" />

          <button
            onClick={() => handleZoom(1.2)}
            title="Zoom In"
            className="p-1 scroll-border bg-[var(--color-bg-base)] hover:bg-[var(--color-border-parchment)] transition-colors"
          >
            <ZoomIn className="w-3 h-3" />
          </button>
          <button
            onClick={() => handleZoom(0.8)}
            title="Zoom Out"
            className="p-1 scroll-border bg-[var(--color-bg-base)] hover:bg-[var(--color-border-parchment)] transition-colors"
          >
            <ZoomOut className="w-3 h-3" />
          </button>
          <button
            onClick={handleAutoFit}
            title="Auto-Fit System"
            className="p-1 scroll-border bg-[var(--color-bg-base)] hover:bg-[var(--color-border-parchment)] transition-colors"
          >
            <Maximize className="w-3 h-3" />
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-1 px-2 py-0.5 bg-[var(--color-accent-gold)] text-[#2b2316] font-title font-bold text-[9px] rounded hover:brightness-95 transition-all shadow-sm"
          >
            <Download className="w-2.5 h-2.5" /> Export
          </button>
        </div>
      </div>

      {/* Map Canvas */}
      <div ref={containerRef} className="flex-1 overflow-hidden relative">
        <canvas
          ref={canvasRef}
          width={dimensions.width}
          height={dimensions.height}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUpOrLeave}
          onMouseLeave={handleMouseUpOrLeave}
          className="w-full h-full cursor-grab active:cursor-grabbing"
          style={{ display: 'block' }}
        />
      </div>

      {/* Animation Scrubber / Control Timeline */}
      <div className="p-4 border-t border-[var(--color-border-parchment)] bg-[var(--color-bg-panel)] flex flex-col sm:flex-row gap-4 items-center shrink-0">
        
        {/* Scrubber Playback Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-2 rounded bg-[var(--color-border-parchment)] hover:bg-[var(--color-accent-gold)] transition-colors text-[var(--color-text-main)]"
            title={isPlaying ? 'Pause Animation' : 'Play Animation'}
          >
            {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
          </button>
          <button
            onClick={() => advanceSystemDate(10)}
            className="p-2 rounded bg-[var(--color-bg-base)] hover:bg-[var(--color-border-parchment)] transition-colors"
            title="Forward 10 Days"
          >
            <FastForward className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCurrentSystemDate(0)}
            className="p-2 rounded bg-[var(--color-bg-base)] hover:bg-[var(--color-border-parchment)] transition-colors"
            title="Reset Timeline"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Scrubber Slider */}
        <div className="flex-1 flex flex-col w-full">
          <div className="flex justify-between text-[10px] text-[var(--color-text-muted)] font-medium mb-1">
            <span>Day 0</span>
            <span>Timeline Scrubber</span>
            <span>Day 1000+</span>
          </div>
          <input
            type="range"
            min={0}
            max={1000}
            value={Math.min(1000, currentSystemDate)}
            onChange={(e) => setCurrentSystemDate(Number(e.target.value))}
            className="w-full h-2 bg-[var(--color-border-parchment)] rounded-lg appearance-none cursor-pointer accent-[var(--color-accent-gold)]"
          />
        </div>

        {/* Speed settings */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] font-semibold text-[var(--color-text-muted)]">SPEED:</span>
          <select
            value={playSpeed}
            onChange={(e) => setPlaySpeed(Number(e.target.value))}
            className="p-1 text-xs bg-[var(--color-bg-base)] scroll-border"
          >
            <option value={0.1}>0.1 Day/frame</option>
            <option value={0.5}>0.5 Day/frame</option>
            <option value={1}>1.0 Day/frame</option>
            <option value={5}>5.0 Days/frame</option>
            <option value={10}>10.0 Days/frame</option>
          </select>
        </div>
      </div>
    </div>
  );
};
