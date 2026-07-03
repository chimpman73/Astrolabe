import React, { useRef, useEffect, useState } from 'react';
import { useSystemStore } from '../store/useSystemStore';
import { ChevronLeft } from 'lucide-react';
import { saveCanvasExport } from '../utils/exportHelper';
import { drawSolidBody, getMotionSuffix, getBodyColors } from '../utils/canvasRenderer';

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
    setToastMessage,
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
        obj.distanceOrbited >= 0 && isPrimary(obj)
      )
    : [];

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
    const bottomMargin = 15;
    const centerX = width / 2;
    const centerY = height - bottomMargin; // True center is slightly above bottom edge

    const isRelative = activeSphere?.shellBoundaryType === 'relativeMargin';
    const shellDistance = showShell ? (isRelative ? maxDistance * 1.2 : maxDistance * 2) : maxDistance;

    // Helper: translate distance into pixel radius
    const getPixelRadius = (distance: number) => {
      if (shellDistance === 0) return 0;
      const topMargin = showShell ? 15 : 45;
      const scaleHeight = height - topMargin - bottomMargin;
      return (distance / shellDistance) * scaleHeight;
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

      // Shell label at the top center
      ctx.font = `bold ${Math.max(10, width * 0.035) * 1.5}px 'Mephisto', 'Cinzel', serif`;
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
      const objY = centerY - r;
      const sizeMultiplier = width / 300;
      const objSize = Math.max(4, obj.size * 0.6 * sizeMultiplier);

      // --- Nebula / Sargasso: cloud shape following the orbital contour ---
      if (obj.type === 'nebula' || obj.type === 'sargasso') {
        const arcDegrees = obj.arcDegrees ?? 30;
        const arcFrac = Math.min(1.0, arcDegrees / 360);
        // Width spans the entire orbital period for 360 degrees
        const cloudW = width * arcFrac;
        // Size value controls how far the cloud expands away from the orbital line
        const halfH = Math.max(8, objSize * 1.5); 
        
        // Calculate the angle required to match the target horizontal width (cloudW)
        const halfW = cloudW / 2;
        const safeR = Math.max(1, r);
        const halfAngle = halfW >= safeR ? Math.PI : Math.asin(halfW / safeR);
        
        const cloudFill = obj.type === 'nebula' ? '#6699ff' : '#44bb77';

        const isFullRing = arcDegrees >= 359;
        const numBumps = Math.max(3, Math.floor(arcDegrees / 20));
        const numSegments = Math.max(100, Math.floor(cloudW)); // higher resolution for smooth bumps

        ctx.save();
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = cloudFill;
        ctx.beginPath();
        
        // Outer edge (top/outer radius)
        for (let i = 0; i <= numSegments; i++) {
          const t = i / numSegments;
          const nx = -1 + 2 * t;
          const envelope = isFullRing ? 1 : (1 - nx * nx);
          // 40% amplitude creates distinct, puffy cloud bumps instead of a flat line
          const bump = 0.6 + 0.4 * Math.cos(nx * Math.PI * numBumps);
          
          const alpha = 1.5 * Math.PI + nx * halfAngle;
          const currentR = r + halfH * envelope * bump;
          const x = centerX + currentR * Math.cos(alpha);
          const y = centerY + currentR * Math.sin(alpha);
          
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        
        // Inner edge (bottom/inner radius)
        for (let i = numSegments; i >= 0; i--) {
          const t = i / numSegments;
          const nx = -1 + 2 * t;
          const envelope = isFullRing ? 1 : (1 - nx * nx);
          const bump = 0.6 + 0.4 * Math.cos(nx * Math.PI * numBumps);
          
          const alpha = 1.5 * Math.PI + nx * halfAngle;
          const currentR = Math.max(0, r - halfH * envelope * bump);
          const x = centerX + currentR * Math.cos(alpha);
          const y = centerY + currentR * Math.sin(alpha);
          
          ctx.lineTo(x, y);
        }
        
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      } else {
        const { bodyFill, bodyStroke } = getBodyColors(obj, !isDark, colorBg, colorStroke, '#e2b34a');
        drawSolidBody(ctx, centerX, objY, obj, objSize, bodyFill, bodyStroke, false);
      }

      // --- Motion indicator suffix (◆ = fixed, ↺ = retrograde) ---
      const motionSuffix = getMotionSuffix(obj.isStationary, obj.orbitDirection);

      // --- Name label to the right ---
      ctx.font = `normal ${Math.max(10, width * 0.035) * 1.5}px 'ITC Eras-Bold', 'Eras Bold ITC', sans-serif`;
      ctx.fillStyle = colorStroke;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(obj.name + motionSuffix, centerX + objSize + 12, objY);

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
          <h4 className="font-title text-xs font-bold tracking-wider text-[var(--color-text-main)]">
            Bookmark
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
