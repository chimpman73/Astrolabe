import React, { useRef, useEffect } from 'react';
import { useSystemStore } from '../store/useSystemStore';
import { ChevronLeft } from 'lucide-react';

interface BookmarkViewProps {
  onCollapse?: () => void;
}

export const BookmarkView: React.FC<BookmarkViewProps> = ({ onCollapse }) => {
  const {
    activeSphere,
    bookmarkBackgroundMode,
    bookmarkShowShell,
    bookmarkShowDistance,
    setBookmarkBackgroundMode,
    setBookmarkShowShell,
    setBookmarkShowDistance,
  } = useSystemStore();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Filter objects to only those that orbit the central star (orbitedObjectName is null or empty)
  const planetaryObjects = activeSphere
    ? activeSphere.objects.filter((obj) => !obj.orbitedObjectName && obj.distanceOrbited > 0)
    : [];

  const centralStar = activeSphere
    ? activeSphere.objects.find((obj) => !obj.orbitedObjectName && obj.distanceOrbited === 0) || activeSphere.objects[0]
    : null;

  // Furthest planetary distance
  const maxDistance = planetaryObjects.reduce((max, obj) => Math.max(max, obj.distanceOrbited), 0.1);

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
    const centerX = width / 2;
    const centerY = height; // Star center is at the bottom

    const shellDistance = showShell ? maxDistance * 2 : maxDistance;

    // Helper: translate distance into pixel radius
    const getPixelRadius = (distance: number) => {
      const topMargin = showShell ? 15 : 45;
      const bottomMargin = 15;
      const scaleHeight = height - topMargin - bottomMargin;
      return (distance / shellDistance) * scaleHeight + bottomMargin;
    };

    // Draw central star at bottom center
    if (centralStar) {
      const starRadius = Math.max(15, (centralStar.size / 100) * (width * 0.2));
      ctx.beginPath();
      ctx.arc(centerX, centerY, starRadius, 0, 2 * Math.PI);
      ctx.fillStyle = colorBg;
      ctx.fill();
      ctx.strokeStyle = colorStroke;
      ctx.lineWidth = 3;
      ctx.stroke();

      // Star core details
      ctx.beginPath();
      ctx.arc(centerX, centerY, starRadius - 6, 0, 2 * Math.PI);
      ctx.stroke();

      // Star label
      ctx.font = `bold ${Math.max(12, width * 0.045)}px 'Cinzel', serif`;
      ctx.fillStyle = colorStroke;
      ctx.textAlign = 'center';
      ctx.fillText(centralStar.name.toUpperCase(), centerX, height - starRadius - 8);
    }

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

      // Shell label at the top center
      ctx.font = `bold ${Math.max(10, width * 0.035)}px 'Cinzel', serif`;
      ctx.fillStyle = colorStroke;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(
        (activeSphere?.sphereName || 'CRYSTAL SHELL').toUpperCase() + ' SHELL',
        centerX,
        32
      );
    }

    // Draw objects and labels along the center line
    planetaryObjects.forEach((obj) => {
      const r = getPixelRadius(obj.distanceOrbited);
      const objY = height - r;
      const sizeMultiplier = width / 300; // Visual scale scaling
      const objSize = Math.max(4, obj.size * 0.6 * sizeMultiplier);

      // Draw planet body
      ctx.beginPath();
      ctx.arc(centerX, objY, objSize, 0, 2 * Math.PI);
      ctx.fillStyle = colorBg;
      ctx.fill();
      ctx.strokeStyle = colorStroke;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Internal detail lines based on type
      if (obj.type === 'planet' || objSize > 8) {
        ctx.beginPath();
        ctx.moveTo(centerX - objSize, objY);
        ctx.lineTo(centerX + objSize, objY);
        ctx.stroke();
      }

      // Draw name label to the right
      ctx.font = `normal ${Math.max(10, width * 0.035)}px 'Outfit', sans-serif`;
      ctx.fillStyle = colorStroke;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(obj.name, centerX + objSize + 8, objY);

      // Draw distance label to the left
      if (showDistance) {
        ctx.font = `italic ${Math.max(8, width * 0.028)}px 'Outfit', sans-serif`;
        ctx.fillStyle = colorMuted;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${obj.distanceOrbited.toFixed(2)} AU`, centerX - objSize - 8, objY);
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
  }, [activeSphere, bookmarkBackgroundMode, bookmarkShowShell, bookmarkShowDistance, planetaryObjects, centralStar]);

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

    if (window.astrolabeAPI) {
      const res = await window.astrolabeAPI.exportPngFile(dataUrl, defaultName);
      if (res.success) {
        alert(`Successfully exported Bookmark to:\n${res.data}`);
      } else {
        alert(`Export failed: ${res.error}`);
      }
    } else {
      // Fallback: Web download
      const link = document.createElement('a');
      link.download = defaultName;
      link.href = dataUrl;
      link.click();
    }
  };

  return (
    <div className="bookmark-view-content">
      <div className="w-full border-b border-[var(--color-border-parchment)] pb-2 mb-2 shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {onCollapse && (
            <button
              onClick={onCollapse}
              className="p-0.5 rounded hover:bg-[var(--color-bg-base)] text-[var(--color-text-muted)] border border-transparent hover:border-[var(--color-border-parchment)] transition-all"
              title="Collapse Bookmark Panel"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          )}
          <h4 className="font-title text-xs font-bold tracking-wider text-[var(--color-text-main)] uppercase">
            BOOKMARK
          </h4>
        </div>
        
        {/* Compact Toggles next to Title */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setBookmarkBackgroundMode(bookmarkBackgroundMode === 'light' ? 'dark' : 'light')}
            className="text-[8px] font-bold px-1.5 py-0.5 bg-[var(--color-bg-base)] scroll-border hover:bg-[var(--color-border-parchment)] transition-colors"
            title="Toggle Light/Dark Background"
          >
            {bookmarkBackgroundMode.toUpperCase()}
          </button>
          <button
            onClick={() => setBookmarkShowShell(!bookmarkShowShell)}
            className="text-[8px] font-bold px-1.5 py-0.5 bg-[var(--color-bg-base)] scroll-border hover:bg-[var(--color-border-parchment)] transition-colors"
            title="Toggle Shell Outline"
          >
            {bookmarkShowShell ? 'SHELL' : 'NOSHELL'}
          </button>
          <button
            onClick={() => setBookmarkShowDistance(!bookmarkShowDistance)}
            className="text-[8px] font-bold px-1.5 py-0.5 bg-[var(--color-bg-base)] scroll-border hover:bg-[var(--color-border-parchment)] transition-colors"
            title="Toggle Distance Labels"
          >
            {bookmarkShowDistance ? 'DIST' : 'NODIST'}
          </button>
          <button
            onClick={handleExport}
            className="text-[8px] font-bold px-1.5 py-0.5 bg-[var(--color-accent-gold)] text-[#2b2316] rounded hover:brightness-95 transition-colors"
            title="Export 300 DPI PNG"
          >
            EXP
          </button>
        </div>
      </div>

      {/* Bookmark Canvas Container */}
      <div className="bookmark-canvas-container">
        <div className="bookmark-canvas-wrapper">
          <canvas
            ref={canvasRef}
            width={300}
            height={900}
            className="bookmark-canvas"
          />
        </div>
      </div>
    </div>
  );
};
