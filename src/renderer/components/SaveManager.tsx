import React, { useState } from 'react';
import { useSystemStore } from '../store/useSystemStore';
import { getAllSystemObjects } from '../utils/orbitMath';
import { 
  Trash2, 
  Plus, 
  ChevronDown, 
  ChevronUp, 
  ChevronLeft,
  Settings,
  Eye,
  EyeOff,
  Folder,
} from 'lucide-react';
import { CelestialObject, CelestialObjectType, IPhysicalBody, IPhenomenon, IConstellation, IMapOverlay, IGroup } from '../../types/astrolabe';
import { ObjectIcon } from './ObjectIcon';
import { PhysicalBodyEditor } from './editors/PhysicalBodyEditor';
import { PhenomenonEditor } from './editors/PhenomenonEditor';
import { ConstellationEditor } from './editors/ConstellationEditor';
import { MapOverlayEditor } from './editors/MapOverlayEditor';
import { GroupEditor } from './editors/GroupEditor';
import { SystemConfigEditor } from './editors/SystemConfigEditor';

interface SaveManagerProps {
  onCollapse?: () => void;
}

export const SaveManager: React.FC<SaveManagerProps> = ({ onCollapse }) => {
  const {
    activeSphere,
    updateActiveSphereMeta,
    updateCelestialObject,
    addCelestialObject,
    removeCelestialObject,
    reorderCelestialObject,
    setToastMessage,
    selectedObjectId,
    setSelectedObjectId,
  } = useSystemStore();

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [showAddMenu, setShowAddMenu] = useState<boolean>(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [isSystemConfigExpanded, setIsSystemConfigExpanded] = useState<boolean>(true);

  // If no active sphere is loaded
  const allObjects = activeSphere ? getAllSystemObjects(activeSphere) : [];

  if (!activeSphere) {
    return (
      <div className="save-manager-container">
        <div className="save-manager-header">
          <div className="save-manager-header-title">
            {onCollapse && (
              <button
                onClick={onCollapse}
                className="save-manager-collapse-btn"
                title="Collapse Editor Panel"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
            )}
            <h4 className="font-title text-xs font-bold tracking-wider text-[var(--color-text-main)]">
              System Editor
            </h4>
          </div>
        </div>
        <div className="save-manager-empty-content">
          <Settings className="w-12 h-12 text-[var(--color-border-parchment)] stroke-[1] mb-2 animate-spin-slow" />
          <p className="text-[11px] text-[var(--color-text-muted)] max-w-[200px]">
            Please open an existing crystal system configuration file to enable form editing.
          </p>
        </div>
      </div>
    );
  }

  const handleUpdateObject = (id: string, updated: Partial<CelestialObject>) => {
    if (updated.type === 'star') {
      updated.initialAngle = 0;
      updated.orbitalPeriodDays = 1;
    }
    // If changing type to a cloud object, ensure a default arc width exists
    if (updated.type === 'cloud') {
      const current = allObjects.find(o => o.id === id)!;
      updated.arcDegrees = updated.arcDegrees ?? current.arcDegrees ?? 30;
      updated.cloudTransparency = updated.cloudTransparency ?? current.cloudTransparency ?? 0.45;
      updated.cloudiness = updated.cloudiness ?? current.cloudiness ?? 0.5;
      updated.cloudObjectShape = updated.cloudObjectShape ?? current.cloudObjectShape ?? 'sphere';
      updated.cloudObjectCustomShapeName = updated.cloudObjectCustomShapeName ?? current.cloudObjectCustomShapeName ?? '';
      updated.cloudObjectShapeRotation = updated.cloudObjectShapeRotation ?? current.cloudObjectShapeRotation ?? 0;
    }
    if (updated.type === 'living_world') {
      const current = allObjects.find(o => o.id === id)!;
      updated.branchLevels = updated.branchLevels ?? current.branchLevels ?? 2;
      updated.branchDensity = updated.branchDensity ?? current.branchDensity ?? 3;
      updated.hasLeaves = updated.hasLeaves ?? current.hasLeaves ?? true;
      updated.branchBend = updated.branchBend ?? current.branchBend ?? 0.5;
    }
    if (updated.type === 'constellation') {
      const current = allObjects.find(o => o.id === id)!;
      updated.constellationDetail = updated.constellationDetail ?? current.constellationDetail ?? 1;
      updated.constellationStarCount = updated.constellationStarCount ?? current.constellationStarCount ?? 5;
      updated.constellationFlipX = updated.constellationFlipX ?? current.constellationFlipX ?? false;
      updated.orbitedObjectName = updated.orbitedObjectName !== undefined ? updated.orbitedObjectName : (current.orbitedObjectName ?? null);
      updated.distanceOrbited = updated.distanceOrbited ?? current.distanceOrbited ?? 1.0;
      updated.initialAngle = updated.initialAngle ?? current.initialAngle ?? 0;
      updated.orbitalPeriodDays = updated.orbitalPeriodDays ?? current.orbitalPeriodDays ?? 365;
      updated.affectsShellBoundary = false;
    }
    updateCelestialObject(id, updated);
  };

  const handleAddObject = (type: CelestialObjectType) => {
    let newObj: any = { 
      id: Date.now().toString(),
      name: `New ${type.charAt(0).toUpperCase() + type.slice(1)} ${allObjects.length + 1}`,
      type: type,
    };
    
    if (['star', 'planet', 'moon', 'asteroid', 'station', 'living_world', 'custom'].includes(type)) {
      newObj = { ...newObj, sizeClass: 'D', physicalSize: 1000, sizeUnit: 'miles', orbitedObjectName: null, distanceOrbited: 1.0, initialAngle: 0, orbitalPeriodDays: 365, affectsShellBoundary: true };
    } else if (type === 'cloud') {
      newObj = { ...newObj, arcDegrees: 30, cloudTransparency: 0.45, cloudiness: 0.5, cloudObjectShape: 'sphere', cloudObjectSizeClass: 'A', cloudObjectPhysicalSize: 5, orbitedObjectName: null, distanceOrbited: 1.0, initialAngle: 0, cloudObjectCustomShapeName: '', cloudObjectShapeRotation: 0 };
    } else if (type === 'constellation') {
      newObj = { ...newObj, arcDegrees: 30, customShapeName: 'Aries', constellationFillAlpha: 0.2, constellationStyle: 'internal', constellationDetail: 1, constellationStarCount: 5, constellationStarMinSizeClass: 'A', constellationStarMaxSizeClass: 'C', orbitedObjectName: null, distanceOrbited: 1.0, initialAngle: 0, orbitalPeriodDays: 365, affectsShellBoundary: false };
    } else if (type === 'note' || type === 'legend') {
      newObj = { ...newObj, noteDistanceAU: 0, noteAngle: 0, noteFontSize: 16 };
      if (type === 'note') newObj.noteMaxWidth = 120;
    }
    
    addCelestialObject(newObj);
    setSelectedObjectId(newObj.id || null);
    setToastMessage({ type: 'success', text: `Added new ${type} "${newObj.name}"` });
  };

  const handleAddGroup = () => {
    const newObj: any = { id: Date.now().toString(),
      name: `New Group ${allObjects.filter(o => o.type === 'group').length + 1}`,
      type: 'group',
      description: 'A structural group for celestial bodies.',
      orbitedObjectName: null,
      distanceOrbited: 0,
      initialAngle: 0,
      orbitalPeriodDays: 0,
      affectsShellBoundary: false,
    };
    addCelestialObject(newObj);
    setSelectedObjectId(newObj.id || null);
    setToastMessage({ type: 'success', text: `Added new group "${newObj.name}"` });
  };

  const handleDeleteObject = (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;

    // Correct broken references for sub-orbiting moons
    allObjects.forEach((obj) => {
      if (obj.orbitedObjectName === name) {
        updateCelestialObject(obj.id, { orbitedObjectName: null });
      }
    });

    removeCelestialObject(id);
    setSelectedObjectId(null);
    setToastMessage({ type: 'success', text: `Deleted "${name}"` });
  };

  // Helper to render type icons
  const renderTypeIcon = (type: string) => {
    return <ObjectIcon type={type} />;
  };

  return (
    <div className="save-manager-container">
      
      {/* Sidebar Header */}
      <div className="save-manager-header">
        <div className="save-manager-header-title">
          {onCollapse && (
            <button
              onClick={onCollapse}
              className="save-manager-collapse-btn"
              title="Collapse Editor Panel"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          )}
          <h4 className="font-title text-xs font-bold tracking-wider text-[var(--color-text-main)]">
            System Editor
          </h4>
        </div>
        
        <span className="save-manager-sync-badge">
          LIVE SYNCED
        </span>
      </div>

      {/* Editor Content Area */}
      <div className="save-manager-content">
        
        {/* Section: System Metadata (Decoupled) */}
        <SystemConfigEditor
          activeSphere={activeSphere}
          isSystemConfigExpanded={isSystemConfigExpanded}
          setIsSystemConfigExpanded={setIsSystemConfigExpanded}
          updateActiveSphereMeta={updateActiveSphereMeta}
        />

        {/* Section: Celestial Bodies Header */}
        <div className="save-manager-section-header">
          <h5 className="font-title text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">
            Celestial Bodies
          </h5>
        </div>

        {/* Action Button: Add Body & Group */}
        <div className="relative mb-4">
          <button 
            onClick={() => setShowAddMenu(!showAddMenu)} 
            className="add-body-btn w-full flex items-center justify-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> Add Object <ChevronDown className="w-3.5 h-3.5 ml-1 opacity-70" />
          </button>
          
          {showAddMenu && (
            <div className="absolute top-full left-0 w-full mt-1 bg-[#1a1b23] dark:bg-[#12151c] border border-[var(--color-border-parchment)] rounded shadow-xl z-50 overflow-hidden flex flex-col py-1">
              <button className="text-left px-3 py-2 text-xs text-[var(--color-text-main)] hover:bg-[var(--color-accent-gold)] hover:text-[#2b2316] transition-colors flex items-center gap-2" onClick={() => { handleAddObject('planet'); setShowAddMenu(false); }}>
                <ObjectIcon type="planet" /> Physical Body
              </button>
              <button className="text-left px-3 py-2 text-xs text-[var(--color-text-main)] hover:bg-[var(--color-accent-gold)] hover:text-[#2b2316] transition-colors flex items-center gap-2" onClick={() => { handleAddObject('cloud'); setShowAddMenu(false); }}>
                <ObjectIcon type="cloud" /> Phenomenon
              </button>
              <button className="text-left px-3 py-2 text-xs text-[var(--color-text-main)] hover:bg-[var(--color-accent-gold)] hover:text-[#2b2316] transition-colors flex items-center gap-2" onClick={() => { handleAddObject('constellation'); setShowAddMenu(false); }}>
                <ObjectIcon type="constellation" /> Constellation
              </button>
              <button className="text-left px-3 py-2 text-xs text-[var(--color-text-main)] hover:bg-[var(--color-accent-gold)] hover:text-[#2b2316] transition-colors flex items-center gap-2" onClick={() => { handleAddObject('note'); setShowAddMenu(false); }}>
                <ObjectIcon type="note" /> Map Overlay
              </button>
              <div className="border-t border-[var(--color-border-parchment)] my-1" />
              <button className="text-left px-3 py-2 text-xs text-[var(--color-text-main)] hover:bg-[var(--color-bg-light)] transition-colors flex items-center gap-2" onClick={() => { handleAddGroup(); setShowAddMenu(false); }}>
                <Folder className="w-3 h-3" /> Group
              </button>
            </div>
          )}
        </div>

        {/* Dynamic Accordion list of bodies */}
        <div className="save-manager-list pb-8">
          {(() => {
            const renderOrder: {obj: CelestialObject, isChild: boolean, parentExpanded: boolean}[] = [];
            allObjects.forEach((obj) => {
              if (!obj.groupId) {
                renderOrder.push({obj, isChild: false, parentExpanded: true});
                if (obj.type === 'group') {
                  const isGroupExpanded = expandedGroups[obj.id] === true;
                  allObjects.forEach((child) => {
                    if (child.groupId === obj.id) {
                      renderOrder.push({obj: child, isChild: true, parentExpanded: isGroupExpanded});
                    }
                  });
                }
              }
            });

            return renderOrder.map(({ obj, isChild, parentExpanded }, index) => {
              const id = obj.id;
              if (isChild && !parentExpanded) return null;
              const isExpanded = obj.type === 'group' ? (expandedGroups[obj.id] === true) : (selectedObjectId === id);
              
              const draggedIndex = draggedId ? renderOrder.findIndex(item => item.obj.id === draggedId) : -1;
              
              return (
                <div 
                  key={'celestial-obj-' + id} 
                  className={`editor-card ${isChild ? 'ml-4 border-l-2 border-l-[var(--color-accent-gold)]' : ''} ${draggedId === id ? 'opacity-50' : ''} ${
                    dragOverId === id 
                      ? (draggedIndex !== -1 && draggedIndex < index 
                          ? 'border-b-2 border-b-[var(--color-accent-gold)]' 
                          : 'border-t-2 border-t-[var(--color-accent-gold)]') 
                      : ''
                  }`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    if (dragOverId !== id) {
                      setDragOverId(id);
                    }
                  }}
                  onDragLeave={() => {
                    if (dragOverId === id) {
                      setDragOverId(null);
                    }
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (draggedId !== null && draggedId !== id) {
                      const draggedObj = allObjects.find(o => o.id === draggedId); if(!draggedObj) return;
                      
                      // If dropping a group onto another object, groups cannot be nested, so they stay at root
                      if (draggedObj.type === 'group') {
                        updateCelestialObject(draggedId!, { groupId: undefined });
                      } 
                      // If dropping onto a group header, move into that group
                      else if (obj.type === 'group') {
                        updateCelestialObject(draggedId!, { groupId: id });
                      } 
                      // If dropping onto a child or root object, inherit its group
                      else {
                        updateCelestialObject(draggedId!, { groupId: obj.groupId || undefined });
                        reorderCelestialObject(draggedId!, id);
                      }
                      
                      // 
                    }
                    setDraggedId(null);
                    setDragOverId(null);
                  }}
                >
                
                {/* Accordion Card Header */}
                <div 
                  onClick={() => {
                    if (obj.type === 'group') {
                      setExpandedGroups(prev => ({ ...prev, [obj.id]: prev[obj.id] === true ? false : true }));
                    } else {
                      setSelectedObjectId(isExpanded ? null : id);
                    }
                  }}
                  className="editor-card-header"
                  draggable
                  onDragStart={(e) => {
                    if (obj.type !== 'group') setSelectedObjectId(null);
                    setDraggedId(id);
                    e.dataTransfer.effectAllowed = 'move';
                  }}
                  onDragEnd={() => {
                    setDraggedId(null);
                    setDragOverId(null);
                  }}
                >
                  <div className={`editor-card-title ${obj.isHidden ? 'opacity-40' : ''}`}>
                    {renderTypeIcon(obj.type)}
                    <span className="editor-card-name">{obj.name}</span>
                    <span className="editor-card-type-label">
                      ({obj.type})
                    </span>
                  </div>
                  
                  <div className="editor-card-actions" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => handleUpdateObject(id, { isHidden: !obj.isHidden })}
                      className="editor-card-delete-btn"
                      title={obj.isHidden ? `Show ${obj.name}` : `Hide ${obj.name}`}
                    >
                      {obj.isHidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => handleDeleteObject(id, obj.name)}
                      className="editor-card-delete-btn"
                      title={`Delete ${obj.name}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <div className="editor-card-chevron">
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </div>
                  </div>
                </div>

                {/* Accordion Card Edit Inputs */}
                {isExpanded && (
                  <div className="editor-card-body">
                    
                    <div className="flex items-center gap-4 mb-3">
                      {obj.type !== 'group' && obj.type !== 'note' && obj.type !== 'legend' && obj.type !== 'constellation' && (
                        <div className="flex items-center gap-2 cursor-pointer">
                          <input 
                            type="checkbox"
                            id={`boundary-check-${id}`}
                            checked={obj.affectsShellBoundary ?? true}
                            onChange={e => handleUpdateObject(id, { affectsShellBoundary: e.target.checked })}
                            className="cursor-pointer"
                          />
                          <label htmlFor={`boundary-check-${id}`} className="text-[var(--color-text-muted)] text-sm cursor-pointer select-none">
                            ⛶ Affects Shell Boundary
                          </label>
                        </div>
                      )}

                      <div className={`flex items-center gap-2 cursor-pointer ${obj.type !== 'group' ? 'border-l border-[var(--color-border-parchment)] pl-4' : ''}`}>
                        <input 
                          type="checkbox"
                          id={`dm-only-check-${id}`}
                          checked={obj.isDMOnly ?? false}
                          onChange={e => handleUpdateObject(id, { isDMOnly: e.target.checked })}
                          className="cursor-pointer"
                        />
                        <label htmlFor={`dm-only-check-${id}`} className="text-[var(--color-text-muted)] text-sm cursor-pointer select-none" title="If checked, this object is hidden from Player views.">
                          👁️ DM Only
                        </label>
                      </div>
                    </div>

                    <div className="editor-form-group">
                      <label>Name</label>
                      <input 
                        type="text" 
                        className="editor-input"
                        value={obj.name}
                        onChange={e => handleUpdateObject(id, { name: e.target.value })}
                      />
                    </div>

                    {['star', 'planet', 'moon', 'asteroid', 'station', 'custom', 'living_world'].includes(obj.type) && (
                      <PhysicalBodyEditor obj={obj as IPhysicalBody} allObjects={allObjects} handleUpdateObject={handleUpdateObject} />
                    )}
                    {obj.type === 'cloud' && (
                      <PhenomenonEditor obj={obj as IPhenomenon} allObjects={allObjects} handleUpdateObject={handleUpdateObject} />
                    )}
                    {obj.type === 'constellation' && (
                      <ConstellationEditor obj={obj as IConstellation} allObjects={allObjects} handleUpdateObject={handleUpdateObject} />
                    )}
                    {['note', 'legend'].includes(obj.type) && (
                      <MapOverlayEditor obj={obj as IMapOverlay} handleUpdateObject={handleUpdateObject} />
                    )}
                    {obj.type === 'group' && (
                      <GroupEditor obj={obj as IGroup} allObjects={allObjects} handleUpdateObject={handleUpdateObject} />
                    )}

                  </div>
                )}
              </div>
            );
            });
          })()}

          {/* Root Dropzone to drag objects out of groups */}
          <div 
            className={`h-10 mt-4 border-2 border-dashed rounded flex items-center justify-center text-xs font-bold transition-colors ${dragOverId === '-1' ? 'border-[var(--color-accent-gold)] bg-[var(--color-bg-light)] text-[var(--color-accent-gold)]' : 'border-[var(--color-border-parchment)] text-[var(--color-text-muted)]'}`}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
              if (dragOverId !== '-1') setDragOverId('-1');
            }}
            onDragLeave={() => {
              if (dragOverId === '-1') setDragOverId(null);
            }}
            onDrop={(e) => {
              e.preventDefault();
              if (draggedId !== null) {
                updateCelestialObject(draggedId!, { groupId: undefined });
                // removeCelestialObject(draggedId, allObjects.length - 1);
              }
              setDraggedId(null);
              setDragOverId(null);
            }}
          >
            Drop here to move to Root level
          </div>
        </div>

      </div>
    </div>
  );
};
