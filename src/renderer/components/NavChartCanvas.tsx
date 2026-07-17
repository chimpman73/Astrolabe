import { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { useFontsLoaded } from '../hooks/useFontsLoaded';
import { useSystemStore } from '../store/useSystemStore';
import { getAllSystemObjects } from '../utils/orbitMath';
import { calculateSystemPositions } from '../utils/orbitMath';
import { ScaleManager } from '../utils/ScaleManager';
import { AutoFitCalculator } from '../utils/AutoFitCalculator';
import { NavigationChartRenderer } from '../renderers/NavigationChartRenderer';
import { vellumStyleConfig, spaceStyleConfig } from '../renderers/ChartStyleConfigs';
import { exportNavigationChart } from '../renderers/ExportDirectoryRenderer';
import { MapStyleContext } from '../../types/renderer';
import { useMapViewport } from '../hooks/useMapViewport';
import { useMapInteractions } from '../hooks/useMapInteractions';

export interface NavChartCanvasHandle {
  handleZoom: (factor: number) => void;
  handleAutoFit: () => void;
  handleExport: () => Promise<void>;
}


const MAX_ZOOM = 1000;

interface NavChartCanvasProps {
  mapTheme: 'parchment' | 'space';
}

export const NavChartCanvas = forwardRef<NavChartCanvasHandle, NavChartCanvasProps>(({ mapTheme }, ref) => {
  const {
    activeSphere,
    currentSystemDate,
    setToastMessage,
    viewMode,
    decorations,
    selectedObjectId,
    updateCelestialObject,
  } = useSystemStore();

  const [forceRenderState, setForceRenderState] = useState(0);

  const forceRedraw = () => setForceRenderState(s => s + 1);

  const renderersRef = useRef({
    vellum: new NavigationChartRenderer(vellumStyleConfig, forceRedraw),
    space: new NavigationChartRenderer(spaceStyleConfig, forceRedraw)
  });

  const objects = activeSphere ? getAllSystemObjects(activeSphere) : [];
  
  const isPrimary = (obj: any) => {
    if (!obj.orbitedObjectName) return true;
    const parent = objects.find((p: any) => p.name === obj.orbitedObjectName);
    if (parent && !parent.orbitedObjectName && parent.distanceOrbited === 0) return true;
    return false;
  };

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const {
    dimensions,
    zoom,
    pan,
    setViewport,
    setZoom,
    setPan,
    baseZoom,
    minZoomLimit,
    constrainPan,
  } = useMapViewport(activeSphere, objects, isPrimary, mapTheme, containerRef);

  const fontsLoaded = useFontsLoaded();

  const isGroupHidden = (groupName?: string) => {
    if (!groupName) return false;
    const group = objects.find((o: any) => o.type === 'group' && o.name === groupName);
    return group ? (group.isHidden || (viewMode !== 'DM' && group.isDMOnly)) : false;
  };

  const visibleObjects = objects.filter((o: any) => 
    o.type !== 'group' &&
    !o.isHidden && 
    (viewMode === 'DM' || !o.isDMOnly) &&
    !isGroupHidden(o.groupName)
  );  
  // Resolve positions
  const positions = activeSphere ? calculateSystemPositions(activeSphere as any, currentSystemDate) : {};

  const handleAutoFit = () => {
    const { zoom, pan } = AutoFitCalculator.calculateAutoFit(dimensions, activeSphere as any);
    setViewport({ zoom, pan });
  };

  useImperativeHandle(ref, () => ({
    handleZoom: (factor: number) => {
        setZoom((z) => {
            const newZoom = Math.max(Math.min(z * factor, MAX_ZOOM), minZoomLimit);
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

    const culledObjects = new Set<string>();
    visibleObjects.forEach((obj: any) => {
      if (obj.orbitedObjectName && obj.orbitedObjectName !== obj.name && !isPrimary(obj)) {
        const orbitRadiusPx = obj.distanceOrbited * zoom;
        const parent = objects.find((o: any) => o.name === obj.orbitedObjectName);
        let cullThreshold = 10;
        if (parent) {
          const parentSize = ScaleManager.getNavChartVisualRadius(parent.sizeClass || 'D', parent.physicalSize || 1000, parent.sizeUnit || 'miles', zoom);
          cullThreshold = parentSize + 5;
        }
        if (orbitRadiusPx < cullThreshold) {
          culledObjects.add(obj.name);
        }
      }
    });

    const activeVisibleObjects = visibleObjects.filter((obj: any) => !culledObjects.has(obj.name));

    const context: MapStyleContext = {
      ctx,
      width: dimensions.width,
      height: dimensions.height,
      activeZoom: zoom,
      baseZoom,
      activePan,
      objects,
      visibleObjects: activeVisibleObjects,
      positions,
      activeSphere,
      currentSystemDate,
      isPrimary,
      project,
      decorations,
      fontsLoaded,
      selectedObjectId,
    };

    renderer.render(context);

  }, [activeSphere, currentSystemDate, zoom, pan, mapTheme, objects, positions, dimensions, fontsLoaded, decorations, forceRenderState]);

  const {
    handleMouseDown,
    handleMouseMove,
    handleMouseUpOrLeave,
    handleWheel,
  } = useMapInteractions({
    selectedObjectId,
    objects,
    activeSphere,
    zoom,
    pan,
    baseZoom,
    minZoomLimit,
    setZoom,
    setPan,
    constrainPan,
    updateCelestialObject,
    canvasRef,
    getAllSystemObjects,
  });

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
