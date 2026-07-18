import React from 'react';
import { CelestialObject, CelestialObjectType, SizeClass, IConstellation } from '../../../types/astrolabe';
import { shapeManager } from '../../utils/ShapeManager';

interface ConstellationEditorProps {
  obj: IConstellation;
  allObjects: CelestialObject[];
  handleUpdateObject: (id: string, updated: Partial<CelestialObject>) => void;
}

export const ConstellationEditor: React.FC<ConstellationEditorProps> = ({ obj, allObjects, handleUpdateObject }) => {
  const id = obj.id;

  return (
    <>
      {/* SECTION 1: Classification & Shape */}
      <div className="save-manager-section-header mt-4 mb-2 border-b border-[var(--color-border-parchment)] pb-1">
        <h5 className="font-title text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">
          Classification & Shape
        </h5>
      </div>

      <div className="editor-form-group">
        <label>Type, Custom Shape & Shape Rotation (Deg)</label>
        <div style={{ display: 'flex', flexDirection: 'row', gap: '8px', width: '100%' }}>
          <select 
            className="editor-select"
            style={{ flex: '1 1 0%', minWidth: 0 }}
            value={obj.type}
            onChange={e => handleUpdateObject(id, { type: e.target.value as CelestialObjectType })}
            title="Type"
          >
            <option value="constellation">✨ Constellation</option>
          </select>
          <select
            className="editor-select"
            style={{ flex: '1 1 0%', minWidth: 0 }}
            value={obj.customShapeName ?? ''}
            onChange={e => handleUpdateObject(id, { customShapeName: e.target.value })}
            title="Custom Shape"
          >
            <option value="">-- Select Shape --</option>
            {shapeManager.getAvailableShapes().map(shape => (
              <option key={shape} value={shape}>{shape}</option>
            ))}
          </select>
          <input
            type="number"
            step="any"
            className="editor-input"
            style={{ flex: '1 1 0%', minWidth: 0 }}
            value={obj.shapeRotation ?? 0}
            onChange={e => handleUpdateObject(id, { shapeRotation: parseFloat(e.target.value) || 0 })}
            title="Shape Rotation (Degrees)"
            placeholder="Rotation"
          />
        </div>
      </div>

      <div className="editor-form-group">
        <label>Background Fill Alpha (0-1)</label>
        <input
          type="number"
          step="0.05"
          min="0.0"
          max="1.0"
          className="editor-input"
          value={obj.constellationFillAlpha ?? 0.2}
          onChange={e => handleUpdateObject(id, { constellationFillAlpha: parseFloat(e.target.value) || 0.0 })}
          title="Background Fill Alpha (0-1)"
        />
      </div>

      <div className="editor-form-group">
        <label>Inverse (Flip X)</label>
        <label className="editor-checkbox">
          <input
            type="checkbox"
            checked={obj.constellationFlipX || false}
            onChange={e => handleUpdateObject(id, { constellationFlipX: e.target.checked })}
          />
          <span>Mirror image horizontally</span>
        </label>
      </div>

      {/* SECTION 2: Wireframe & Stars */}
      <div className="save-manager-section-header mt-5 mb-2 border-b border-[var(--color-border-parchment)] pb-1">
        <h5 className="font-title text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">
          Wireframe & Stars
        </h5>
      </div>

      <div className="editor-form-group">
        <label>Line Drawing Style & Wireframe Detail Level</label>
        <div style={{ display: 'flex', flexDirection: 'row', gap: '8px', width: '100%' }}>
          <select
            className="editor-select"
            style={{ flex: '1 1 0%', minWidth: 0 }}
            value={obj.constellationStyle || 'internal'}
            onChange={e => handleUpdateObject(id, { constellationStyle: e.target.value as 'outline' | 'internal' })}
            title="Line Drawing Style"
          >
            <option value="internal">Internal Geometric Graph</option>
            <option value="outline">Shape Outline</option>
          </select>
          <input
            type="number"
            step="1"
            min="1"
            max="20"
            className="editor-input"
            style={{ flex: '1 1 0%', minWidth: 0 }}
            value={obj.constellationDetail ?? 1}
            onChange={e => handleUpdateObject(id, { constellationDetail: parseInt(e.target.value, 10) || 1 })}
            title="Wireframe Detail Level (1 to 20)"
          />
        </div>
      </div>

      <div className="editor-form-group">
        <label>Min & Max Internal Star Size Class</label>
        <div style={{ display: 'flex', flexDirection: 'row', gap: '8px', width: '100%' }}>
          <select
            className="editor-select"
            style={{ flex: '1 1 0%', minWidth: 0 }}
            value={obj.constellationStarMinSizeClass || 'A'}
            onChange={e => handleUpdateObject(id, { constellationStarMinSizeClass: e.target.value as SizeClass })}
            title="Min Internal Star Size Class"
          >
            {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'].map(size => (
              <option key={size} value={size}>Min: Size {size}</option>
            ))}
          </select>
          <select
            className="editor-select"
            style={{ flex: '1 1 0%', minWidth: 0 }}
            value={obj.constellationStarMaxSizeClass || 'C'}
            onChange={e => handleUpdateObject(id, { constellationStarMaxSizeClass: e.target.value as SizeClass })}
            title="Max Internal Star Size Class"
          >
            {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'].map(size => (
              <option key={size} value={size}>Max: Size {size}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="editor-form-group">
        <label>Star Count & Elemental Affinity</label>
        <div style={{ display: 'flex', flexDirection: 'row', gap: '8px', width: '100%' }}>
          <input
            type="number"
            step="1"
            min="0"
            className="editor-input"
            style={{ flex: '1 1 0%', minWidth: 0 }}
            value={obj.constellationStarCount ?? 5}
            onChange={e => handleUpdateObject(id, { constellationStarCount: parseInt(e.target.value, 10) || 0 })}
            title="Star Count"
          />
          <select
            className="editor-select"
            style={{ flex: '1 1 0%', minWidth: 0 }}
            value={obj.elementAffinity || ''}
            onChange={e => handleUpdateObject(id, { elementAffinity: (e.target.value as any) || null })}
            title="Elemental Affinity"
          >
            <option value="">None</option>
            <option value="fire">Fire</option>
            <option value="water">Water</option>
            <option value="earth">Earth</option>
            <option value="air">Air</option>
            <option value="mixed">Mixed</option>
          </select>
        </div>
      </div>

      {/* SECTION 3: Orbital Mechanics */}
      <div className="save-manager-section-header mt-5 mb-2 border-b border-[var(--color-border-parchment)] pb-1">
        <h5 className="font-title text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">
          Orbital Mechanics
        </h5>
      </div>

      <div className="editor-form-group">
        <label>Arc Width / Scale (Degrees)</label>
        <input
          type="number"
          step="1"
          min="1"
          max="359"
          className="editor-input"
          value={obj.arcDegrees ?? 30}
          onChange={e => handleUpdateObject(id, { arcDegrees: parseFloat(e.target.value) || 30 })}
          title="Arc Width / Scale (Degrees)"
        />
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
                  orbitDirection: motion !== 'stationary' ? motion : (obj.orbitDirection as any),
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

      {/* SECTION 4: Lore & Details */}
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
