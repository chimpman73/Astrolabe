import React, { useState, useEffect } from 'react';
import { useSystemStore } from '../store/useSystemStore';
import { AlertCircle, ChevronLeft } from 'lucide-react';

interface SaveManagerProps {
  onCollapse?: () => void;
}

export const SaveManager: React.FC<SaveManagerProps> = ({ onCollapse }) => {
  const {
    activeSphere,
    saveCurrentSphere,
    setSphere,
  } = useSystemStore();

  const [jsonText, setJsonText] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [loading, setLoading] = useState(false);

  // Sync editor text with activeSphere store changes
  useEffect(() => {
    if (activeSphere) {
      const formatted = JSON.stringify(activeSphere, null, 2);
      setJsonText(formatted);
      setValidationError(null);
      setIsDirty(false);
    }
  }, [activeSphere]);

  const handleJsonChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setJsonText(val);
    setIsDirty(true);

    try {
      const parsed = JSON.parse(val);
      if (!parsed.sphereName) {
        setValidationError('Validation Error: Missing "sphereName" property.');
      } else if (!parsed.currentCampaignDate) {
        setValidationError('Validation Error: Missing "currentCampaignDate" property.');
      } else if (parsed.currentSystemDate === undefined) {
        setValidationError('Validation Error: Missing "currentSystemDate" property.');
      } else if (!Array.isArray(parsed.objects)) {
        setValidationError('Validation Error: "objects" must be an array.');
      } else {
        // Validate objects schema
        let objError = null;
        for (let i = 0; i < parsed.objects.length; i++) {
          const obj = parsed.objects[i];
          if (!obj.name) {
            objError = `Validation Error: Object at index ${i} is missing "name".`;
            break;
          }
          if (!obj.type) {
            objError = `Validation Error: Object "${obj.name}" is missing "type".`;
            break;
          }
          if (obj.distanceOrbited === undefined) {
            objError = `Validation Error: Object "${obj.name}" is missing "distanceOrbited".`;
            break;
          }
        }
        setValidationError(objError);
      }
    } catch (err: any) {
      setValidationError(`Syntax Error: ${err.message}`);
    }
  };

  const handleApplyChanges = async () => {
    if (validationError) return;
    setLoading(true);
    try {
      const parsed = JSON.parse(jsonText);
      setSphere(parsed);
      setIsDirty(false);
      
      // Save changes back to the JSON file
      await saveCurrentSphere();
    } catch (err: any) {
      setValidationError(`Apply failed: ${err.message}`);
    }
    setLoading(false);
  };

  const handleDiscardChanges = () => {
    if (activeSphere) {
      setJsonText(JSON.stringify(activeSphere, null, 2));
      setValidationError(null);
      setIsDirty(false);
    }
  };


  return (
    <div className="flex flex-col h-full bg-[var(--color-bg-panel)] scroll-border p-4 shadow-lg overflow-hidden">
      
      {/* Sidebar Header */}
      <div className="border-b border-[var(--color-border-parchment)] pb-2 mb-3 shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {onCollapse && (
            <button
              onClick={onCollapse}
              className="p-1 rounded hover:bg-[var(--color-bg-base)] text-[var(--color-text-muted)] border border-transparent hover:border-[var(--color-border-parchment)] transition-all"
              title="Collapse Editor Panel"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          )}
          <h4 className="font-title text-xs font-bold tracking-wider text-[var(--color-text-main)] uppercase">
            JSON EDITOR
          </h4>
        </div>
        
        {/* Controls: Discard / Apply & Save */}
        {activeSphere && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleDiscardChanges}
              disabled={!isDirty || loading}
              className="text-[9px] font-bold px-2 py-0.5 bg-[var(--color-bg-base)] scroll-border hover:bg-[var(--color-border-parchment)] transition-colors disabled:opacity-50"
              title="Discard all unapplied text modifications"
            >
              Discard
            </button>
            <button
              onClick={handleApplyChanges}
              disabled={!isDirty || !!validationError || loading}
              className="text-[9px] font-bold px-2 py-0.5 bg-[var(--color-accent-gold)] text-[#2b2316] rounded hover:brightness-95 transition-all disabled:opacity-50"
              title="Apply changes and save to file"
            >
              {loading ? 'APPLYING...' : 'APPLY & SAVE'}
            </button>
          </div>
        )}
      </div>

      {/* Editor Main Text Area */}
      <div className="flex-1 flex flex-col min-h-0 relative">
        <div className="text-xs font-semibold text-[var(--color-text-muted)] mb-1 flex items-center justify-between">
          <span>raw JSON system definitions</span>
          {isDirty && !validationError && (
            <span className="text-[10px] bg-[var(--color-accent-gold)] text-[#2b2316] font-bold px-1 rounded animate-pulse">
              UNAPPLIED CHANGES
            </span>
          )}
        </div>
        
        <textarea
          value={jsonText}
          onChange={handleJsonChange}
          disabled={!activeSphere}
          className="flex-1 w-full p-3 font-mono text-[11px] leading-relaxed bg-[var(--color-canvas-bg)] text-[var(--color-text-main)] scroll-border outline-none resize-none focus:border-[var(--color-accent-gold)] focus:ring-1 focus:ring-[var(--color-accent-gold)] selection:bg-[var(--color-accent-gold)] selection:bg-opacity-30 disabled:opacity-50"
          placeholder="Select File -> Open in the top-left menu to load a system config JSON..."
          spellCheck={false}
        />
      </div>

      {/* Validation Banner */}
      {validationError && (
        <div className="mt-2.5 p-2.5 bg-red-100 dark:bg-red-950 border border-red-300 dark:border-red-800 rounded flex gap-2 items-start shrink-0">
          <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
          <div className="text-[10px] font-semibold text-red-700 dark:text-red-300 break-words leading-normal max-w-full">
            {validationError}
          </div>
        </div>
      )}

    </div>
  );
};
