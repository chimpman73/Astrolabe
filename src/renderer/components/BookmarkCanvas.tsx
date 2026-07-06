import { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { useSystemStore } from '../store/useSystemStore';
import { saveCanvasExport } from '../utils/exportHelper';
import { drawBookmark } from '../renderers/BookmarkRenderer';

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

  // Unified Draw Function for rendering on both Screen and Export canvas is extracted to BookmarkRenderer.ts

  // Re-draw on UI canvas when configuration changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Redraw using canvas layout coordinates
    drawBookmark(
      ctx, canvas.width, canvas.height, bookmarkBackgroundMode, 
      bookmarkShowShell, bookmarkShowDistance, 
      activeSphere, planetaryObjects, shellBasisDistance, absoluteMaxDistance, visibleMaxDistance
    );
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
    drawBookmark(
      ctx, exportWidth, exportHeight, bookmarkBackgroundMode, 
      bookmarkShowShell, bookmarkShowDistance,
      activeSphere, planetaryObjects, shellBasisDistance, absoluteMaxDistance, visibleMaxDistance
    );

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
