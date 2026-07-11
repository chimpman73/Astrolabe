import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle, useMemo } from 'react';
import { useSystemStore } from '../store/useSystemStore';
import { calculateSystemPositions } from '../utils/orbitMath';
import { ScaleManager } from '../utils/ScaleManager';
import { AutoFitCalculator } from '../utils/AutoFitCalculator';
import { VellumNavigationChartRenderer } from '../renderers/VellumNavigationChartRenderer';
import { SpaceNavigationChartRenderer } from '../renderers/SpaceNavigationChartRenderer';
import { getNoteNodes, hitTestNoteNodes, NoteNodeId, getNoteCorners } from '../utils/noteInteractions';
import { CelestialObject } from '../../types/astrolabe';
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
    selectedObjectIndex,
    updateCelestialObject,
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
    const directoryWidthModel = shellRadiusModel; // 0.5 * diameter = 1.0 * radius
    
    const paperWidthModel = shellRadiusModel * 2 + paddingModel * 2 + directoryWidthModel;
    const paperHeightModel = shellRadiusModel * 2 + paddingModel * 2;
    
    const totalWidthModel = paperWidthModel * 1.06; // rod margins
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
    if (!panLimits || mapTheme !== 'parchment') return p;
    const paperW = panLimits.width * z;
    const paperH = panLimits.height * z;
    const deskMargin = 40;
    
    let minX, maxX, minY, maxY;
    
    // Adjust the center offset because the parchment is asymmetrical
    const dirOffset = (panLimits.directoryWidthModel * z) / 2;
    
    if (paperW <= dimensions.width) {
      minX = dimensions.width / 2 + dirOffset;
      maxX = dimensions.width / 2 + dirOffset;
    } else {
      minX = dimensions.width - deskMargin - paperW / 2 + dirOffset;
      maxX = paperW / 2 + deskMargin + dirOffset;
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
  const positions = calculateSystemPositions(objects, currentSystemDate);

  const handleAutoFit = () => {
    const { zoom, pan } = AutoFitCalculator.calculateAutoFit(dimensions, objects, activeSphere);
    setViewport({ zoom, pan });
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
      selectedObjectIndex,
    };

    renderer.render(context);

  }, [activeSphere, currentSystemDate, zoom, pan, mapTheme, objects, positions, dimensions, fontsLoaded, decorations, forceRenderState]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (selectedObjectIndex !== null) {
      const selectedObject = objects[selectedObjectIndex];
      if (selectedObject && selectedObject.type === 'note') {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (rect) {
          const mouseX = e.clientX - rect.left;
          const mouseY = e.clientY - rect.top;
          
          const nodes = getNoteNodes(selectedObject, zoom, pan);
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
    if (activeNodeDrag && selectedObjectIndex !== null) {
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
        
        const dist = initialNote.noteDistanceAU || 0;
        const angle = initialNote.noteAngle || 0;
        const rad = (angle * Math.PI) / 180;
        
        const initialWorldX = Math.cos(rad) * dist;
        const initialWorldY = Math.sin(rad) * dist;
        
        const newWorldX = initialWorldX + dWorldX;
        const newWorldY = initialWorldY + dWorldY;
        
        const newDist = Math.sqrt(newWorldX * newWorldX + newWorldY * newWorldY);
        let newAngle = (Math.atan2(newWorldY, newWorldX) * 180) / Math.PI;
        if (newAngle < 0) newAngle += 360;
        
        updateCelestialObject(selectedObjectIndex, {
          noteDistanceAU: newDist,
          noteAngle: newAngle,
        });
      } else if (id === 'rotate') {
         const centerScreenX = pan.x + (Math.cos((initialNote.noteAngle || 0) * Math.PI / 180) * (initialNote.noteDistanceAU || 0)) * zoom;
         const centerScreenY = pan.y + (Math.sin((initialNote.noteAngle || 0) * Math.PI / 180) * (initialNote.noteDistanceAU || 0)) * zoom;
         
         const mouseAngle = Math.atan2(mouseY - centerScreenY, mouseX - centerScreenX);
         
         const corners = getNoteCorners(initialNote);
         const localAngle = Math.atan2(corners.tr.y - 20, corners.tr.x + 20);
         
         let newRot = (mouseAngle - localAngle) * 180 / Math.PI;
         if (newRot < 0) newRot += 360;
         
         updateCelestialObject(selectedObjectIndex, { noteRotation: newRot });
      } else if (id === 'tl' || id === 'tr' || id === 'bl' || id === 'br') {
         const centerScreenX = pan.x + (Math.cos((initialNote.noteAngle || 0) * Math.PI / 180) * (initialNote.noteDistanceAU || 0)) * zoom;
         const centerScreenY = pan.y + (Math.sin((initialNote.noteAngle || 0) * Math.PI / 180) * (initialNote.noteDistanceAU || 0)) * zoom;
         
         const screenDx = mouseX - centerScreenX;
         const screenDy = mouseY - centerScreenY;
         
         const rotRad = (initialNote.noteRotation || 0) * Math.PI / 180;
         const localDx = (screenDx * Math.cos(-rotRad) - screenDy * Math.sin(-rotRad)) / zoom;
         const localDy = (screenDx * Math.sin(-rotRad) + screenDy * Math.cos(-rotRad)) / zoom;
         
         const corners = getNoteCorners(initialNote);
         const newCorners = {
           tl: { ...corners.tl },
           tr: { ...corners.tr },
           bl: { ...corners.bl },
           br: { ...corners.br },
         };
         
         newCorners[id] = { x: Math.round(localDx), y: Math.round(localDy) };
         
         updateCelestialObject(selectedObjectIndex, {
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
    if (activeNodeDrag && selectedObjectIndex !== null) {
      if (['tl', 'tr', 'bl', 'br'].includes(activeNodeDrag.id)) {
        const note = activeSphere?.objects[selectedObjectIndex];
        if (note && note.type === 'note') {
          const corners = getNoteCorners(note);
          const cx = (corners.tl.x + corners.tr.x + corners.bl.x + corners.br.x) / 4;
          const cy = (corners.tl.y + corners.tr.y + corners.bl.y + corners.br.y) / 4;
          
          if (Math.abs(cx) > 0.1 || Math.abs(cy) > 0.1) {
            const rotRad = (note.noteRotation || 0) * Math.PI / 180;
            const globalDx = cx * Math.cos(rotRad) - cy * Math.sin(rotRad);
            const globalDy = cx * Math.sin(rotRad) + cy * Math.cos(rotRad);
            
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
            
            updateCelestialObject(selectedObjectIndex, {
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
