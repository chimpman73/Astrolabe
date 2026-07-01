import React, { useRef, useEffect, useState } from 'react';
import { useSystemStore } from '../store/useSystemStore';
import { calculateSystemPositions } from '../utils/orbitMath';
import { Play, Pause, FastForward, RotateCcw, Download, ZoomIn, ZoomOut, Maximize, ChevronLeft } from 'lucide-react';

interface NavChartViewProps {
  onCollapse?: () => void;
}

export const NavChartView: React.FC<NavChartViewProps> = ({ onCollapse }) => {
  const {
    activeSphere,
    currentSystemDate,
    setCurrentSystemDate,
    advanceSystemDate,
  } = useSystemStore();

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
  
  // Find central body
  const centralStar = objects.find((o) => !o.orbitedObjectName && o.distanceOrbited === 0) || objects[0];

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
    
    // Find max distance of primary objects
    const primaryObjects = objects.filter((o) => !o.orbitedObjectName && o.distanceOrbited > 0);
    const maxDist = primaryObjects.reduce((max, o) => Math.max(max, o.distanceOrbited), 0.1);
    
    // The Crystal Sphere Shell is drawn at 2 * maxDist. We want it to fit comfortably inside the canvas viewport.
    const minSize = Math.min(dimensions.width, dimensions.height);
    const targetZoom = (minSize * 0.22) / maxDist; // Set maxDist to 22% of viewport, fitting 2 * maxDist at 44% radius
    
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
        ctx.lineWidth = obj.orbitedObjectName ? 0.75 : 1.2;
        ctx.strokeStyle = obj.orbitedObjectName ? colorOrbitDash : colorOrbit;
        ctx.stroke();
      }
    });

    // 2. Draw outer Crystal Sphere Shell boundary if max planet exists
    const primaryObjects = objects.filter((o) => !o.orbitedObjectName && o.distanceOrbited > 0);
    if (primaryObjects.length > 0) {
      const maxDist = primaryObjects.reduce((max, o) => Math.max(max, o.distanceOrbited), 0.1);
      const shellProj = project(0, 0);
      const shellRadius = maxDist * 2 * activeZoom;

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

    // 3. Draw bodies and labels (front-to-back)
    objects.forEach((obj) => {
      const pos = positions[obj.name];
      if (!pos) return;

      const proj = project(pos.x, pos.y);
      const renderSize = Math.max(3, (obj.size / 100) * 20);

      // Body coloring
      let bodyFill = colorBg;
      let bodyStroke = colorStroke;
      
      if (obj.type === 'star') {
        bodyFill = colorGold;
        bodyStroke = colorStroke;
      } else if (obj.type === 'moon') {
        bodyFill = isParchment ? '#dcd2b9' : '#555866';
      }

      // Draw Body
      ctx.beginPath();
      ctx.arc(proj.x, proj.y, renderSize, 0, 2 * Math.PI);
      ctx.fillStyle = bodyFill;
      ctx.fill();
      
      ctx.lineWidth = obj.type === 'star' ? 2 : 1.5;
      ctx.strokeStyle = bodyStroke;
      ctx.stroke();

      // Mini features for stars (sunbursts)
      if (obj.type === 'star') {
        ctx.beginPath();
        ctx.arc(proj.x, proj.y, renderSize + 4, 0, 2 * Math.PI);
        ctx.strokeStyle = colorMuted;
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }

      // Label (Only display names for non-moons, or when zoomed in)
      const shouldLabel = obj.type !== 'moon' || activeZoom > 150;
      if (shouldLabel) {
        ctx.font = obj.type === 'star'
          ? `bold 12px ${colorStroke === '#ffffff' ? 'sans-serif' : 'var(--font-title)'}`
          : `500 10px var(--font-sans)`;
        ctx.fillStyle = colorStroke;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(obj.name, proj.x, proj.y + renderSize + 5);
      }
    });

    // Compass Rose decoration (drawn at star center if visible)
    if (centralStar) {
      const starProj = project(0, 0);
      ctx.beginPath();
      ctx.arc(starProj.x, starProj.y, 4, 0, 2 * Math.PI);
      ctx.fillStyle = colorStroke;
      ctx.fill();
    }
  };

  // Redraw canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    drawMap(ctx, dimensions.width, dimensions.height, mapTheme, zoom, pan);
  }, [activeSphere, currentSystemDate, zoom, pan, mapTheme, objects, positions, dimensions]);

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
      // Auto-fit zoom specifically for the export pane size
      const primaryObjects = objects.filter((o) => !o.orbitedObjectName && o.distanceOrbited > 0);
      const maxDist = primaryObjects.reduce((max, o) => Math.max(max, o.distanceOrbited), 0.1);
      const exportZoom = (mapW * 0.4) / maxDist;
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
    ctx.font = "bold 60px 'Cinzel', serif";
    ctx.fillText((activeSphere?.sphereName || 'CRYSTAL SPHERE').toUpperCase(), 110, 160);

    ctx.font = "normal 32px 'Outfit', sans-serif";
    ctx.fillStyle = isParchment ? '#5e4f3c' : '#8e95ad';
    ctx.fillText(`System Directory — Epoch: Day ${currentSystemDate}`, 110, 220);

    // Render directory items
    let curY = 320;

    // Render primary planets
    const primaries = objects.filter((o) => !o.orbitedObjectName);
    
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
      ctx.font = "bold 38px 'Cinzel', serif";
      ctx.fillText(obj.name, 200, curY + 15);

      ctx.font = "italic 24px 'Outfit', sans-serif";
      ctx.fillStyle = isParchment ? '#5e4f3c' : '#8e95ad';
      const period = calculateSystemPositions([obj], 0)[obj.name]?.period || 0;
      ctx.fillText(
        `${obj.type.toUpperCase()} | Dist: ${obj.distanceOrbited.toFixed(2)} AU | Period: ${Math.round(period)} Days`,
        200,
        curY + 50
      );

      ctx.font = "normal 24px 'Outfit', sans-serif";
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
        ctx.font = "bold 22px 'Outfit', sans-serif";
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

    if (window.astrolabeAPI) {
      const res = await window.astrolabeAPI.exportPngFile(dataUrl, defaultName);
      if (res.success) {
        alert(`Successfully exported System Chart to:\n${res.data}`);
      } else {
        alert(`Export failed: ${res.error}`);
      }
    } else {
      const link = document.createElement('a');
      link.download = defaultName;
      link.href = dataUrl;
      link.click();
    }
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
          <h4 className="font-title text-xs font-bold tracking-wider text-[var(--color-text-main)] uppercase whitespace-nowrap">
            SYSTEM CHART
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
