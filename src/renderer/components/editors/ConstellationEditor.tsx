import React from 'react';
import { CelestialObject, CelestialObjectType, SizeClass, IConstellation } from '../../../types/astrolabe';
import { CustomShapeSelector } from './common/CustomShapeSelector';
import { OrbitEditor } from './common/OrbitEditor';
import { LoreEditor } from './common/LoreEditor';
import { CollapsibleSection } from './common/CollapsibleSection';

interface ConstellationEditorProps {
  obj: IConstellation;
  allObjects: CelestialObject[];
  handleUpdateObject: (id: string, updated: Partial<CelestialObject>) => void;
}

export const ConstellationEditor: React.FC<ConstellationEditorProps> = ({ obj, allObjects, handleUpdateObject }) => {
  const id = obj.id;

  return (
    <>
      <CollapsibleSection title="Classification & Shape">

      <div className="editor-form-group">
        <label>Type</label>
        <select 
          className="editor-select"
          value={obj.type}
          onChange={e => handleUpdateObject(id, { type: e.target.value as CelestialObjectType })}
        >
          <option value="constellation">✨ Constellation</option>
        </select>
      </div>

      <CustomShapeSelector
        customShapeName={obj.customShapeName ?? ''}
        shapeRotation={obj.shapeRotation ?? 0}
        onChange={updated => handleUpdateObject(id, updated)}
      />

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

      <div className="editor-form-group" style={{ marginTop: '0.5rem' }}>
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

      </CollapsibleSection>

      <CollapsibleSection title="Wireframe & Stars">

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
    </CollapsibleSection>

      <OrbitEditor obj={obj} allObjects={allObjects} handleUpdateObject={handleUpdateObject} />

      <LoreEditor
        value={obj.description || ''}
        onChange={val => handleUpdateObject(id, { description: val })}
      />
    </>
  );
};
