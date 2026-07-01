import React, { useEffect, useState } from 'react';
import { useSystemStore } from './store/useSystemStore';
import { BookmarkView } from './components/BookmarkView';
import { NavChartView } from './components/NavChartView';
import { SaveManager } from './components/SaveManager';
import { Compass, HelpCircle, FileJson, X, ChevronRight } from 'lucide-react';

const App: React.FC = () => {
  const {
    activeSphere,
    setSaveDirectory,
    loadSphere,
    savesList,
    saveCurrentSphere,
    createNewSphere,
    saveDirectory,
  } = useSystemStore();

  // Dialog overlays state
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newSphereName, setNewSphereName] = useState('');

  // Panel collapse states
  const [editorCollapsed, setEditorCollapsed] = useState(false);
  const [bookmarkCollapsed, setBookmarkCollapsed] = useState(false);
  const [systemNavCollapsed, setSystemNavCollapsed] = useState(false);

  // Auto-select documents or last directory on load
  useEffect(() => {
    const initDir = async () => {
      const stored = localStorage.getItem('astrolabe_save_dir');
      if (stored) {
        await setSaveDirectory(stored);
      } else if (window.astrolabeAPI) {
        const res = await window.astrolabeAPI.getDefaultSaveDirectory();
        if (res.success && res.data) {
          await setSaveDirectory(res.data);
        }
      }
    };
    initDir();
  }, [setSaveDirectory]);

  // Auto-load first file if directory is selected and no sphere is active
  useEffect(() => {
    if (savesList.length > 0 && !activeSphere) {
      loadSphere(savesList[0].fullPath);
    }
  }, [savesList, activeSphere, loadSphere]);

  const handleOpenClick = () => {
    setShowOpenModal(true);
  };

  const handleNewClick = () => {
    setShowNewModal(true);
  };

  const handleSaveClick = async () => {
    if (!activeSphere) return;
    const success = await saveCurrentSphere();
    if (success) {
      alert('System successfully saved to local directory.');
    } else {
      alert('Failed to save configuration.');
    }
  };

  const handleCreateNewSphere = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSphereName.trim()) return;
    await createNewSphere(newSphereName);
    setNewSphereName('');
    setShowNewModal(false);
  };

  const handleSelectDirectory = async () => {
    if (!window.astrolabeAPI) return;
    const res = await window.astrolabeAPI.selectSaveDirectory();
    if (res.success && res.data) {
      await setSaveDirectory(res.data);
    }
  };

  return (
    <div className="app-container">
      
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
              disabled={!activeSphere}
              className="header-btn"
              title="Save changes to active file"
            >
              Save
            </button>
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
                title="Expand Editor Panel"
              >
                <button className="p-1 rounded bg-[var(--color-bg-base)] border border-[var(--color-border-parchment)] text-[var(--color-text-muted)] mb-4">
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <div className="vertical-text">
                  JSON EDITOR
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
                title="Expand Bookmark Panel"
              >
                <button className="p-1 rounded bg-[var(--color-bg-base)] border border-[var(--color-border-parchment)] text-[var(--color-text-muted)] mb-4">
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <div className="vertical-text">
                  BOOKMARK MAP
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
                title="Expand Map Panel"
              >
                <button className="p-1 rounded bg-[var(--color-bg-base)] border border-[var(--color-border-parchment)] text-[var(--color-text-muted)] mb-4">
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <div className="vertical-text">
                  SYSTEM CHART
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

      {/* Modal Overlay: File Open Picker */}
      {showOpenModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--color-bg-panel)] scroll-border p-6 rounded shadow-xl max-w-md w-full max-h-[80vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[var(--color-border-parchment)] pb-2 mb-4 shrink-0">
              <h4 className="font-title text-lg font-bold">Open Crystal Sphere System</h4>
              <button
                onClick={() => setShowOpenModal(false)}
                className="p-1 rounded hover:bg-[var(--color-bg-base)] text-[var(--color-text-muted)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Folder Selection Header info */}
            <div className="mb-4 text-xs shrink-0">
              <span className="font-bold text-[var(--color-text-muted)] block uppercase mb-1">Active Directory:</span>
              <div className="font-mono bg-[var(--color-bg-base)] p-2 rounded text-[10px] break-all border border-[var(--color-border-parchment)] mb-2 flex items-center justify-between gap-2">
                <span className="truncate flex-1">{saveDirectory || 'No directory selected'}</span>
                <button
                  onClick={handleSelectDirectory}
                  className="px-2 py-0.5 bg-[var(--color-border-parchment)] text-[10px] rounded hover:brightness-95 select-none shrink-0"
                >
                  Change
                </button>
              </div>
            </div>

            {/* Saves Directory Files List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[150px]">
              {savesList.length === 0 ? (
                <div className="text-center text-xs text-[var(--color-text-muted)] italic py-10">
                  No compatible CrystalSphere .json configuration files found in this save directory.
                </div>
              ) : (
                savesList.map((file) => {
                  const isActive = activeSphere?.sphereName === file.sphereName;
                  return (
                    <button
                      key={file.filename}
                      onClick={() => {
                        loadSphere(file.fullPath);
                        setShowOpenModal(false);
                      }}
                      className={`w-full flex items-start gap-3 p-3 text-left transition-colors border rounded ${isActive ? 'bg-[var(--color-accent-gold)] bg-opacity-20 border-[var(--color-accent-gold)]' : 'bg-[var(--color-bg-base)] border-[var(--color-border-parchment)] hover:bg-[var(--color-border-parchment)]'}`}
                    >
                      <FileJson className={`w-5 h-5 shrink-0 mt-0.5 ${isActive ? 'text-[var(--color-accent-gold)]' : 'text-[var(--color-text-muted)]'}`} />
                      <div className="overflow-hidden">
                        <div className="font-bold text-xs truncate">{file.sphereName}</div>
                        <div className="text-[9px] text-[var(--color-text-muted)] truncate">{file.filename}</div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Modal Footer close button */}
            <div className="mt-4 border-t border-[var(--color-border-parchment)] pt-3 flex justify-end shrink-0">
              <button
                onClick={() => setShowOpenModal(false)}
                className="px-4 py-1.5 border border-[var(--color-border-parchment)] hover:bg-[var(--color-bg-base)] text-xs font-semibold rounded"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Overlay: Create New Sphere */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <form
            onSubmit={handleCreateNewSphere}
            className="bg-[var(--color-bg-panel)] scroll-border p-6 rounded shadow-xl max-w-sm w-full"
          >
            <h4 className="font-title text-base border-b border-[var(--color-border-parchment)] pb-2 mb-4 font-bold">
              New Crystal Sphere
            </h4>
            <div className="mb-4">
              <label className="block text-[10px] font-bold text-[var(--color-text-muted)] uppercase mb-1">
                Sphere Name:
              </label>
              <input
                type="text"
                required
                value={newSphereName}
                onChange={(e) => setNewSphereName(e.target.value)}
                placeholder="e.g. Realmspace"
                className="w-full p-2 text-xs bg-[var(--color-bg-base)] scroll-border outline-none focus:border-[var(--color-accent-gold)]"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowNewModal(false)}
                className="px-3 py-1.5 border border-[var(--color-border-parchment)] text-xs rounded hover:bg-[var(--color-bg-base)]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-[var(--color-accent-gold)] text-[#2b2316] font-title font-bold text-xs rounded hover:brightness-95 transition-all"
              >
                Create System
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default App;
