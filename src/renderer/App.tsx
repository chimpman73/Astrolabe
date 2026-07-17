import React, { useEffect, useState } from 'react';
import { useSystemStore } from './store/useSystemStore';
import { BookmarkView } from './components/BookmarkView';
import { NavChartView } from './components/NavChartView';
import { SaveManager } from './components/SaveManager';
import { OpenSystemModal } from './components/OpenSystemModal';
import { SaveAsModal } from './components/SaveAsModal';
import { Compass, HelpCircle, ChevronRight } from 'lucide-react';
import { shapeManager } from './utils/ShapeManager';

const App: React.FC = () => {
  const {
    activeSphere,
    setSaveDirectory,
    loadSphere,
    savesList,
    saveCurrentSphere,
    toastMessage,
    setToastMessage,
    viewMode,
    setViewMode,
  } = useSystemStore();

  // Dialog overlays state
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [showSaveAsModal, setShowSaveAsModal] = useState(false);

  // Panel collapse states
  const [editorCollapsed, setEditorCollapsed] = useState(false);
  const [bookmarkCollapsed, setBookmarkCollapsed] = useState(false);
  const [systemNavCollapsed, setSystemNavCollapsed] = useState(false);

  // Shape initialization state
  const [, setShapesLoaded] = useState(false);

  // Auto-select documents or last directory on load
  useEffect(() => {
    const initDir = async () => {
      const stored = localStorage.getItem('astrolabe_save_dir');
      if (stored) {
        await setSaveDirectory(stored);
      } else if (window.astrolabeAPI) {
        try {
          const res = await window.astrolabeAPI.getDefaultSaveDirectory();
          if (res.success && res.data) {
            await setSaveDirectory(res.data);
          } else if (!res.success && res.error) {
            useSystemStore.getState().setToastMessage({ type: 'error', text: res.error || 'Failed to get default directory' });
          }
        } catch (err: any) {
          useSystemStore.getState().setToastMessage({ type: 'error', text: err.message || 'IPC error getting default directory' });
        }
      }
    };
    initDir();
  }, [setSaveDirectory]);

  // Listen for global backend errors
  useEffect(() => {
    if (window.astrolabeAPI?.onBackendError) {
      window.astrolabeAPI.onBackendError((data) => {
        useSystemStore.getState().setToastMessage({
          type: 'error',
          text: `[${data.type}] ${data.message}`
        });
      });
    }
  }, []);

  // Initialize ShapeManager
  useEffect(() => {
    shapeManager.init()
      .then(() => setShapesLoaded(true))
      .catch((err) => {
        useSystemStore.getState().setToastMessage({
          type: 'error',
          text: `Shape Directory Init Failure: ${err.message || err}`
        });
      });
  }, []);

  // Auto-load last file if directory is selected and no sphere is active
  useEffect(() => {
    if (savesList.length > 0 && !activeSphere) {
      const lastLoaded = localStorage.getItem('astrolabe_last_loaded_file');
      const normalize = (p: string) => p.replace(/\\/g, '/').toLowerCase();
      
      if (lastLoaded) {
        const match = savesList.find(s => normalize(s.fullPath) === normalize(lastLoaded));
        if (match) {
          loadSphere(match.fullPath);
          return;
        }
      }
      loadSphere(savesList[0].fullPath);
    }
  }, [savesList, activeSphere, loadSphere]);

  const handleOpenClick = () => {
    setShowOpenModal(true);
  };

  const handleNewClick = () => {
    useSystemStore.getState().createNewSphere();
  };

  const handleSaveAsClick = () => {
    setShowSaveAsModal(true);
  };

  const handleSaveClick = async () => {
    if (!activeSphere) return;
    try {
      const success = await saveCurrentSphere();
      if (success) {
        setToastMessage({ type: 'success', text: 'System successfully saved to local directory.' });
      } else {
        setToastMessage({ type: 'error', text: 'Failed to save configuration.' });
      }
    } catch (err: any) {
      setToastMessage({ type: 'error', text: `Save error: ${err.message || err}` });
    }
  };

  useEffect(() => {
    if (window.astrolabeAPI?.onMenuAction) {
      window.astrolabeAPI.onMenuAction((action) => {
        if (action === 'new-file') {
          useSystemStore.getState().createNewSphere();
        } else if (action === 'open-file') {
          setShowOpenModal(true);
        } else if (action === 'save-as') {
          setShowSaveAsModal(true);
        } else if (action === 'save-file') {
          const state = useSystemStore.getState();
          if (!state.activeSphere) return;
          state.saveCurrentSphere().then(success => {
            if (success) {
              state.setToastMessage({ type: 'success', text: 'System successfully saved to local directory.' });
            } else {
              state.setToastMessage({ type: 'error', text: 'Failed to save configuration.' });
            }
          }).catch((err: any) => {
            state.setToastMessage({ type: 'error', text: `Save error: ${err.message || err}` });
          });
        }
      });
    }
  }, []);

  return (
    <div className="app-container">
      
      {/* Toast Notification Box */}
      {toastMessage && (
        <div className="toast-container">
          <div className={`toast-box ${toastMessage.type}`}>
            <span className={`toast-dot ${toastMessage.type}`} />
            {toastMessage.text}
          </div>
        </div>
      )}
      
      {/* Menu / Header Bar */}
      <header className="header-bar">
        
        {/* Brand & 3 Action Buttons */}
        <div className="header-left">
          {/* Logo Brand */}
          <div className="header-brand">
            <Compass className="w-5 h-5 animate-spin-slow stroke-[1.5]" />
            <h1 className="font-title text-sm tracking-widest font-black uppercase">
              ASTROLABE
            </h1>
          </div>

          {/* Action Buttons Directly Exposing File Functions */}
          <div className="header-actions">
            <button
              onClick={handleOpenClick}
              className="header-btn"
              title="Open system configuration picker"
            >
              Open System
            </button>
            <button
              onClick={handleNewClick}
              className="header-btn"
              title="Create a new Crystal Sphere"
            >
              New
            </button>
            <button
              onClick={handleSaveClick}
              disabled={!activeSphere || activeSphere.sphereName === 'Untitled System'}
              className="header-btn"
              title="Save changes to active file"
            >
              Save
            </button>
            <button
              onClick={handleSaveAsClick}
              disabled={!activeSphere}
              className="header-btn"
              title="Save as a new Crystal Sphere"
            >
              Save As
            </button>

            {/* Global PC/DM View Toggle */}
            <div className="flex items-center bg-[var(--color-bg-base)] border border-[var(--color-border-parchment)] ml-4 rounded overflow-hidden">
              <button
                onClick={() => setViewMode('PC')}
                className={`px-3 py-1 text-[10px] font-bold ${viewMode === 'PC' ? 'bg-[var(--color-accent-gold)] text-[#2b2316]' : 'text-[var(--color-text-muted)] hover:bg-[var(--color-border-parchment)]'}`}
                title="PC View: Hides DM-only objects"
              >
                PC VIEW
              </button>
              <button
                onClick={() => setViewMode('DM')}
                className={`px-3 py-1 text-[10px] font-bold border-l border-[var(--color-border-parchment)] ${viewMode === 'DM' ? 'bg-[var(--color-accent-gold)] text-[#2b2316]' : 'text-[var(--color-text-muted)] hover:bg-[var(--color-border-parchment)]'}`}
                title="DM View: Shows all objects"
              >
                DM VIEW
              </button>
            </div>
          </div>
        </div>

        {/* Header Right Details */}
        <div className="header-right">
          <span>D&D Spelljammer Directory Map View</span>
          <HelpCircle className="w-4 h-4 cursor-pointer hover:text-[var(--color-accent-gold)] transition-colors" />
        </div>
      </header>

      {/* Main Panel Content - 3 Vertical Panels side-by-side */}
      <div className="main-workspace">
        {activeSphere ? (
          <>
            {/* Panel 1: JSON Editor */}
            {!editorCollapsed ? (
              <div className="editor-panel">
                <SaveManager onCollapse={() => setEditorCollapsed(true)} />
              </div>
            ) : (
              <div
                onClick={() => setEditorCollapsed(false)}
                className="collapsed-panel"
                title="Expand System Editor"
              >
                <button className="p-1 rounded bg-[var(--color-bg-base)] border border-[var(--color-border-parchment)] text-[var(--color-text-muted)] mb-4">
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <div className="vertical-text">
                  System Editor
                </div>
              </div>
            )}

            {/* Panel 2: Bookmark View */}
            {!bookmarkCollapsed ? (
              <div className="bookmark-panel">
                <BookmarkView onCollapse={() => setBookmarkCollapsed(true)} />
              </div>
            ) : (
              <div
                onClick={() => setBookmarkCollapsed(false)}
                className="collapsed-panel"
                title="Expand Bookmark"
              >
                <button className="p-1 rounded bg-[var(--color-bg-base)] border border-[var(--color-border-parchment)] text-[var(--color-text-muted)] mb-4">
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <div className="vertical-text">
                  Bookmark
                </div>
              </div>
            )}

            {/* Panel 3: System Nav View */}
            {!systemNavCollapsed ? (
              <div className="navchart-panel">
                <NavChartView onCollapse={() => setSystemNavCollapsed(true)} />
              </div>
            ) : (
              <div
                onClick={() => setSystemNavCollapsed(false)}
                className="collapsed-panel last"
                title="Expand Navigation Chart"
              >
                <button className="p-1 rounded bg-[var(--color-bg-base)] border border-[var(--color-border-parchment)] text-[var(--color-text-muted)] mb-4">
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <div className="vertical-text">
                  Navigation Chart
                </div>
              </div>
            )}
          </>
        ) : (
          /* Welcome / Directory Selection Screen */
          <div className="flex-1 h-full flex flex-col items-center justify-center text-center p-8 bg-[var(--color-canvas-bg)] parchment-texture">
            <Compass className="w-20 h-20 text-[var(--color-border-parchment)] stroke-[1] mb-4 animate-pulse" />
            <h2 className="font-title text-2xl text-[var(--color-text-main)] mb-2">
              Uncharted Crystal Sphere
            </h2>
            <p className="text-[var(--color-text-muted)] max-w-sm text-xs leading-relaxed mb-6">
              Please open an existing Spelljammer crystal system configuration file or select a directory using the file menu above to populate active orbit charts.
            </p>
            
            <div className="bg-[var(--color-bg-panel)] p-4 rounded border border-[var(--color-border-parchment)] text-[11px] text-left max-w-xs space-y-2 shadow">
              <span className="font-bold text-[var(--color-accent-red)] block">💡 Navigator Quick Start:</span>
              <div>1. Click <span className="font-semibold text-xs border border-gray-400 bg-white px-1 py-0.5 rounded">Open System</span> in the top-left header.</div>
              <div>2. Set the save directory path if it is currently empty.</div>
              <div>3. Pick <span className="font-mono font-semibold">solar_system.json</span> to load the preview maps.</div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showOpenModal && <OpenSystemModal onClose={() => setShowOpenModal(false)} />}
      {showSaveAsModal && <SaveAsModal onClose={() => setShowSaveAsModal(false)} />}
    </div>
  );
};

export default App;
