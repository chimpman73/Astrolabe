import React from 'react';
import { useSystemStore } from '../store/useSystemStore';
import { X, FileJson } from 'lucide-react';

interface OpenSystemModalProps {
  onClose: () => void;
}

export const OpenSystemModal: React.FC<OpenSystemModalProps> = ({ onClose }) => {
  const {
    activeSphere,
    savesList,
    saveDirectory,
    loadSphere,
    setSaveDirectory,
  } = useSystemStore();

  const handleSelectDirectory = async () => {
    if (!window.astrolabeAPI) return;
    const res = await window.astrolabeAPI.selectSaveDirectory();
    if (res.success && res.data) {
      await setSaveDirectory(res.data);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--color-bg-panel)] scroll-border p-6 rounded shadow-xl max-w-md w-full max-h-[80vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[var(--color-border-parchment)] pb-2 mb-4 shrink-0">
          <h4 className="font-title text-lg font-bold">Open Crystal Sphere System</h4>
          <button
            onClick={onClose}
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
                    onClose();
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
            onClick={onClose}
            className="px-4 py-1.5 border border-[var(--color-border-parchment)] hover:bg-[var(--color-bg-base)] text-xs font-semibold rounded"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
