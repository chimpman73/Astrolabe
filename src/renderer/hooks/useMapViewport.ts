import { useState, useEffect, useMemo } from 'react';
import { AutoFitCalculator } from '../utils/AutoFitCalculator';
import { ScaleManager } from '../utils/ScaleManager';

export function useMapViewport(
  activeSphere: any,
  objects: any[],
  isPrimary: (obj: any) => boolean,
  mapTheme: string,
  containerRef: React.RefObject<HTMLDivElement | null>
) {
  const [dimensions, setDimensions] = useState({ width: 850, height: 600 });
  const [{ zoom, pan }, setViewport] = useState({ zoom: 1, pan: { x: 425, y: 300 } });

  const baseZoom = useMemo(() => {
    return activeSphere ? AutoFitCalculator.calculateAutoFit(dimensions, activeSphere).zoom : 1;
  }, [dimensions, activeSphere]);

  const setZoom = (fn: (z: number) => number) => {
    setViewport(prev => ({ ...prev, zoom: fn(prev.zoom) }));
  };

  const setPan = (fn: (p: { x: number; y: number }) => { x: number; y: number }) => {
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
  }, [containerRef]);

  return {
    dimensions,
    zoom,
    pan,
    setViewport,
    setZoom,
    setPan,
    baseZoom,
    panLimits,
    minZoomLimit,
    constrainPan,
  };
}
