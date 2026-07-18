import React from 'react';
import { SizeClass, SizeUnit } from '../../../../types/astrolabe';
import { ScaleManager } from '../../../utils/ScaleManager';

interface SizeClassEditorProps {
  sizeClass: SizeClass;
  physicalSize: number;
  sizeUnit?: SizeUnit;
  label: string;
  onChange: (updated: { sizeClass: SizeClass; physicalSize: number; sizeUnit?: SizeUnit }) => void;
  showValidation?: boolean;
}

export const SizeClassEditor: React.FC<SizeClassEditorProps> = ({
  sizeClass,
  physicalSize,
  sizeUnit,
  label,
  onChange,
  showValidation = true,
}) => {
  const currentUnit = sizeUnit || 'miles';
  const isValid = !showValidation || ScaleManager.isValidSize(sizeClass, physicalSize, currentUnit);

  return (
    <>
      <div className="editor-form-group">
        <label>{label}</label>
        <div style={{ display: 'flex', flexDirection: 'row', gap: '8px', width: '100%' }}>
          <select
            className="editor-select"
            style={{ flex: '1 1 0%', minWidth: 0 }}
            value={sizeClass}
            onChange={e => {
              const newClass = e.target.value as SizeClass;
              const newUnit = newClass === 'J' ? 'AU' : 'miles';
              onChange({
                sizeClass: newClass,
                physicalSize,
                sizeUnit: sizeUnit ? newUnit : undefined,
              });
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
            {sizeUnit && <option value="J">J (&ge; AU)</option>}
          </select>
          <input 
            type="number" 
            step="any"
            className={`editor-input ${!isValid ? 'border-[var(--color-accent-red)] text-[var(--color-accent-red)]' : ''}`}
            style={{ flex: '1 1 0%', minWidth: 0 }}
            value={physicalSize}
            onChange={e => {
              onChange({
                sizeClass,
                physicalSize: parseFloat(e.target.value) || 0,
                sizeUnit,
              });
            }}
            title={!isValid ? 'Physical size is out of bounds for the selected Size Class.' : ''}
          />
        </div>
      </div>
      
      {!isValid && (
        <div className="text-[var(--color-accent-red)] text-[10px] -mt-1 mb-2 px-1 font-bold">
          Warning: Size is out of bounds for Class {sizeClass}
        </div>
      )}
    </>
  );
};
