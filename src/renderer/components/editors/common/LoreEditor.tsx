import React from 'react';
import { CollapsibleSection } from './CollapsibleSection';

interface LoreEditorProps {
  value: string;
  onChange: (val: string) => void;
  sectionHeader?: string;
  label?: string;
}

export const LoreEditor: React.FC<LoreEditorProps> = ({
  value,
  onChange,
  sectionHeader = "Lore & Details",
  label = "Description",
}) => {
  return (
    <CollapsibleSection title={sectionHeader}>
      <div className="editor-form-group">
        <label>{label}</label>
        <textarea 
          className="editor-textarea"
          value={value || ''}
          onChange={e => onChange(e.target.value)}
        />
      </div>
    </CollapsibleSection>
  );
};
