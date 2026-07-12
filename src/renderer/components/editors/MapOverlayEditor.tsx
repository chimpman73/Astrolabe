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
        <>
          <div className="editor-form-group">
            <label>Distance from Center (AU)</label>
            <input
              type="number"
              step="0.1"
              min="0"
              className="editor-input"
              value={obj.noteDistanceAU ?? 0}
              onChange={e => handleUpdateObject(id, { noteDistanceAU: parseFloat(e.target.value) || 0 })}
            />
          </div>
          <div className="editor-form-group">
            <label>Angle (Degrees)</label>
            <input
              type="number"
              step="1"
              min="0"
              max="360"
              className="editor-input"
              value={obj.noteAngle ?? 0}
              onChange={e => handleUpdateObject(id, { noteAngle: parseFloat(e.target.value) || 0 })}
            />
          </div>
          <div className="editor-form-group">
            <label>Rotation (Degrees)</label>
            <input
              type="number"
              step="1"
              min="-360"
              max="360"
              className="editor-input"
              value={obj.noteRotation ?? 0}
              onChange={e => handleUpdateObject(id, { noteRotation: parseFloat(e.target.value) || 0 })}
            />
          </div>
          <div className="editor-form-group">
            <label>Font Family</label>
            <select
              className="editor-select"
              value={obj.noteFontFamily || 'Elan'}
              onChange={e => handleUpdateObject(id, { noteFontFamily: e.target.value })}
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
          </div>
          <div className="editor-form-group">
            <label>Font Size (px)</label>
            <input
              type="number"
              step="1"
              min="8"
              max="144"
              className="editor-input"
              value={obj.noteFontSize ?? 16}
              onChange={e => handleUpdateObject(id, { noteFontSize: parseInt(e.target.value, 10) || 16 })}
            />
          </div>
          <div className="editor-form-group">
            <label>Max Width (px)</label>
            <input
              type="number"
              step="10"
              min="50"
              max="2000"
              className="editor-input"
              value={obj.noteMaxWidth ?? 120}
              onChange={e => handleUpdateObject(id, { noteMaxWidth: parseInt(e.target.value, 10) || 120 })}
            />
          </div>
          <div className="editor-form-group">
            <label>Max Height (px)</label>
            <input
              type="number"
              step="10"
              min="50"
              max="2000"
              className="editor-input"
              value={obj.noteMaxHeight ?? 60}
              onChange={e => handleUpdateObject(id, { noteMaxHeight: parseInt(e.target.value, 10) || 60 })}
            />
          </div>
        </>
      )}

      {obj.type === 'legend' && (
        <>
          <div className="editor-form-group">
            <label>Distance from Center (AU)</label>
            <input
              type="number"
              step="0.1"
              min="0"
              className="editor-input"
              value={obj.legendDistanceAU ?? 0}
              onChange={e => handleUpdateObject(id, { legendDistanceAU: parseFloat(e.target.value) || 0 })}
            />
          </div>
          <div className="editor-form-group">
            <label>Angle (Degrees)</label>
            <input
              type="number"
              step="1"
              min="0"
              max="360"
              className="editor-input"
              value={obj.legendAngle ?? 0}
              onChange={e => handleUpdateObject(id, { legendAngle: parseFloat(e.target.value) || 0 })}
            />
          </div>
          <div className="editor-form-group">
            <label>Legend Type</label>
            <select
              className="editor-select"
              value={obj.legendType || 'PlanetType'}
              onChange={e => handleUpdateObject(id, { legendType: e.target.value as any })}
            >
              <option value="PlanetType">Planet Type</option>
              <option value="OrbitType">Orbit Type</option>
              <option value="ElementalAffinity">Elemental Affinity</option>
            </select>
          </div>
          <div className="editor-form-group">
            <label>Legend Mode</label>
            <select
              className="editor-select"
              value={obj.legendMode || 'partial'}
              onChange={e => handleUpdateObject(id, { legendMode: e.target.value as any })}
            >
              <option value="full">Full (All Icons)</option>
              <option value="partial">Partial (Present in System)</option>
            </select>
          </div>
          <div className="editor-form-group">
            <label>Font Family</label>
            <select
              className="editor-select"
              value={obj.legendFontFamily || 'Elan'}
              onChange={e => handleUpdateObject(id, { legendFontFamily: e.target.value })}
            >
              {[
                'Elan', 'Mephisto', 'Cinzel', 'Architects Daughter', 'Caveat',
                'Kalam', 'MedievalSharp', 'Grenze Gotisch'
              ].map(font => (
                <option key={font} value={font}>{font}</option>
              ))}
            </select>
          </div>
          <div className="editor-form-group">
            <label>Font Size (px)</label>
            <input
              type="number"
              step="1"
              min="8"
              max="144"
              className="editor-input"
              value={obj.legendFontSize ?? 16}
              onChange={e => handleUpdateObject(id, { legendFontSize: parseInt(e.target.value, 10) || 16 })}
            />
          </div>
          <div className="editor-form-group">
            <label>Scale Multiplier</label>
            <input
              type="number"
              step="0.1"
              min="0.1"
              max="10.0"
              className="editor-input"
              value={obj.legendScale ?? 1.0}
              onChange={e => handleUpdateObject(id, { legendScale: parseFloat(e.target.value) || 1.0 })}
            />
          </div>
        </>
      )}

      {obj.type !== 'legend' && (
        <div className="editor-form-group">
          <label>Note Text</label>
          <textarea 
            className="editor-textarea"
            value={obj.description || ''}
            onChange={e => handleUpdateObject(id, { description: e.target.value })}
          />
        </div>
      )}
    </>
  );
};
