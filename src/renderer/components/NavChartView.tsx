import React, { useRef, useEffect, useState } from 'react';
import { useSystemStore } from '../store/useSystemStore';
import { Play, Pause, FastForward, RotateCcw, Download, ZoomIn, ZoomOut, Maximize, ChevronLeft, Sparkles } from 'lucide-react';
import { NavChartCanvas, NavChartCanvasHandle } from './NavChartCanvas';
import { getAllSystemObjects } from '../utils/orbitMath';

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

  // Calculate dynamic simulation time
  const baseYear = activeSphere?.campaignYear ?? 1000;
  const baseDay = activeSphere?.campaignDay ?? 1;
  const totalDays = Math.floor(currentSystemDate);
  const displayedYear = baseYear + Math.floor((baseDay - 1 + totalDays) / 365);
  // Ensure modulo handles negatives correctly if currentSystemDate is negative
  let dayMod = (baseDay - 1 + totalDays) % 365;
  if (dayMod < 0) dayMod += 365;
  const displayedDay = dayMod + 1;

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

          {/* Speed Controls */}
          <div className="flex items-center gap-1 ml-1">
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

          <div className="w-[1px] h-4 bg-[var(--color-border-parchment)] mx-2" />

          {/* Calendar Date (Editable) */}
          <div className="flex items-center gap-1 hidden md:flex text-[10px] font-semibold mr-3">
            <span className="text-[var(--color-text-muted)] uppercase mr-1">{activeSphere?.epoch || 'AC'}</span>
            <input
              type="number"
              className="font-mono text-xs text-[var(--color-accent-red)] bg-transparent border-b border-transparent hover:border-[var(--color-border-parchment)] focus:border-[var(--color-accent-gold)] focus:outline-none w-14 text-center"
              value={displayedYear}
              onChange={e => {
                const yr = parseInt(e.target.value, 10);
                if (!isNaN(yr)) {
                  const baseTotal = baseYear * 365 + (baseDay - 1);
                  const newTotal = yr * 365 + (displayedDay - 1);
                  setCurrentSystemDate(newTotal - baseTotal);
                }
              }}
            />
            <span className="text-[var(--color-text-muted)] mx-1">Day</span>
            <input
              type="number"
              min="1"
              max="365"
              className="font-mono text-xs text-[var(--color-accent-red)] bg-transparent border-b border-transparent hover:border-[var(--color-border-parchment)] focus:border-[var(--color-accent-gold)] focus:outline-none w-10 text-center"
              value={displayedDay}
              onChange={e => {
                const dy = parseInt(e.target.value, 10);
                if (!isNaN(dy)) {
                  const baseTotal = baseYear * 365 + (baseDay - 1);
                  const newTotal = displayedYear * 365 + (dy - 1);
                  setCurrentSystemDate(newTotal - baseTotal);
                }
              }}
            />
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
                (activeSphere ? getAllSystemObjects(activeSphere as any) : []).forEach((o: any) => {
                  if (o.type === 'note' || o.type === 'legend' || o.type === 'constellation') return;
                  const dist = (o.distanceOrbited || 0) * (activeSphere?.orbitalDrawStrength || 1);
                  if (dist > maxDist) maxDist = dist;
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
