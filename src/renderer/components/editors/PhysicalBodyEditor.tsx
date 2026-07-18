import React from 'react';
import { CelestialObject, CelestialObjectType, WorldShape, ElementAffinity, SizeClass, IPhysicalBody } from '../../../types/astrolabe';
import { ScaleManager } from '../../utils/ScaleManager';
import { shapeManager } from '../../utils/ShapeManager';
import { getElementColor } from '../../utils/canvasRenderer';

import fireSvgUrl from '../../../../assets/elements/fire.svg';
import waterSvgUrl from '../../../../assets/elements/water.svg';
import earthSvgUrl from '../../../../assets/elements/earth.svg';
import airSvgUrl from '../../../../assets/elements/air.svg';
import mixedSvgUrl from '../../../../assets/elements/mixed.svg';
import noneSvgUrl from '../../../../assets/elements/none.svg';

const elementSvgUrls: Record<string, string> = {
  fire: fireSvgUrl,
  water: waterSvgUrl,
  earth: earthSvgUrl,
  air: airSvgUrl,
  mixed: mixedSvgUrl,
  none: noneSvgUrl,
};

interface PhysicalBodyEditorProps {
  obj: IPhysicalBody;
  allObjects: CelestialObject[];
  handleUpdateObject: (id: string, updated: Partial<CelestialObject>) => void;
}

export const PhysicalBodyEditor: React.FC<PhysicalBodyEditorProps> = ({ obj, allObjects, handleUpdateObject }) => {
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
            onChange={e => {
              const newType = e.target.value as CelestialObjectType;
              const updates: Partial<CelestialObject> = { type: newType };
              if (newType === 'station') {
                if (!['ring', 'cylinder', 'ship', 'castle', 'skull'].includes(obj.worldShape || '')) {
                  updates.worldShape = 'ring';
                }
              } else if (newType === 'star') {
                updates.initialAngle = 0;
                updates.orbitalPeriodDays = 1;
                if (['ring', 'cylinder', 'ship', 'castle', 'skull'].includes(obj.worldShape || '')) {
                  updates.worldShape = 'sphere';
                }
              } else if (newType === 'living_world') {
                updates.branchLevels = obj.branchLevels ?? 2;
                updates.branchDensity = obj.branchDensity ?? 3;
                updates.hasLeaves = obj.hasLeaves ?? true;
                updates.branchBend = obj.branchBend ?? 0.5;
              } else {
                if (['ring', 'cylinder', 'ship', 'castle', 'skull'].includes(obj.worldShape || '')) {
                  updates.worldShape = 'sphere';
                }
              }
              handleUpdateObject(id, updates);
            }}
          >
            <option value="star">⭐ Star</option>
            <option value="planet">🌍 Planet</option>
            <option value="moon">🌕 Moon</option>
            <option value="asteroid">☄️ Asteroid</option>
            <option value="station">🏙️ Station</option>
            <option value="living_world">🌳 Living World</option>
          </select>
        </div>

        <div className="editor-form-group flex-1">
          <label>
            Element Affinity
            {obj.elementAffinity && (
              <span
                style={{
                  display: 'inline-block',
                  marginLeft: '6px',
                  width: '14px',
                  height: '14px',
                  backgroundColor: getElementColor(obj.elementAffinity) || '#fff',
                  WebkitMaskImage: `url("${elementSvgUrls[obj.elementAffinity] || ''}")`,
                  WebkitMaskSize: 'contain',
                  WebkitMaskRepeat: 'no-repeat',
                  WebkitMaskPosition: 'center',
                  verticalAlign: 'middle',
                }}
                title={`${obj.elementAffinity} icon`}
              />
            )}
          </label>
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
        <label>Size Class & Size ({obj.sizeUnit || 'miles'})</label>
        <div style={{ display: 'flex', flexDirection: 'row', gap: '8px', width: '100%' }}>
          <select
            className="editor-select"
            style={{ flex: '1 1 0%', minWidth: 0 }}
            value={obj.sizeClass || 'D'}
            onChange={e => {
              const newClass = e.target.value as SizeClass;
              const newUnit = newClass === 'J' ? 'AU' : 'miles';
              handleUpdateObject(id, { sizeClass: newClass, sizeUnit: newUnit });
            }}
          >
            <option value="A">A (&lt; 10 mi)</option>
            <option value="B">B (10-100 mi)</option>
            <option value="C">C (100-1k mi)</option>
            <option value="D">D (1k-4k mi)</option>
            <option value="E">E (4k-10k mi)</option>
            <option value="F">F (10k-40k mi)</option>
            <option value="G">G (40k-100k mi)</option>
            <option value="H">H (100k-1M mi)</option>
            <option value="I">I (1M-10M mi)</option>
            <option value="J">J (&ge; AU)</option>
          </select>
          <input 
            type="number" 
            step="any"
            className={`editor-input ${!ScaleManager.isValidSize(obj.sizeClass || 'D', obj.physicalSize || 1000, obj.sizeUnit || 'miles') ? 'border-[var(--color-accent-red)] text-[var(--color-accent-red)]' : ''}`}
            style={{ flex: '1 1 0%', minWidth: 0 }}
            value={obj.physicalSize ?? 1000}
            onChange={e => handleUpdateObject(id, { physicalSize: parseFloat(e.target.value) || 0 })}
            title={!ScaleManager.isValidSize(obj.sizeClass || 'D', obj.physicalSize || 1000, obj.sizeUnit || 'miles') ? 'Physical size is out of bounds for the selected Size Class.' : ''}
          />
        </div>
      </div>
      
      {!ScaleManager.isValidSize(obj.sizeClass || 'D', obj.physicalSize || 1000, obj.sizeUnit || 'miles') && (
        <div className="text-[var(--color-accent-red)] text-[10px] -mt-1 mb-2 px-1 font-bold">
          Warning: Size is out of bounds for Class {obj.sizeClass || 'D'}
        </div>
      )}

      {obj.type !== 'living_world' && (
        <div className="flex gap-2">
          <div className="editor-form-group flex-1">
            <label>World Shape</label>
            {obj.type === 'station' ? (
              <select
                className="editor-select"
                value={obj.worldShape ?? 'ring'}
                onChange={e => handleUpdateObject(id, { worldShape: e.target.value as WorldShape })}
              >
                <option value="ring">◎ Ring</option>
                <option value="cylinder">▱ Cylinder</option>
                <option value="ship">⬖ Ship</option>
                <option value="castle">🏰 Castle</option>
                <option value="skull">💀 Skull</option>
              </select>
            ) : (
              <select
                className="editor-select"
                value={obj.worldShape ?? 'sphere'}
                onChange={e => handleUpdateObject(id, { worldShape: e.target.value as WorldShape })}
              >
                <option value="sphere">● Sphere (Default)</option>
                <option value="disc">⬡ Disc World</option>
                <option value="pyramid">△ Pyramid World</option>
                <option value="cluster">⊛ Cluster World</option>
                <option value="irregular">✦ Irregular</option>
                <option value="elliptical">⬭ Elliptical</option>
                <option value="rectangular">▭ Rectangular</option>
                <option value="hollow_world">◎ Hollow World</option>
                <option value="custom">⚙️ Custom SVG</option>
              </select>
            )}
          </div>

          {obj.worldShape === 'custom' && (
            <>
              <div className="editor-form-group flex-1">
                <label>Custom Shape</label>
                <select
                  className="editor-select"
                  value={obj.customShapeName ?? ''}
                  onChange={e => handleUpdateObject(id, { customShapeName: e.target.value })}
                >
                  <option value="">-- Select --</option>
                  {shapeManager.getAvailableShapes().map(shape => (
                    <option key={shape} value={shape}>{shape}</option>
                  ))}
                </select>
              </div>
              <div className="editor-form-group flex-1">
                <label>Shape Rotation (Deg)</label>
                <input
                  type="number"
                  step="any"
                  className="editor-input"
                  value={obj.shapeRotation ?? 0}
                  onChange={e => handleUpdateObject(id, { shapeRotation: parseFloat(e.target.value) || 0 })}
                  title="Shape Rotation (Degrees)"
                />
              </div>
            </>
          )}
        </div>
      )}

      {obj.type === 'star' && (
        <div className="editor-form-group border-l-2 border-[var(--color-accent-gold)] pl-2 ml-1">
          <label>Corona Size (x) & Alpha</label>
          <div style={{ display: 'flex', flexDirection: 'row', gap: '8px', width: '100%' }}>
            <input
              type="number"
              step="0.1"
              min="1.0"
              className="editor-input"
              style={{ flex: '1 1 0%', minWidth: 0 }}
              value={obj.coronaSize ?? 1.5}
              onChange={e => handleUpdateObject(id, { coronaSize: parseFloat(e.target.value) || 1.5 })}
            />
            <input
              type="number"
              step="0.05"
              min="0.0"
              max="1.0"
              className="editor-input"
              style={{ flex: '1 1 0%', minWidth: 0 }}
              value={obj.coronaAlpha ?? 0.3}
              onChange={e => handleUpdateObject(id, { coronaAlpha: parseFloat(e.target.value) || 0.3 })}
            />
          </div>
        </div>
      )}

      {obj.type === 'living_world' && (
        <div className="flex flex-col gap-2 border-l-2 border-[var(--color-accent-gold)] pl-2 ml-1">
          <div className="flex gap-2">
            <div className="editor-form-group flex-1">
              <label>Branch Levels</label>
              <input
                type="number"
                step="1"
                min="1"
                max="6"
                className="editor-input"
                value={obj.branchLevels ?? 2}
                onChange={e => handleUpdateObject(id, { branchLevels: parseInt(e.target.value, 10) || 2 })}
              />
            </div>
            <div className="editor-form-group flex-1">
              <label>Branch Density</label>
              <input
                type="number"
                step="1"
                min="1"
                max="10"
                className="editor-input"
                value={obj.branchDensity ?? 3}
                onChange={e => handleUpdateObject(id, { branchDensity: parseInt(e.target.value, 10) || 3 })}
              />
            </div>
          </div>
          <div className="flex gap-2 items-end">
            <div className="editor-form-group flex-1">
              <label>Branch Bend</label>
              <input
                type="number"
                step="0.1"
                min="0.0"
                max="2.0"
                className="editor-input"
                value={obj.branchBend ?? 0.5}
                onChange={e => handleUpdateObject(id, { branchBend: parseFloat(e.target.value) || 0.0 })}
              />
            </div>
            <div className="editor-form-group flex-1 pb-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={obj.hasLeaves ?? true}
                  onChange={e => handleUpdateObject(id, { hasLeaves: e.target.checked })}
                />
                <span className="text-xs">Has Leaves</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: Orbital Mechanics */}
      <div className="save-manager-section-header mt-5 mb-2 border-b border-[var(--color-border-parchment)] pb-1">
        <h5 className="font-title text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">
          Orbital Mechanics
        </h5>
      </div>

      <div className="flex gap-2">
        <div className="editor-form-group flex-1">
          <label>Orbiting Parent</label>
          <select 
            className="editor-select"
            value={obj.orbitedObjectName || ''}
            onChange={e => handleUpdateObject(id, { orbitedObjectName: e.target.value === '' ? null : e.target.value })}
          >
            <option value="">System Center</option>
            {allObjects
              .filter(o => o.name !== obj.name && o.type !== 'moon')
              .map(o => (
                <option key={o.name} value={o.name}>{o.name}</option>
              ))}
          </select>
        </div>

        <div className="editor-form-group flex-1">
          <label>Distance (AU)</label>
          <input 
            type="number" 
            step="any"
            className="editor-input"
            value={(obj.distanceOrbited || 0)}
            onChange={e => handleUpdateObject(id, { distanceOrbited: parseFloat(e.target.value) || 0 })}
          />
        </div>
      </div>

      <div className="flex gap-2">
        <div className="editor-form-group flex-1">
          <label>Period (Days)</label>
          <input 
            type="number" 
            step="any"
            className="editor-input"
            value={obj.orbitalPeriodDays ?? ''}
            onChange={e => handleUpdateObject(id, { orbitalPeriodDays: parseFloat(e.target.value) || 0 })}
          />
        </div>

        <div className="editor-form-group flex-1">
          <label>Initial Angle</label>
          <div className="flex gap-1">
            <input 
              type="number" 
              step="any"
              className="editor-input"
              style={{ flex: 1 }}
              value={obj.initialAngle ?? 0}
              onChange={e => handleUpdateObject(id, { initialAngle: parseFloat(e.target.value) || 0 })}
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
