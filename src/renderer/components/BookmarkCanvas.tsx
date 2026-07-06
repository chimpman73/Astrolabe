import { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { useSystemStore } from '../store/useSystemStore';
import { saveCanvasExport } from '../utils/exportHelper';
import { drawSolidBody, getBodyColors, getElementColor } from '../utils/canvasRenderer';
import { ScaleManager } from '../utils/ScaleManager';

export interface BookmarkCanvasHandle {
  handleExport: () => Promise<void>;
}

export const BookmarkCanvas = forwardRef<BookmarkCanvasHandle>((_props, ref) => {
  const {
    activeSphere,
    bookmarkBackgroundMode,
    bookmarkShowShell,
    bookmarkShowDistance,
    setToastMessage,
    viewMode,
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

  const isPrimary = (obj: any) => {
    if (!obj.orbitedObjectName) return true;
    const parent = activeSphere?.objects.find((o) => o.name === obj.orbitedObjectName);
    if (parent && !parent.orbitedObjectName && parent.distanceOrbited === 0) return true;
    return false;
  };

  // Filter objects to only those that orbit the central point (0,0) or orbit a body at (0,0)
  const planetaryObjects = activeSphere
    ? activeSphere.objects.filter((obj) => 
        obj.distanceOrbited >= 0 && isPrimary(obj) && !obj.isHidden && (viewMode === 'DM' || !obj.isDMOnly)
      )
    : [];

  const shellBasisDistance = activeSphere 
    ? activeSphere.objects
        .filter((obj) => obj.distanceOrbited >= 0 && isPrimary(obj) && obj.affectsShellBoundary !== false)
        .reduce((max, obj) => {
          const reach = obj.type === 'living_world' ? obj.distanceOrbited + (obj.branchExtent ?? 2.5) : obj.distanceOrbited;
          return Math.max(max, reach);
        }, 0.1)
    : 0.1;

  const absoluteMaxDistance = activeSphere 
    ? activeSphere.objects
        .filter((obj) => obj.distanceOrbited >= 0 && isPrimary(obj))
        .reduce((max, obj) => {
          const reach = obj.type === 'living_world' ? obj.distanceOrbited + (obj.branchExtent ?? 2.5) : obj.distanceOrbited;
          return Math.max(max, reach);
        }, 0.1)
    : 0.1;

  const visibleMaxDistance = planetaryObjects.reduce((max, obj) => {
    const reach = obj.type === 'living_world' ? obj.distanceOrbited + (obj.branchExtent ?? 2.5) : obj.distanceOrbited;
    return Math.max(max, reach);
  }, 0.1);

  // Unified Draw Function for rendering on both Screen and Export canvas
  const drawBookmark = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    theme: 'light' | 'dark',
    showShell: boolean,
    showDistance: boolean
  ) => {
    const isDark = theme === 'dark';
    
    // Theme Colors
    const colorBg = isDark ? '#000000' : '#ffffff';
    const colorStroke = isDark ? '#ffffff' : '#000000';
    const colorMuted = isDark ? '#888888' : '#777777';

    // Clear background
    ctx.fillStyle = colorBg;
    ctx.fillRect(0, 0, width, height);

    // Coordinate settings
    const bottomMargin = 15;
    const centerX = width / 2;
    const centerY = height - bottomMargin; // True center is slightly above bottom edge

    const isCustom = activeSphere?.shellBoundaryType === 'custom' || activeSphere?.shellBoundaryType === 'relativeMargin';
    const shellScale = isCustom ? (activeSphere?.shellCustomScale ?? 1.2) : 2.0;
    const shellDistance = shellBasisDistance * shellScale;
    
    // Determine the furthest point that needs to be drawn on the canvas
    const canvasBoundary = showShell 
      ? Math.max(absoluteMaxDistance, shellDistance)
      : visibleMaxDistance;

    // Helper: translate distance into pixel radius
    const getPixelRadius = (distance: number) => {
      if (canvasBoundary === 0) return 0;
      const topMargin = showShell ? 15 : 45;
      const scaleHeight = height - topMargin - bottomMargin;
      return (distance / canvasBoundary) * scaleHeight;
    };



    // Intentionally blank - getPixelRadius is now declared above Star drawing

    // Draw orbits
    ctx.lineWidth = 1;
    planetaryObjects.forEach((obj) => {
      const r = getPixelRadius(obj.distanceOrbited);
      ctx.beginPath();
      // Draw top semicircle arc
      ctx.arc(centerX, centerY, r, Math.PI, 2 * Math.PI);
      ctx.strokeStyle = colorMuted;
      ctx.setLineDash([4, 4]); // Dashed orbit line
      ctx.stroke();
    });
    ctx.setLineDash([]); // Reset dashed lines

    // Draw Crystal Sphere Shell (at very top boundary)
    if (showShell) {
      const shellR = getPixelRadius(shellDistance); // which equals height
      ctx.beginPath();
      ctx.arc(centerX, centerY, shellR - 2, Math.PI, 2 * Math.PI);
      ctx.strokeStyle = colorStroke;
      ctx.lineWidth = 3;
      ctx.stroke();

      // Inner border detail
      ctx.beginPath();
      ctx.arc(centerX, centerY, shellR - 8, Math.PI, 2 * Math.PI);
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Title label at the top center
    ctx.font = `bold ${Math.max(10, width * 0.035) * 1.5}px 'Elan', 'Cinzel', serif`;
    ctx.fillStyle = colorStroke;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(
      showShell 
        ? (activeSphere?.sphereName || 'CRYSTAL SHELL').toUpperCase() + ' SHELL'
        : (activeSphere?.sphereName || 'UNTITLED SYSTEM').toUpperCase(),
      centerX,
      showShell ? 32 : 12
    );

    // Draw objects and labels along the center line
    planetaryObjects.forEach((obj) => {
      const r = getPixelRadius(obj.distanceOrbited);
      const objY = centerY - r;
      const sizeMultiplier = width / 300;
      const objSize = ScaleManager.getBookmarkVisualRadius(obj.sizeClass || 'D') * sizeMultiplier;

      if (obj.type === 'cloud') {
        const cloudFill = getElementColor(obj.elementAffinity || null) || (isDark ? '#a0a0a0' : '#808080');
        drawSolidBody(ctx, centerX, centerY, obj, objSize, cloudFill, '#505050', false, 1, 
          true, centerX, centerY, undefined, undefined, width, r, centerY
        );
      } else {
        const { bodyFill, bodyStroke } = getBodyColors(obj, !isDark, colorBg, colorStroke, '#e2b34a');
        
        // Calculate true pixels per AU
        const scaleHeight = height - (showShell ? 15 : 45) - bottomMargin;
        const pixelsPerAU = canvasBoundary > 0 ? scaleHeight / canvasBoundary : 1;
        const zoomEquiv = pixelsPerAU; // For branch scaling on living worlds

        drawSolidBody(ctx, centerX, objY, obj, objSize, bodyFill, bodyStroke, false, zoomEquiv);
      }

      // --- Name label to the right ---
      ctx.font = `normal ${Math.max(10, width * 0.035) * 1.5}px 'ITC Eras-Bold', 'Eras Bold ITC', sans-serif`;
      ctx.fillStyle = colorStroke;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(obj.name, centerX + objSize + 12, objY);

      // --- Distance label to the left ---
      if (showDistance) {
        ctx.font = `italic ${Math.max(8, width * 0.028) * 1.5}px 'ITC Eras-Bold', 'Eras Bold ITC', sans-serif`;
        ctx.fillStyle = colorMuted;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${obj.distanceOrbited.toFixed(2)} AU`, centerX - objSize - 12, objY);
      }
    });

    // Decorative Bookmark borders
    ctx.strokeStyle = colorStroke;
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, width - 4, height - 4);
    ctx.lineWidth = 1;
    ctx.strokeRect(6, 6, width - 12, height - 12);
  };

  // Re-draw on UI canvas when configuration changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Redraw using canvas layout coordinates
    drawBookmark(ctx, canvas.width, canvas.height, bookmarkBackgroundMode, bookmarkShowShell, bookmarkShowDistance);
  }, [activeSphere, bookmarkBackgroundMode, bookmarkShowShell, bookmarkShowDistance, planetaryObjects, fontsLoaded]);

  const handleExport = async () => {
    // High-DPI Export: Bookmark is 3 inches wide x 11 inches tall.
    // 300 DPI = 900px wide by 3300px tall
    const exportWidth = 900;
    const exportHeight = 3300;

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = exportWidth;
    exportCanvas.height = exportHeight;

    const ctx = exportCanvas.getContext('2d');
    if (!ctx) return;

    // Draw high quality
    drawBookmark(ctx, exportWidth, exportHeight, bookmarkBackgroundMode, bookmarkShowShell, bookmarkShowDistance);

    const dataUrl = exportCanvas.toDataURL('image/png');
    const defaultName = `${activeSphere?.sphereName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_bookmark.png`;

    await saveCanvasExport(dataUrl, defaultName, 'Bookmark', setToastMessage);
  };

  useImperativeHandle(ref, () => ({
    handleExport,
  }));

  return (
    <div className="bookmark-canvas-wrapper">
      <canvas
        ref={canvasRef}
        width={300}
        height={900}
        className="bookmark-canvas"
      />
    </div>
  );
});
