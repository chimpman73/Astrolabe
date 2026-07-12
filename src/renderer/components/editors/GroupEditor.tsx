import React from 'react';
import { CelestialObject } from '../../../types/astrolabe';
import { ObjectIcon } from '../ObjectIcon';

interface GroupEditorProps {
  obj: any;
  allObjects: CelestialObject[];
  handleUpdateObject: (id: string, updated: Partial<CelestialObject>) => void;
}

export const GroupEditor: React.FC<GroupEditorProps> = ({ obj, allObjects, handleUpdateObject }) => {
  const id = obj.id;
  const children = allObjects.filter(o => o.groupId === obj.id);

  return (
    <>
      <div className="editor-form-group">
        <label>Description</label>
        <textarea 
          className="editor-textarea"
          value={obj.description || ''}
          onChange={e => handleUpdateObject(id, { description: e.target.value })}
        />
      </div>
      
      <div className="editor-form-group mt-2">
         <label className="text-[var(--color-text-main)] mb-2 font-bold block">Group Contents</label>
         {children.length === 0 ? (
            <div className="p-4 border border-dashed border-[var(--color-border-parchment)] rounded text-center text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider">
              Empty Group
            </div>
         ) : (
            <div className="flex flex-col gap-1.5 p-2.5 bg-[#f5efdf] dark:bg-[#12151c] rounded border border-[var(--color-border-parchment)]">
              {children.map(c => (
                <div key={c.name} className="flex items-center gap-2 text-xs text-[var(--color-text-main)]">
                  <ObjectIcon type={c.type} /> {c.name}
                </div>
              ))}
            </div>
         )}
      </div>
    </>
  );
};
