import React from 'react';
import { CelestialObject } from '../../../../types/astrolabe';
import { CollapsibleSection } from './CollapsibleSection';

interface OrbitEditorProps {
  obj: CelestialObject;
  allObjects: CelestialObject[];
  handleUpdateObject: (id: string, updated: Partial<CelestialObject>) => void;
}

export const OrbitEditor: React.FC<OrbitEditorProps> = ({
  obj,
  allObjects,
  handleUpdateObject,
}) => {
  const id = obj.id;

  return (
    <CollapsibleSection title="Orbital Mechanics">

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
            value={obj.distanceOrbited || 0}
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
            <label style={{ fontSize: '9px', opacity: 0.8 }}>Orbital Rotation (Degrees)</label>
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
    </CollapsibleSection>
  );
};
