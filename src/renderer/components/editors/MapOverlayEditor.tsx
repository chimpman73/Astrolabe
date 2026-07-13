import React from 'react';
import { CelestialObject, CelestialObjectType } from '../../../types/astrolabe';

interface MapOverlayEditorProps {
  obj: any;
  handleUpdateObject: (id: string, updated: Partial<CelestialObject>) => void;
}

export const MapOverlayEditor: React.FC<MapOverlayEditorProps> = ({ obj, handleUpdateObject }) => {
  const id = obj.id;

  return (
    <>
      {/* SECTION 1: Type & Configuration */}
      <div className="save-manager-section-header mt-4 mb-2 border-b border-[var(--color-border-parchment)] pb-1">
        <h5 className="font-title text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">
          Type & Configuration
        </h5>
      </div>

      <div className="editor-form-group">
        <label>Type</label>
        <select 
          className="editor-select"
          value={obj.type}
          onChange={e => handleUpdateObject(id, { type: e.target.value as CelestialObjectType })}
        >
          <option value="note">📝 Map Note</option>
          <option value="legend">🗺️ Legend</option>
        </select>
      </div>

      {obj.type === 'note' && (
        <div className="editor-form-group">
          <label>Note Text</label>
          <textarea 
            className="editor-textarea"
            value={obj.description || ''}
            onChange={e => handleUpdateObject(id, { description: e.target.value })}
            placeholder="Enter map note text here..."
          />
        </div>
      )}

      {obj.type === 'legend' && (
        <div className="editor-form-group">
          <label>Legend Type & Mode</label>
          <div style={{ display: 'flex', flexDirection: 'row', gap: '8px', width: '100%' }}>
            <select
              className="editor-select"
              style={{ flex: '1 1 0%', minWidth: 0 }}
              value={obj.legendType || 'PlanetType'}
              onChange={e => handleUpdateObject(id, { legendType: e.target.value as any })}
              title="Legend Type"
            >
              <option value="PlanetType">Planet Type</option>
              <option value="OrbitType">Orbit Type</option>
              <option value="ElementalAffinity">Elemental Affinity</option>
            </select>
            <select
              className="editor-select"
              style={{ flex: '1 1 0%', minWidth: 0 }}
              value={obj.legendMode || 'partial'}
              onChange={e => handleUpdateObject(id, { legendMode: e.target.value as any })}
              title="Legend Mode"
            >
              <option value="full">Full (All Icons)</option>
              <option value="partial">Partial (Present in System)</option>
            </select>
          </div>
        </div>
      )}

      {/* SECTION 2: Placement & Layout */}
      <div className="save-manager-section-header mt-5 mb-2 border-b border-[var(--color-border-parchment)] pb-1">
        <h5 className="font-title text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">
          Placement & Layout
        </h5>
      </div>

      <div className="editor-form-group">
        <label>Distance from Center (AU) & Angle (Deg)</label>
        <div style={{ display: 'flex', flexDirection: 'row', gap: '8px', width: '100%' }}>
          <input
            type="number"
            step="0.1"
            min="0"
            className="editor-input"
            style={{ flex: '1 1 0%', minWidth: 0 }}
            value={obj.type === 'note' ? (obj.noteDistanceAU ?? 0) : (obj.legendDistanceAU ?? 0)}
            onChange={e => handleUpdateObject(id, obj.type === 'note' ? { noteDistanceAU: parseFloat(e.target.value) || 0 } : { legendDistanceAU: parseFloat(e.target.value) || 0 })}
            title="Distance from Center (AU)"
          />
          <input
            type="number"
            step="1"
            min="0"
            max="360"
            className="editor-input"
            style={{ flex: '1 1 0%', minWidth: 0 }}
            value={obj.type === 'note' ? (obj.noteAngle ?? 0) : (obj.legendAngle ?? 0)}
            onChange={e => handleUpdateObject(id, obj.type === 'note' ? { noteAngle: parseFloat(e.target.value) || 0 } : { legendAngle: parseFloat(e.target.value) || 0 })}
            title="Angle (Degrees)"
          />
        </div>
      </div>

      {obj.type === 'note' && (
        <div className="editor-form-group">
          <label>Rotation, Max Width, & Max Height</label>
          <div style={{ display: 'flex', flexDirection: 'row', gap: '8px', width: '100%' }}>
            <input
              type="number"
              step="1"
              min="-360"
              max="360"
              className="editor-input"
              style={{ flex: '1 1 0%', minWidth: 0 }}
              value={obj.noteRotation ?? 0}
              onChange={e => handleUpdateObject(id, { noteRotation: parseFloat(e.target.value) || 0 })}
              title="Rotation (Degrees)"
            />
            <input
              type="number"
              step="10"
              min="50"
              max="2000"
              className="editor-input"
              style={{ flex: '1 1 0%', minWidth: 0 }}
              value={obj.noteMaxWidth ?? 120}
              onChange={e => handleUpdateObject(id, { noteMaxWidth: parseInt(e.target.value, 10) || 120 })}
              title="Max Width (px)"
            />
            <input
              type="number"
              step="10"
              min="50"
              max="2000"
              className="editor-input"
              style={{ flex: '1 1 0%', minWidth: 0 }}
              value={obj.noteMaxHeight ?? 60}
              onChange={e => handleUpdateObject(id, { noteMaxHeight: parseInt(e.target.value, 10) || 60 })}
              title="Max Height (px)"
            />
          </div>
        </div>
      )}

      {obj.type === 'legend' && (
        <div className="editor-form-group">
          <label>Scale Multiplier</label>
          <input
            type="number"
            step="0.05"
            min="0.05"
            max="10.0"
            className="editor-input"
            value={obj.legendScale ?? 1.0}
            onChange={e => {
              const val = parseFloat(e.target.value);
              handleUpdateObject(id, { legendScale: isNaN(val) ? 0 : val });
            }}
          />
        </div>
      )}

      {/* SECTION 3: Typography */}
      <div className="save-manager-section-header mt-5 mb-2 border-b border-[var(--color-border-parchment)] pb-1">
        <h5 className="font-title text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">
          Typography
        </h5>
      </div>

      <div className="editor-form-group">
        <label>Font Family & Size (px)</label>
        <div style={{ display: 'flex', flexDirection: 'row', gap: '8px', width: '100%' }}>
          <select
            className="editor-select"
            style={{ flex: '2 1 0%', minWidth: 0 }}
            value={obj.type === 'note' ? (obj.noteFontFamily || 'Elan') : (obj.legendFontFamily || 'Elan')}
            onChange={e => handleUpdateObject(id, obj.type === 'note' ? { noteFontFamily: e.target.value } : { legendFontFamily: e.target.value })}
            title="Font Family"
          >
            {[
              'Elan', 'Mephisto', 'Cinzel', 'Architects Daughter', 'Caveat',
              'Kalam', 'Homemade Apple', 'Reenie Beanie', 'Shadows Into Light',
              'Sacramento', 'Marck Script', 'Mr Dafoe', 'Herr Von Muellerhoff',
              'IM Fell English', 'UnifrakturMaguntia', 'MedievalSharp', 'Pirata One',
              'Grenze Gotisch'
            ].map(font => (
              <option key={font} value={font}>{font}</option>
            ))}
          </select>
          <input
            type="number"
            step="1"
            min="8"
            max="144"
            className="editor-input"
            style={{ flex: '1 1 0%', minWidth: 0 }}
            value={obj.type === 'note' ? (obj.noteFontSize ?? 16) : (obj.legendFontSize ?? 16)}
            onChange={e => handleUpdateObject(id, obj.type === 'note' ? { noteFontSize: parseInt(e.target.value, 10) || 16 } : { legendFontSize: parseInt(e.target.value, 10) || 16 })}
            title="Font Size (px)"
          />
        </div>
      </div>
    </>
  );
};
