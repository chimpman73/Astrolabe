import React from 'react';
import { shapeManager } from '../../../utils/ShapeManager';

interface CustomShapeSelectorProps {
  customShapeName: string;
  shapeRotation: number;
  label?: string;
  onChange: (updated: { customShapeName: string; shapeRotation: number }) => void;
}

export const CustomShapeSelector: React.FC<CustomShapeSelectorProps> = ({
  customShapeName,
  shapeRotation,
  label = "Custom Shape",
  onChange,
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'row', gap: '8px', width: '100%' }}>
      <div className="editor-form-group flex-1">
        <label className="flex justify-between items-center w-full">
          <span>{label}</span>
        </label>
        <select
          className="editor-select w-full"
          value={customShapeName || ''}
          onChange={e => onChange({ customShapeName: e.target.value, shapeRotation })}
        >
          <option value="">-- Select Shape --</option>
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
          className="editor-input w-full"
          value={shapeRotation}
          onChange={e => onChange({ customShapeName, shapeRotation: parseFloat(e.target.value) || 0 })}
          title="Shape Rotation (Degrees)"
          placeholder="0"
        />
      </div>
    </div>
  );
};
