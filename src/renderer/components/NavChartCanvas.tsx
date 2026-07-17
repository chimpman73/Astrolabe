import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle, useMemo } from 'react';
import { useFontsLoaded } from '../hooks/useFontsLoaded';
import { useSystemStore } from '../store/useSystemStore';
import { getAllSystemObjects } from '../utils/orbitMath';
import { calculateSystemPositions } from '../utils/orbitMath';
import { ScaleManager } from '../utils/ScaleManager';
import { AutoFitCalculator } from '../utils/AutoFitCalculator';
import { NavigationChartRenderer } from '../renderers/NavigationChartRenderer';
import { vellumStyleConfig, spaceStyleConfig } from '../renderers/ChartStyleConfigs';
import { getNoteNodes, hitTestNoteNodes, NoteNodeId, getNoteCorners } from '../utils/noteInteractions';
import { CelestialObject } from '../../types/astrolabe';
import { exportNavigationChart } from '../renderers/ExportDirectoryRenderer';
import { MapStyleContext } from '../../types/renderer';

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

  const [dimensions, setDimensions] = useState({ width: 850, height: 600 });
  const [{ zoom, pan }, setViewport] = useState({ zoom: 1, pan: { x: 425, y: 300 } });
  
  const baseZoom = useMemo(() => {
    return activeSphere ? AutoFitCalculator.calculateAutoFit(dimensions, activeSphere as any).zoom : 1;
  }, [dimensions, activeSphere]);

  const setZoom = (fn: (z: number) => number) => {
      setViewport(prev => ({ ...prev, zoom: fn(prev.zoom) }));
  };

  const setPan = (fn: (p: {x: number, y: number}) => {x: number, y: number}) => {
      setViewport(prev => ({ ...prev, pan: fn(prev.pan) }));
  };

  const panLimits = useMemo(() => {
    let maxDist = 0.1;
    objects.forEach((o: any) => {
      if (o.type === 'note' || o.type === 'legend' || o.type === 'constellation') return;
      if (!isPrimary(o) || o.affectsShellBoundary === false) return;
      const reach = ScaleManager.getPhysicalReachAU(o);
      if (reach > maxDist) maxDist = reach;
    });
    const isCustom = activeSphere?.shellBoundaryType === 'custom' || activeSphere?.shellBoundaryType === 'relativeMargin';
    const shellScale = isCustom ? (activeSphere?.shellCustomScale ?? 1.2) : 2.0;
    const shellRadiusModel = maxDist * shellScale;
    
    const topMarginAU = shellRadiusModel * 1.15;
    const rightMarginAU = shellRadiusModel * 1.375;
    const leftMarginAU = shellRadiusModel * 2.184;

    const directoryWidthModel = shellRadiusModel;

    const paperWidthModel = leftMarginAU + rightMarginAU;
    const paperHeightModel = topMarginAU * 2;
    
    const totalWidthModel = paperWidthModel * 1.06;
    const totalHeightModel = paperHeightModel * 1.06;
    
    return { width: totalWidthModel, height: totalHeightModel, directoryWidthModel };
  }, [objects, activeSphere, mapTheme]);

  const minZoomLimit = useMemo(() => {
    if (!panLimits || dimensions.width === 0) return 0.5;
    const deskMargin = 40;
    const minZoomX = (dimensions.width - deskMargin * 2) / panLimits.width;
    const minZoomY = (dimensions.height - deskMargin * 2) / panLimits.height;
    return Math.max(Math.min(minZoomX, minZoomY), 0.1);
  }, [panLimits, dimensions]);

  const constrainPan = (p: { x: number; y: number }, z: number) => {
    if (!panLimits) return p;
    const paperW = panLimits.width * z;
    const paperH = panLimits.height * z;
    const deskMargin = 40;
    
    let minX, maxX, minY, maxY;
    
    // Adjust the center offset because the parchment is asymmetrical
    const leftMarginAU = panLimits.directoryWidthModel * 2.184;
    const rightMarginAU = panLimits.directoryWidthModel * 1.375;
    const centerX_px = ((-leftMarginAU + rightMarginAU) / 2) * z;
    const xOffset = -centerX_px + 5;
    
    if (paperW <= dimensions.width) {
      minX = dimensions.width / 2 + xOffset;
      maxX = dimensions.width / 2 + xOffset;
    } else {
      minX = dimensions.width - deskMargin - paperW / 2 + xOffset;
      maxX = paperW / 2 + deskMargin + xOffset;
    }
    
    if (paperH <= dimensions.height) {
      minY = dimensions.height / 2;
      maxY = dimensions.height / 2;
    } else {
      minY = dimensions.height - deskMargin - paperH / 2;
      maxY = paperH / 2 + deskMargin;
    }
    
    return {
      x: Math.max(minX, Math.min(p.x, maxX)),
      y: Math.max(minY, Math.min(p.y, maxY))
    };
  };

  useEffect(() => {
    if (zoom < minZoomLimit) {
      setZoom(() => minZoomLimit);
      setPan(p => constrainPan(p, minZoomLimit));
    }
  }, [minZoomLimit, zoom, mapTheme]);

  const fontsLoaded = useFontsLoaded();

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
  const [activeNodeDrag, setActiveNodeDrag] = useState<{ id: NoteNodeId, initialNote: CelestialObject, initialMouse: {x: number, y: number} } | null>(null);

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

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (selectedObjectId !== null) {
      const selectedObject = objects.find(o => o.id === selectedObjectId);
      if (selectedObject && (selectedObject.type === 'note' || selectedObject.type === 'legend')) {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (rect) {
          const mouseX = e.clientX - rect.left;
          const mouseY = e.clientY - rect.top;
          
          const nodes = getNoteNodes(selectedObject, zoom, pan, baseZoom);
          const hit = hitTestNoteNodes(mouseX, mouseY, nodes);
          if (hit) {
            setActiveNodeDrag({ id: hit, initialNote: selectedObject, initialMouse: { x: mouseX, y: mouseY } });
            return;
          }
        }
      }
    }

    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (activeNodeDrag && selectedObjectId !== null) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      const dx = mouseX - activeNodeDrag.initialMouse.x;
      const dy = mouseY - activeNodeDrag.initialMouse.y;
      
      const { id, initialNote } = activeNodeDrag;
      
      if (id === 'center') {
        const dWorldX = dx / zoom;
        const dWorldY = dy / zoom;
        
        const dist = initialNote.type === 'legend' ? (initialNote.legendDistanceAU || 0) : (initialNote.noteDistanceAU || 0);
        const angle = initialNote.type === 'legend' ? (initialNote.legendAngle || 0) : (initialNote.noteAngle || 0);
        const rad = (angle * Math.PI) / 180;
        
        const initialWorldX = Math.cos(rad) * dist;
        const initialWorldY = Math.sin(rad) * dist;
        
        const newWorldX = initialWorldX + dWorldX;
        const newWorldY = initialWorldY + dWorldY;
        
        const newDist = Math.sqrt(newWorldX * newWorldX + newWorldY * newWorldY);
        let newAngle = (Math.atan2(newWorldY, newWorldX) * 180) / Math.PI;
        if (newAngle < 0) newAngle += 360;
        
        if (initialNote.type === 'legend') {
          updateCelestialObject(selectedObjectId, {
            legendDistanceAU: newDist,
            legendAngle: newAngle,
          });
        } else {
          updateCelestialObject(selectedObjectId, {
            noteDistanceAU: newDist,
            noteAngle: newAngle,
          });
        }
      } else if (id === 'rotate' && initialNote.type === 'note') {
         const centerScreenX = pan.x + (Math.cos((initialNote.noteAngle || 0) * Math.PI / 180) * (initialNote.noteDistanceAU || 0)) * zoom;
         const centerScreenY = pan.y + (Math.sin((initialNote.noteAngle || 0) * Math.PI / 180) * (initialNote.noteDistanceAU || 0)) * zoom;
         
         const mouseAngle = Math.atan2(mouseY - centerScreenY, mouseX - centerScreenX);
         
         const corners = getNoteCorners(initialNote);
         const localAngle = Math.atan2(corners.tr.y - 20, corners.tr.x + 20);
         
         let newRot = (mouseAngle - localAngle) * 180 / Math.PI;
         if (newRot < 0) newRot += 360;
         
         updateCelestialObject(selectedObjectId, { noteRotation: newRot });
      } else if ((id === 'tl' || id === 'tr' || id === 'bl' || id === 'br') && initialNote.type === 'note') {
         const centerScreenX = pan.x + (Math.cos((initialNote.noteAngle || 0) * Math.PI / 180) * (initialNote.noteDistanceAU || 0)) * zoom;
         const centerScreenY = pan.y + (Math.sin((initialNote.noteAngle || 0) * Math.PI / 180) * (initialNote.noteDistanceAU || 0)) * zoom;
         
         const screenDx = mouseX - centerScreenX;
         const screenDy = mouseY - centerScreenY;
         
         const overlayScale = zoom / (baseZoom || 1);
         const rotRad = (initialNote.noteRotation || 0) * Math.PI / 180;
         const localDx = (screenDx * Math.cos(-rotRad) - screenDy * Math.sin(-rotRad)) / overlayScale;
         const localDy = (screenDx * Math.sin(-rotRad) + screenDy * Math.cos(-rotRad)) / overlayScale;
         
         const corners = getNoteCorners(initialNote);
         const newCorners = {
           tl: { ...corners.tl },
           tr: { ...corners.tr },
           bl: { ...corners.bl },
           br: { ...corners.br },
         };
         
         newCorners[id] = { x: Math.round(localDx), y: Math.round(localDy) };
         
         updateCelestialObject(selectedObjectId, {
           noteCorners: newCorners,
         });
      }
      return;
    }

    if (!isDragging) return;
    setPan(() => constrainPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    }, zoom));
  };

  const handleMouseUpOrLeave = () => {
    if (activeNodeDrag && selectedObjectId !== null) {
      if (['tl', 'tr', 'bl', 'br'].includes(activeNodeDrag.id)) {
        const note = (activeSphere ? getAllSystemObjects(activeSphere) : []).find(o => o.id === selectedObjectId);
        if (note && note.type === 'note') {
          const corners = getNoteCorners(note);
          const cx = (corners.tl.x + corners.tr.x + corners.bl.x + corners.br.x) / 4;
          const cy = (corners.tl.y + corners.tr.y + corners.bl.y + corners.br.y) / 4;
          
          if (Math.abs(cx) > 0.1 || Math.abs(cy) > 0.1) {
            const rotRad = (note.noteRotation || 0) * Math.PI / 180;
            const globalDx = (cx * Math.cos(rotRad) - cy * Math.sin(rotRad)) / (baseZoom || 1);
            const globalDy = (cx * Math.sin(rotRad) + cy * Math.cos(rotRad)) / (baseZoom || 1);
            
            const currentRad = (note.noteAngle || 0) * Math.PI / 180;
            const currentX = (note.noteDistanceAU || 0) * Math.cos(currentRad);
            const currentY = (note.noteDistanceAU || 0) * Math.sin(currentRad);
            
            const newX = currentX + globalDx;
            const newY = currentY + globalDy;
            
            const newDist = Math.sqrt(newX * newX + newY * newY);
            let newAngle = Math.atan2(newY, newX) * 180 / Math.PI;
            if (newAngle < 0) newAngle += 360;
            
            const newCorners = {
              tl: { x: corners.tl.x - cx, y: corners.tl.y - cy },
              tr: { x: corners.tr.x - cx, y: corners.tr.y - cy },
              bl: { x: corners.bl.x - cx, y: corners.bl.y - cy },
              br: { x: corners.br.x - cx, y: corners.br.y - cy }
            };
            
            updateCelestialObject(selectedObjectId, {
              noteDistanceAU: newDist,
              noteAngle: newAngle,
              noteCorners: newCorners
            });
          }
        }
      }
    }
    
    setIsDragging(false);
    setActiveNodeDrag(null);
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    const zoomFactor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect || !canvasRef.current) return;
    
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    setZoom((z) => {
      const newZoom = Math.min(Math.max(z * zoomFactor, minZoomLimit), MAX_ZOOM);
      
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
