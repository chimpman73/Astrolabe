import { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { useFontsLoaded } from '../hooks/useFontsLoaded';
import { useSystemStore } from '../store/useSystemStore';
import { getAllSystemObjects } from '../utils/orbitMath';
import { saveCanvasExport } from '../utils/exportHelper';
import { drawBookmark } from '../renderers/SimpleVertBookmarkRenderer';
import { vellumBookmarkStyleConfig, spaceBookmarkStyleConfig } from '../renderers/BookmarkStyleConfigs';
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

  const fontsLoaded = useFontsLoaded();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const allObjects = activeSphere ? getAllSystemObjects(activeSphere) : [];

  const isPrimary = (obj: any) => {
    if (!obj.orbitedObjectName) return true;
    const parent = allObjects.find((o) => o.id === obj.orbitedObjectName || o.name === obj.orbitedObjectName);
    if (parent && !parent.orbitedObjectName && parent.distanceOrbited === 0) return true;
    return false;
  };

  const isGroupHidden = (groupId?: string) => {
    if (!groupId) return false;
    const group = allObjects.find((o) => o.type === 'group' && (o.id === groupId || o.name === groupId));
    return group ? (group.isHidden || (viewMode !== 'DM' && group.isDMOnly)) : false;
  };

  const isValidBookmarkObject = (obj: any) => 
    obj.distanceOrbited >= 0 && isPrimary(obj) && obj.type !== 'constellation' && obj.type !== 'group' && obj.type !== 'note' && obj.type !== 'legend';

  // Filter objects to only those that orbit the central point (0,0) or orbit a body at (0,0)
  const planetaryObjects = activeSphere
    ? allObjects.filter((obj) => 
        isValidBookmarkObject(obj) && !obj.isHidden && (viewMode === 'DM' || !obj.isDMOnly) && !isGroupHidden(obj.groupId)
      )
    : [];

  const shellBasisDistance = activeSphere 
    ? allObjects
        .filter((obj) => isValidBookmarkObject(obj) && obj.affectsShellBoundary !== false)
        .reduce((max, obj) => {
          const reach = ScaleManager.getPhysicalReachAU(obj);
          return Math.max(max, reach);
        }, 0.1)
    : 0.1;

  const absoluteMaxDistance = activeSphere 
    ? allObjects
        .filter((obj) => isValidBookmarkObject(obj))
        .reduce((max, obj) => {
          const reach = ScaleManager.getPhysicalReachAU(obj);
          return Math.max(max, reach);
        }, 0.1)
    : 0.1;

  const visibleMaxDistance = planetaryObjects.reduce((max, obj) => {
    const reach = ScaleManager.getPhysicalReachAU(obj);
    return Math.max(max, reach);
  }, 0.1);

  // Unified Draw Function for rendering on both Screen and Export canvas is extracted to SimpleVertBookmarkRenderer.ts

  // Re-draw on UI canvas when configuration changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const config = bookmarkBackgroundMode === 'dark' ? spaceBookmarkStyleConfig : vellumBookmarkStyleConfig;

    // Redraw using canvas layout coordinates
    drawBookmark(
      ctx, canvas.width, canvas.height, config, 
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

    const config = bookmarkBackgroundMode === 'dark' ? spaceBookmarkStyleConfig : vellumBookmarkStyleConfig;

    // Draw high quality
    drawBookmark(
      ctx, exportWidth, exportHeight, config, 
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
