import React from 'react';
import { CelestialObject, IGroup } from '../../../types/astrolabe';
import { ObjectIcon } from '../ObjectIcon';

import { LoreEditor } from './common/LoreEditor';
import { CollapsibleSection } from './common/CollapsibleSection';

interface GroupEditorProps {
  obj: IGroup;
  allObjects: CelestialObject[];
  handleUpdateObject: (id: string, updated: Partial<CelestialObject>) => void;
}

export const GroupEditor: React.FC<GroupEditorProps> = ({ obj, allObjects, handleUpdateObject }) => {
  const id = obj.id;
  const children = allObjects.filter(o => o.groupId === obj.id);

  return (
    <>
      <LoreEditor
        value={obj.description || ''}
        onChange={val => handleUpdateObject(id, { description: val })}
        sectionHeader="General Information"
      />
      
      <CollapsibleSection title="Group Contents">

      <div className="editor-form-group mt-2">
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
      </CollapsibleSection>
    </>
  );
};
