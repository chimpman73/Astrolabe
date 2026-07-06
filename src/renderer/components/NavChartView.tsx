import React, { useRef, useEffect, useState } from 'react';
import { useSystemStore } from '../store/useSystemStore';
import { Play, Pause, FastForward, RotateCcw, Download, ZoomIn, ZoomOut, Maximize, ChevronLeft, Sparkles } from 'lucide-react';
import { NavChartCanvas, NavChartCanvasHandle } from './NavChartCanvas';

interface NavChartViewProps {
  onCollapse?: () => void;
}

export const NavChartView: React.FC<NavChartViewProps> = ({ onCollapse }) => {
  const {
    currentSystemDate,
    setCurrentSystemDate,
    advanceSystemDate,
    generateDecorations,
    activeSphere
  } = useSystemStore();

  const canvasRef = useRef<NavChartCanvasHandle>(null);

  // Animation state
  const [isPlaying, setIsPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState(1); // days per frame
  const animationRef = useRef<number | null>(null);

  // Map theme (space vs parchment)
  const [mapTheme, setMapTheme] = useState<'parchment' | 'space'>('parchment');

  // Playback loop
  useEffect(() => {
    if (isPlaying) {
      const step = () => {
        advanceSystemDate(playSpeed);
        animationRef.current = requestAnimationFrame(step);
      };
      animationRef.current = requestAnimationFrame(step);
    } else {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    }

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isPlaying, playSpeed, advanceSystemDate]);

  return (
    <div className="navchart-view-content flex-1 flex flex-col h-full w-full">
      
      {/* Toolbar Overlay */}
      <div className="save-manager-header w-full" style={{ marginBottom: 0 }}>
        
        <div className="save-manager-header-title">
          {onCollapse && (
            <button
              onClick={onCollapse}
              className="save-manager-collapse-btn"
              title="Collapse Map Panel"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          )}
          <h4 className="font-title text-xs font-bold tracking-wider text-[var(--color-text-main)] whitespace-nowrap">
            Navigation Chart
          </h4>
          
          <div className="w-[1px] h-4 bg-[var(--color-border-parchment)] mx-1" />
          
          <div className="text-[10px] font-semibold hidden md:inline">
            Epoch: <span className="font-mono text-xs text-[var(--color-accent-red)]">{Math.round(currentSystemDate)}</span> Days
          </div>

          <div className="flex items-center gap-1 ml-3">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-1 rounded bg-[var(--color-border-parchment)] hover:bg-[var(--color-accent-gold)] transition-colors text-[var(--color-text-main)]"
              title={isPlaying ? 'Pause Animation' : 'Play Animation'}
            >
              {isPlaying ? <Pause className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current" />}
            </button>
            <button
              onClick={() => advanceSystemDate(10)}
              className="p-1 rounded bg-[var(--color-bg-base)] hover:bg-[var(--color-border-parchment)] transition-colors"
              title="Forward 10 Days"
            >
              <FastForward className="w-3 h-3" />
            </button>
            <button
              onClick={() => setCurrentSystemDate(0)}
              className="p-1 rounded bg-[var(--color-bg-base)] hover:bg-[var(--color-border-parchment)] transition-colors"
              title="Reset Timeline"
            >
              <RotateCcw className="w-3 h-3" />
            </button>

            <div className="flex items-center gap-1 ml-2 shrink-0">
              <span className="text-[9px] font-semibold text-[var(--color-text-muted)]">SPEED:</span>
              <select
                value={playSpeed}
                onChange={(e) => setPlaySpeed(Number(e.target.value))}
                className="p-0.5 text-[10px] bg-[var(--color-bg-base)] scroll-border"
              >
                <option value={0.1}>0.1x</option>
                <option value={0.5}>0.5x</option>
                <option value={1}>1.0x</option>
                <option value={5}>5.0x</option>
                <option value={10}>10.0x</option>
              </select>
            </div>
          </div>
        </div>

        {/* Map navigation and theme items */}
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-bold text-[var(--color-text-muted)] uppercase mr-1 hidden sm:inline">Skin:</span>
          <button
            onClick={() => setMapTheme('parchment')}
            className={`px-1.5 py-0.5 border border-[var(--color-border-parchment)] text-[9px] ${mapTheme === 'parchment' ? 'bg-[var(--color-accent-gold)] text-[#2b2316] font-semibold' : 'bg-transparent text-[var(--color-text-muted)]'}`}
          >
            Vellum
          </button>
          <button
            onClick={() => setMapTheme('space')}
            className={`px-1.5 py-0.5 border border-[var(--color-border-parchment)] text-[9px] ${mapTheme === 'space' ? 'bg-blue-600 text-white font-semibold' : 'bg-transparent text-[var(--color-text-muted)]'}`}
          >
            Starfield
          </button>

          <div className="w-[1px] h-4 bg-[var(--color-border-parchment)] mx-1" />

          {mapTheme === 'parchment' && (
            <button
              onClick={() => {
                let maxDist = 0.1;
                activeSphere?.objects.forEach(o => {
                  if (o.distanceOrbited > maxDist) maxDist = o.distanceOrbited;
                });
                generateDecorations(maxDist * 2);
              }}
              title="Regenerate Parchment Stains"
              className="flex items-center gap-1 px-1.5 py-0.5 scroll-border bg-[var(--color-bg-base)] hover:bg-[var(--color-border-parchment)] transition-colors text-[9px] font-semibold text-[var(--color-text-muted)]"
            >
              <Sparkles className="w-3 h-3 text-[var(--color-accent-gold)]" /> Stains
            </button>
          )}

          <button
            onClick={() => canvasRef.current?.handleZoom(1.2)}
            title="Zoom In"
            className="p-1 scroll-border bg-[var(--color-bg-base)] hover:bg-[var(--color-border-parchment)] transition-colors"
          >
            <ZoomIn className="w-3 h-3" />
          </button>
          <button
            onClick={() => canvasRef.current?.handleZoom(0.8)}
            title="Zoom Out"
            className="p-1 scroll-border bg-[var(--color-bg-base)] hover:bg-[var(--color-border-parchment)] transition-colors"
          >
            <ZoomOut className="w-3 h-3" />
          </button>
          <button
            onClick={() => canvasRef.current?.handleAutoFit()}
            title="Auto-Fit System"
            className="p-1 scroll-border bg-[var(--color-bg-base)] hover:bg-[var(--color-border-parchment)] transition-colors"
          >
            <Maximize className="w-3 h-3" />
          </button>
          <button
            onClick={() => canvasRef.current?.handleExport()}
            className="flex items-center gap-1 px-2 py-0.5 bg-[var(--color-accent-gold)] text-[#2b2316] font-title font-bold text-[9px] rounded hover:brightness-95 transition-all shadow-sm"
          >
            <Download className="w-2.5 h-2.5" /> Export
          </button>
        </div>
      </div>

      {/* Map Canvas Component */}
      <NavChartCanvas ref={canvasRef} mapTheme={mapTheme} />

    </div>
  );
};
