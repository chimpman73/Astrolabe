import React from 'react';
import { CelestialObject, CelestialObjectType, WorldShape, ElementAffinity, IPhenomenon } from '../../../types/astrolabe';
import { SizeClassEditor } from './common/SizeClassEditor';
import { CustomShapeSelector } from './common/CustomShapeSelector';
import { OrbitEditor } from './common/OrbitEditor';
import { LoreEditor } from './common/LoreEditor';
import { CollapsibleSection } from './common/CollapsibleSection';

interface PhenomenonEditorProps {
  obj: IPhenomenon;
  allObjects: CelestialObject[];
  handleUpdateObject: (id: string, updated: Partial<CelestialObject>) => void;
}

export const PhenomenonEditor: React.FC<PhenomenonEditorProps> = ({ obj, allObjects, handleUpdateObject }) => {
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

      <SizeClassEditor
        sizeClass={obj.sizeClass || 'D'}
        physicalSize={obj.physicalSize ?? 1000}
        sizeUnit={obj.sizeUnit || 'miles'}
        label={`Size Class & Size (${obj.sizeUnit || 'miles'})`}
        onChange={updated => handleUpdateObject(id, updated)}
        showValidation={true}
      />



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
            <option value="rectangular">▭ Rectangular</option>
            <option value="hollow_world">◎ Hollow World</option>
            <option value="custom">⚙️ Custom SVG</option>
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

      {obj.cloudObjectShape === 'custom' && (
        <div className="editor-form-group border-l-2 border-[var(--color-accent-gold)] pl-2 ml-1">
          <CustomShapeSelector
            customShapeName={obj.cloudObjectCustomShapeName ?? ''}
            shapeRotation={obj.cloudObjectShapeRotation ?? 0}
            label="Custom Shape & Rotation (Deg)"
            onChange={updated => handleUpdateObject(id, {
              cloudObjectCustomShapeName: updated.customShapeName,
              cloudObjectShapeRotation: updated.shapeRotation,
            })}
          />
        </div>
      )}

      <SizeClassEditor
        sizeClass={obj.cloudObjectSizeClass || 'A'}
        physicalSize={obj.cloudObjectPhysicalSize ?? 5}
        label="Internal Size Class & Size (miles)"
        onChange={updated => handleUpdateObject(id, {
          cloudObjectSizeClass: updated.sizeClass,
          cloudObjectPhysicalSize: updated.physicalSize,
        })}
        showValidation={false}
      />

      <div className="editor-form-group" style={{ marginTop: '0.5rem' }}>
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

      </CollapsibleSection>

      <OrbitEditor obj={obj} allObjects={allObjects} handleUpdateObject={handleUpdateObject} />

      <LoreEditor
        value={obj.description || ''}
        onChange={val => handleUpdateObject(id, { description: val })}
      />
    </>
  );
};
