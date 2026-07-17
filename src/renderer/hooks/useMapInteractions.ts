import { useState } from 'react';
import { NoteNodeId, getNoteNodes, hitTestNoteNodes, getNoteCorners } from '../utils/noteInteractions';
import { CelestialObject } from '../../types/astrolabe';

interface UseMapInteractionsParams {
  selectedObjectId: string | null;
  objects: CelestialObject[];
  activeSphere: any;
  zoom: number;
  pan: { x: number; y: number };
  baseZoom: number;
  minZoomLimit: number;
  setZoom: (fn: (z: number) => number) => void;
  setPan: (fn: (p: { x: number; y: number }) => { x: number; y: number }) => void;
  constrainPan: (p: { x: number; y: number }, z: number) => { x: number; y: number };
  updateCelestialObject: (id: string, updated: Partial<CelestialObject>) => void;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  getAllSystemObjects: (sphere: any) => CelestialObject[];
}

export function useMapInteractions({
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
}: UseMapInteractionsParams) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [activeNodeDrag, setActiveNodeDrag] = useState<{ id: NoteNodeId, initialNote: CelestialObject, initialMouse: { x: number, y: number } } | null>(null);

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

    const MAX_ZOOM = 1000;

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

  return {
    handleMouseDown,
    handleMouseMove,
    handleMouseUpOrLeave,
    handleWheel,
  };
}
