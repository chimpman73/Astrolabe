import React, { useState, useEffect } from 'react';
import { useSystemStore } from '../store/useSystemStore';

interface NewSystemModalProps {
  onClose: () => void;
}

export const SaveAsModal: React.FC<NewSystemModalProps> = ({ onClose }) => {
  const { activeSphere, updateActiveSphereMeta, saveCurrentSphere, setToastMessage } = useSystemStore();
  const [newSphereName, setNewSphereName] = useState('');

  useEffect(() => {
    if (activeSphere) {
      if (activeSphere.sphereName === 'Untitled System') {
        setNewSphereName('');
      } else {
        setNewSphereName(activeSphere.sphereName + ' (Copy)');
      }
    }
  }, [activeSphere]);

  const handleSaveAsSphere = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newSphereName.trim();
    if (!name) return;
    try {
      updateActiveSphereMeta({ sphereName: name });
      const success = await saveCurrentSphere();
      if (success) {
        setToastMessage({ type: 'success', text: `Successfully saved as "${name}"!` });
      } else {
        setToastMessage({ type: 'error', text: `Failed to save new configuration.` });
      }
      onClose();
    } catch (err: any) {
      setToastMessage({ type: 'error', text: `Save As Error: ${err.message || err}` });
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <form
        onSubmit={handleSaveAsSphere}
        className="bg-[var(--color-bg-panel)] scroll-border p-6 rounded shadow-xl max-w-sm w-full"
      >
        <h4 className="font-title text-base border-b border-[var(--color-border-parchment)] pb-2 mb-4 font-bold">
          Save As...
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
            onClick={onClose}
            className="px-3 py-1.5 border border-[var(--color-border-parchment)] text-xs rounded hover:bg-[var(--color-bg-base)]"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-1.5 bg-[var(--color-accent-gold)] text-[#2b2316] font-title font-bold text-xs rounded hover:brightness-95 transition-all"
          >
            Save
          </button>
        </div>
      </form>
    </div>
  );
};
