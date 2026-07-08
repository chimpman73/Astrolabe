import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle, useMemo } from 'react';
import { useSystemStore } from '../store/useSystemStore';
import { calculateSystemPositions } from '../utils/orbitMath';
import { ScaleManager } from '../utils/ScaleManager';
import { VellumNavigationChartRenderer } from '../renderers/VellumNavigationChartRenderer';
import { SpaceNavigationChartRenderer } from '../renderers/SpaceNavigationChartRenderer';
import { exportNavigationChart } from '../renderers/ExportDirectoryRenderer';
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

  const renderersRef = useRef({
    vellum: new VellumNavigationChartRenderer(forceRedraw),
    space: new SpaceNavigationChartRenderer()
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
      const reach = ScaleManager.getPhysicalReachAU(o);
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
      const reach = ScaleManager.getPhysicalReachAU(o);
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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const activePan = constrainPan(pan, zoom);
    const renderer = mapTheme === 'parchment' ? renderersRef.current.vellum : renderersRef.current.space;

    const project = (xModel: number, yModel: number) => {
      return {
        x: activePan.x + xModel * zoom,
        y: activePan.y + yModel * zoom,
      };
    };

    const context: MapStyleContext = {
      ctx,
      width: dimensions.width,
      height: dimensions.height,
      activeZoom: zoom,
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

    renderer.render(context);

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
    const renderer = mapTheme === 'parchment' ? renderersRef.current.vellum : renderersRef.current.space;
    await exportNavigationChart({
      mapTheme,
      activeSphere,
      currentSystemDate,
      objects,
      visibleObjects,
      isPrimary,
      setToastMessage,
      renderer
    });
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
