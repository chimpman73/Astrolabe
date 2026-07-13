import React from 'react';
import { CelestialObject, CelestialObjectType, WorldShape, SizeClass, ElementAffinity } from '../../../types/astrolabe';

interface PhenomenonEditorProps {
  obj: any;
  allObjects: CelestialObject[];
  handleUpdateObject: (id: string, updated: Partial<CelestialObject>) => void;
}

export const PhenomenonEditor: React.FC<PhenomenonEditorProps> = ({ obj, allObjects, handleUpdateObject }) => {
  const id = obj.id;

  return (
    <>
      {/* SECTION 1: Classification & Appearance */}
      <div className="save-manager-section-header mt-4 mb-2 border-b border-[var(--color-border-parchment)] pb-1">
        <h5 className="font-title text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">
          Classification & Appearance
        </h5>
      </div>

      <div className="flex gap-2">
        <div className="editor-form-group flex-1">
          <label>Type</label>
          <select 
            className="editor-select"
            value={obj.type}
            onChange={e => handleUpdateObject(id, { type: e.target.value as CelestialObjectType })}
          >
            <option value="cloud">☁️ Cloud</option>
          </select>
        </div>

        <div className="editor-form-group flex-1">
          <label>Element Affinity</label>
          <select
            className="editor-select"
            value={obj.elementAffinity ?? ''}
            onChange={e => handleUpdateObject(id, { elementAffinity: (e.target.value || null) as ElementAffinity | null })}
          >
            <option value="">None</option>
            <option value="fire">🔥 Fire</option>
            <option value="water">💧 Water</option>
            <option value="earth">🪨 Earth</option>
            <option value="air">💨 Air</option>
            <option value="mixed">🌿 Mixed</option>
            <option value="none">⋄ No Affinity</option>
          </select>
        </div>
      </div>

      <div className="editor-form-group">
        <label>Arc Width (Degrees)</label>
        <input
          type="number"
          step="1"
          min="1"
          max="359"
          className="editor-input"
          value={obj.arcDegrees ?? 30}
          onChange={e => handleUpdateObject(id, { arcDegrees: parseFloat(e.target.value) || 30 })}
        />
      </div>

      <div className="editor-form-group">
        <label>Transparency & Cloudiness</label>
        <div style={{ display: 'flex', flexDirection: 'row', gap: '8px', width: '100%' }}>
          <input
            type="number"
            step="0.05"
            min="0"
            max="1"
            className="editor-input"
            style={{ flex: '1 1 0%', minWidth: 0 }}
            value={obj.cloudTransparency ?? 0.45}
            onChange={e => handleUpdateObject(id, { cloudTransparency: parseFloat(e.target.value) || 0 })}
            title="Transparency (0-1)"
          />
          <input
            type="number"
            step="0.05"
            min="0"
            max="1"
            className="editor-input"
            style={{ flex: '1 1 0%', minWidth: 0 }}
            value={obj.cloudiness ?? 0.5}
            onChange={e => handleUpdateObject(id, { cloudiness: parseFloat(e.target.value) || 0 })}
            title="Cloudiness (0-1)"
          />
        </div>
      </div>

      <div className="editor-form-group">
        <label>Internal Shape & Density</label>
        <div style={{ display: 'flex', flexDirection: 'row', gap: '8px', width: '100%' }}>
          <select
            className="editor-select"
            style={{ flex: '1 1 0%', minWidth: 0 }}
            value={obj.cloudObjectShape ?? 'sphere'}
            onChange={e => handleUpdateObject(id, { cloudObjectShape: e.target.value as WorldShape })}
            title="Internal Shape"
          >
            <option value="sphere">● Sphere (Default)</option>
            <option value="disc">⬡ Disc</option>
            <option value="pyramid">△ Pyramid</option>
            <option value="cluster">⊛ Cluster</option>
            <option value="irregular">✦ Irregular</option>
            <option value="elliptical">⬭ Elliptical</option>
          </select>
          <input
            type="number"
            step="1"
            min="0"
            className="editor-input"
            style={{ flex: '1 1 0%', minWidth: 0 }}
            value={obj.cloudObjectDensity ?? 0}
            onChange={e => handleUpdateObject(id, { cloudObjectDensity: parseInt(e.target.value, 10) || 0 })}
            title="Internal Density"
          />
        </div>
      </div>

      <div className="editor-form-group">
        <label>Internal Size Class & Size (miles)</label>
        <div style={{ display: 'flex', flexDirection: 'row', gap: '8px', width: '100%' }}>
          <select
            className="editor-select"
            style={{ flex: '1 1 0%', minWidth: 0 }}
            value={obj.cloudObjectSizeClass ?? 'A'}
            onChange={e => handleUpdateObject(id, { cloudObjectSizeClass: e.target.value as SizeClass })}
            title="Internal Size Class"
          >
            <option value="A">A (&lt; 10 mi)</option>
            <option value="B">B (10-100 mi)</option>
            <option value="C">C (100-1,000 mi)</option>
            <option value="D">D (1,000-4,000 mi)</option>
            <option value="E">E (4,000-10,000 mi)</option>
            <option value="F">F (10,000-40,000 mi)</option>
            <option value="G">G (40k-100k mi)</option>
            <option value="H">H (100k-1m mi)</option>
            <option value="I">I (1m-10m mi)</option>
          </select>
          <input
            type="number"
            step="any"
            min="0"
            className="editor-input"
            style={{ flex: '1 1 0%', minWidth: 0 }}
            value={obj.cloudObjectPhysicalSize ?? 5}
            onChange={e => handleUpdateObject(id, { cloudObjectPhysicalSize: parseFloat(e.target.value) || 0 })}
            title="Internal Physical Size"
          />
        </div>
      </div>

      {/* SECTION 2: Orbital Mechanics */}
      <div className="save-manager-section-header mt-5 mb-2 border-b border-[var(--color-border-parchment)] pb-1">
        <h5 className="font-title text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">
          Orbital Mechanics
        </h5>
      </div>

      <div className="editor-form-group">
        <label>Orbiting Parent & Distance (AU)</label>
        <div style={{ display: 'flex', flexDirection: 'row', gap: '8px', width: '100%' }}>
          <select 
            className="editor-select"
            style={{ flex: '1 1 0%', minWidth: 0 }}
            value={obj.orbitedObjectName || ''}
            onChange={e => handleUpdateObject(id, { orbitedObjectName: e.target.value === '' ? null : e.target.value })}
            title="Orbiting Parent"
          >
            <option value="">System Center</option>
            {allObjects
              .filter(o => o.name !== obj.name && o.type !== 'moon')
              .map(o => (
                <option key={o.name} value={o.name}>{o.name}</option>
              ))}
          </select>
          <input 
            type="number" 
            step="any"
            className="editor-input"
            style={{ flex: '1 1 0%', minWidth: 0 }}
            value={(obj.distanceOrbited || 0)}
            onChange={e => handleUpdateObject(id, { distanceOrbited: parseFloat(e.target.value) || 0 })}
            title="Orbit Distance (AU)"
          />
        </div>
      </div>

      <div className="editor-form-group">
        <label>Period (Days) & Initial Angle (Deg)</label>
        <div style={{ display: 'flex', flexDirection: 'row', gap: '8px', width: '100%' }}>
          <input 
            type="number" 
            step="any"
            className="editor-input"
            style={{ flex: '1 1 0%', minWidth: 0 }}
            value={obj.orbitalPeriodDays ?? ''}
            onChange={e => handleUpdateObject(id, { orbitalPeriodDays: parseFloat(e.target.value) || 0 })}
            title="Orbital Period (Days)"
          />
          <div style={{ display: 'flex', gap: '4px', flex: '1 1 0%', minWidth: 0 }}>
            <input 
              type="number" 
              step="any"
              className="editor-input"
              style={{ flex: 1, minWidth: 0 }}
              value={obj.initialAngle ?? 0}
              onChange={e => handleUpdateObject(id, { initialAngle: parseFloat(e.target.value) || 0 })}
              title="Initial Angle (Deg)"
            />
            <button
              type="button"
              onClick={() => handleUpdateObject(id, { initialAngle: Math.floor(Math.random() * 360) })}
              className="px-2 text-xs bg-transparent border border-[var(--color-border-parchment)] text-[var(--color-text-muted)] hover:bg-[var(--color-accent-gold)] hover:text-[#2b2316] transition-colors"
              title="Randomize Angle"
            >
              🎲
            </button>
          </div>
        </div>
      </div>

      <div className="editor-form-group">
        <label>Orbit Motion</label>
        <div className="flex gap-1">
          {(['prograde', 'stationary', 'retrograde'] as const).map((motion) => {
            const isActive =
              motion === 'stationary' ? !!obj.isStationary
              : !obj.isStationary && (obj.orbitDirection ?? 'prograde') === motion;
            return (
              <button
                key={motion}
                type="button"
                onClick={() => handleUpdateObject(id, {
                  isStationary: motion === 'stationary',
                  orbitDirection: motion !== 'stationary' ? motion : obj.orbitDirection,
                })}
                className={`flex-1 text-[9px] py-1 font-bold transition-colors ${
                  isActive
                    ? 'bg-[var(--color-accent-gold)] text-[#2b2316] border border-[var(--color-accent-gold)]'
                    : 'bg-transparent text-[var(--color-text-muted)] border border-[var(--color-border-parchment)] hover:bg-[var(--color-bg-base)]'
                }`}
              >
                {motion === 'prograde' ? '▶ PROGRADE' : motion === 'stationary' ? '◆ FIXED' : '◄ RETROGRADE'}
              </button>
            );
          })}
        </div>
      </div>

      <div className="editor-form-group" style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px dashed var(--color-border-parchment)' }}>
        <label className="text-[10px] text-[var(--color-accent-gold)]">Advanced Orbit</label>
        <div className="flex flex-col gap-2 mt-2">
          <div>
            <label style={{ fontSize: '9px', opacity: 0.8 }}>Eccentricity (0.0 to 0.99)</label>
            <div className="flex gap-2 items-center">
              <input 
                type="range"
                min="0"
                max="0.99"
                step="0.01"
                className="flex-1"
                value={obj.orbitEccentricity || 0}
                onChange={e => handleUpdateObject(id, { orbitEccentricity: parseFloat(e.target.value) || 0 })}
              />
              <span className="text-[9px] w-6">{obj.orbitEccentricity?.toFixed(2) || '0.00'}</span>
            </div>
          </div>
          <div>
            <label style={{ fontSize: '9px', opacity: 0.8 }}>Rotation (Degrees)</label>
            <input 
              type="number"
              step="any"
              className="editor-input"
              value={obj.orbitRotation || 0}
              onChange={e => handleUpdateObject(id, { orbitRotation: parseFloat(e.target.value) || 0 })}
            />
          </div>
          {(obj.orbitEccentricity || 0) > 0 && (
            <div className="flex justify-between text-[9px] text-[var(--color-text-muted)] mt-1 border-t border-[var(--color-border-parchment)] pt-1">
              <span>Periapsis: {((obj.distanceOrbited || 0) * (1 - (obj.orbitEccentricity || 0))).toFixed(2)} AU</span>
              <span>Apoapsis: {((obj.distanceOrbited || 0) * (1 + (obj.orbitEccentricity || 0))).toFixed(2)} AU</span>
            </div>
          )}
        </div>
      </div>

      {/* SECTION 3: Lore & Details */}
      <div className="save-manager-section-header mt-5 mb-2 border-b border-[var(--color-border-parchment)] pb-1">
        <h5 className="font-title text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">
          Lore & Details
        </h5>
      </div>

      <div className="editor-form-group">
        <label>Description</label>
        <textarea 
          className="editor-textarea"
          value={obj.description || ''}
          onChange={e => handleUpdateObject(id, { description: e.target.value })}
        />
      </div>
    </>
  );
};
