import React, { useRef } from 'react';
import { useSystemStore } from '../store/useSystemStore';
import { ChevronLeft } from 'lucide-react';
import { BookmarkCanvas, BookmarkCanvasHandle } from './BookmarkCanvas';

interface BookmarkViewProps {
  onCollapse?: () => void;
}

export const BookmarkView: React.FC<BookmarkViewProps> = ({ onCollapse }) => {
  const {
    bookmarkBackgroundMode,
    bookmarkShowShell,
    bookmarkShowDistance,
    setBookmarkBackgroundMode,
    setBookmarkShowShell,
    setBookmarkShowDistance,
  } = useSystemStore();

  const canvasRef = useRef<BookmarkCanvasHandle>(null);

  return (
    <div className="bookmark-view-content">
      <div className="save-manager-header w-full">
        <div className="save-manager-header-title">
          {onCollapse && (
            <button
              onClick={onCollapse}
              className="save-manager-collapse-btn"
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
            onClick={() => canvasRef.current?.handleExport()}
            className="text-[8px] font-bold px-1.5 py-0.5 bg-[var(--color-accent-gold)] text-[#2b2316] rounded hover:brightness-95 transition-colors"
            title="Export 300 DPI PNG"
          >
            EXP
          </button>
        </div>
      </div>

      {/* Bookmark Canvas Container */}
      <div className="bookmark-canvas-container">
        <BookmarkCanvas ref={canvasRef} />
      </div>
    </div>
  );
};
