import React from 'react';
import { CelestialObject, CelestialObjectType, WorldShape, ElementAffinity, IPhysicalBody } from '../../../types/astrolabe';
import { getElementColor } from '../../utils/canvasRenderer';
import { SizeClassEditor } from './common/SizeClassEditor';
import { CustomShapeSelector } from './common/CustomShapeSelector';
import { OrbitEditor } from './common/OrbitEditor';
import { LoreEditor } from './common/LoreEditor';

import { CollapsibleSection } from './common/CollapsibleSection';

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
      <CollapsibleSection title="Classification & Appearance">

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

      <SizeClassEditor
        sizeClass={obj.sizeClass || 'D'}
        physicalSize={obj.physicalSize ?? 1000}
        sizeUnit={obj.sizeUnit || 'miles'}
        label={`Size Class & Size (${obj.sizeUnit || 'miles'})`}
        onChange={updated => handleUpdateObject(id, updated)}
        showValidation={true}
      />

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
            <CustomShapeSelector
              customShapeName={obj.customShapeName ?? ''}
              shapeRotation={obj.shapeRotation ?? 0}
              onChange={updated => handleUpdateObject(id, updated)}
            />
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
      </CollapsibleSection>

      <OrbitEditor obj={obj} allObjects={allObjects} handleUpdateObject={handleUpdateObject} />

      <LoreEditor
        value={obj.description || ''}
        onChange={val => handleUpdateObject(id, { description: val })}
      />
    </>
  );
};
