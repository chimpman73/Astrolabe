import React from 'react';
import { CelestialObject, CelestialObjectType, SizeClass } from '../../../types/astrolabe';
import { shapeManager } from '../../utils/ShapeManager';

interface ConstellationEditorProps {
  obj: any;
  handleUpdateObject: (id: string, updated: Partial<CelestialObject>) => void;
}

export const ConstellationEditor: React.FC<ConstellationEditorProps> = ({ obj, handleUpdateObject }) => {
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
          <option value="constellation">✨ Constellation</option>
        </select>
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
        />
      </div>

      <div className="editor-form-group">
        <label>Custom Shape</label>
        <select
          className="editor-select"
          value={obj.customShapeName ?? ''}
          onChange={e => handleUpdateObject(id, { customShapeName: e.target.value })}
        >
          <option value="">-- Select Shape --</option>
          {shapeManager.getAvailableShapes().map(shape => (
            <option key={shape} value={shape}>{shape}</option>
          ))}
        </select>
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
        />
      </div>
      
      <div className="editor-form-group">
        <label>Line Drawing Style</label>
        <select
          className="editor-select"
          value={obj.constellationStyle || 'internal'}
          onChange={e => handleUpdateObject(id, { constellationStyle: e.target.value as 'outline' | 'internal' })}
        >
          <option value="internal">Internal Geometric Graph</option>
          <option value="outline">Shape Outline</option>
        </select>
      </div>
      
      <div className="editor-form-group">
        <label>Wireframe Detail Level</label>
        <input
          type="number"
          step="1"
          min="1"
          max="20"
          className="editor-input"
          value={obj.constellationDetail ?? 1}
          onChange={e => handleUpdateObject(id, { constellationDetail: parseInt(e.target.value, 10) || 1 })}
          title="Complexity Level (1 to 20)."
        />
      </div>
      
      <div className="editor-form-group">
        <label>Star Count</label>
        <input
          type="number"
          step="1"
          min="0"
          className="editor-input"
          value={obj.constellationStarCount ?? 5}
          onChange={e => handleUpdateObject(id, { constellationStarCount: parseInt(e.target.value, 10) || 0 })}
        />
      </div>
      
      <div className="editor-form-group">
        <label>Min Internal Star Size Class</label>
        <select
          className="editor-select"
          value={obj.constellationStarMinSizeClass || 'A'}
          onChange={e => handleUpdateObject(id, { constellationStarMinSizeClass: e.target.value as SizeClass })}
        >
          {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'].map(size => (
            <option key={size} value={size}>Size {size}</option>
          ))}
        </select>
      </div>
      
      <div className="editor-form-group">
        <label>Max Internal Star Size Class</label>
        <select
          className="editor-select"
          value={obj.constellationStarMaxSizeClass || 'C'}
          onChange={e => handleUpdateObject(id, { constellationStarMaxSizeClass: e.target.value as SizeClass })}
        >
          {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'].map(size => (
            <option key={size} value={size}>Size {size}</option>
          ))}
        </select>
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
