import React, { useState } from 'react';
import { useSystemStore } from '../store/useSystemStore';
import { 
  Sun, 
  Globe, 
  Moon, 
  Plus, 
  Trash2, 
  ChevronDown, 
  ChevronUp, 
  ChevronLeft,
  Settings,
  Compass,
  Cloud,
  TreeDeciduous,
  Eye,
  EyeOff,
  Sparkles,
} from 'lucide-react';
import { CelestialObject, CelestialObjectType, WorldShape, ElementAffinity, SizeClass } from '../../types/astrolabe';
import { ScaleManager } from '../utils/ScaleManager';
import { shapeManager } from '../utils/ShapeManager';

interface SaveManagerProps {
  onCollapse?: () => void;
}

export const SaveManager: React.FC<SaveManagerProps> = ({ onCollapse }) => {
  const {
    activeSphere,
    updateActiveSphereMeta,
    updateCelestialObject,
    reorderCelestialObjects,
    addCelestialObject,
    removeCelestialObject,
    setToastMessage,
  } = useSystemStore();

  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // If no active sphere is loaded
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

  const handleUpdateObject = (index: number, updated: Partial<CelestialObject>) => {
    if (updated.type === 'star') {
      updated.initialAngle = 0;
      updated.orbitalPeriodDays = 1;
    }
    // If changing type to a cloud object, ensure a default arc width exists
    if (updated.type === 'cloud') {
      const current = activeSphere!.objects[index];
      updated.arcDegrees = updated.arcDegrees ?? current.arcDegrees ?? 30;
      updated.cloudTransparency = updated.cloudTransparency ?? current.cloudTransparency ?? 0.45;
      updated.cloudiness = updated.cloudiness ?? current.cloudiness ?? 0.5;
    }
    if (updated.type === 'living_world') {
      const current = activeSphere!.objects[index];
      updated.branchLevels = updated.branchLevels ?? current.branchLevels ?? 2;
      updated.branchDensity = updated.branchDensity ?? current.branchDensity ?? 3;
      updated.hasLeaves = updated.hasLeaves ?? current.hasLeaves ?? true;
      updated.branchBend = updated.branchBend ?? current.branchBend ?? 0.5;
    }
    updateCelestialObject(index, updated);
  };

  const handleAddObject = () => {
    const newObj: CelestialObject = {
      name: `New Body ${activeSphere.objects.length + 1}`,
      type: 'planet',
      sizeClass: 'D',
      physicalSize: 1000,
      sizeUnit: 'miles',
      description: 'A newly added planetary body.',
      orbitedObjectName: null,
      distanceOrbited: 1.0,
      initialAngle: 0,
      orbitalPeriodDays: 365,
    };
    addCelestialObject(newObj);
    setExpandedIndex(activeSphere.objects.length);
    setToastMessage({ type: 'success', text: `Added new celestial body "${newObj.name}"` });
  };

  const handleDeleteObject = (index: number, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;

    // Correct broken references for sub-orbiting moons
    activeSphere.objects.forEach((obj, idx) => {
      if (obj.orbitedObjectName === name) {
        updateCelestialObject(idx, { orbitedObjectName: null });
      }
    });

    removeCelestialObject(index);
    setExpandedIndex(null);
    setToastMessage({ type: 'success', text: `Deleted "${name}"` });
  };

  // Helper to render type icons
  const renderTypeIcon = (type: string) => {
    switch (type) {
      case 'star':
        return <Sun className="w-3.5 h-3.5 text-yellow-600 dark:text-yellow-400" />;
      case 'moon':
        return <Moon className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />;
      case 'cloud':
        return <Cloud className="w-3.5 h-3.5 text-blue-400" />;
      case 'living_world':
        return <TreeDeciduous className="w-3.5 h-3.5 text-green-600 dark:text-green-500" />;
      case 'constellation':
        return <Sparkles className="w-3.5 h-3.5 text-purple-400" />;
      default:
        return <Globe className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />;
    }
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
        
        {/* Section: System Metadata */}
        <div className="save-manager-section">
          <div className="save-manager-section-title">
            <Compass className="w-3 h-3 text-[var(--color-accent-gold)]" /> System Config
          </div>
          
          <div className="editor-form-group">
            <label>Sphere Name</label>
            <input 
              type="text" 
              className="editor-input"
              value={activeSphere.sphereName} 
              onChange={e => updateActiveSphereMeta({ sphereName: e.target.value })}
            />
          </div>

          <div className="editor-form-group">
            <label>Campaign Date</label>
            <input 
              type="text" 
              className="editor-input"
              value={activeSphere.currentCampaignDate} 
              onChange={e => updateActiveSphereMeta({ currentCampaignDate: e.target.value })}
            />
          </div>

          <div className="editor-form-group" style={{ alignItems: 'flex-start' }}>
            <label style={{ marginBottom: '8px' }}>Shell Boundary</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px' }}>
                <input 
                  type="radio" 
                  name="shellBoundaryType"
                  checked={(!activeSphere.shellBoundaryType || activeSphere.shellBoundaryType === 'double')}
                  onChange={() => updateActiveSphereMeta({ shellBoundaryType: 'double' })}
                />
                Double (Max x2)
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px' }}>
                <input 
                  type="radio" 
                  name="shellBoundaryType"
                  checked={(activeSphere.shellBoundaryType === 'custom' || activeSphere.shellBoundaryType === 'relativeMargin')}
                  onChange={() => updateActiveSphereMeta({ shellBoundaryType: 'custom' })}
                />
                Custom Margin
              </label>
              {(activeSphere.shellBoundaryType === 'custom' || activeSphere.shellBoundaryType === 'relativeMargin') && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingLeft: '24px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Max x</span>
                  <input
                    type="number"
                    step="0.1"
                    min="1.0"
                    className="editor-input"
                    style={{ width: '80px' }}
                    value={activeSphere.shellCustomScale ?? 1.2}
                    onChange={e => updateActiveSphereMeta({ shellCustomScale: parseFloat(e.target.value) || 1.2 })}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Section: Celestial Bodies Header */}
        <div className="save-manager-section-header">
          <h5 className="font-title text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">
            Celestial Bodies
          </h5>
        </div>

        {/* Action Button: Add Body */}
        <button onClick={handleAddObject} className="add-body-btn">
          <Plus className="w-3.5 h-3.5" /> Add Celestial Body
        </button>

        {/* Dynamic Accordion list of bodies */}
        <div className="save-manager-list">
          {activeSphere.objects.map((obj, index) => {
            const isExpanded = expandedIndex === index;
            
            return (
              <div 
                key={'celestial-obj-' + index} 
                className={`editor-card ${draggedIndex === index ? 'opacity-50' : ''} ${
                  dragOverIndex === index 
                    ? (draggedIndex !== null && draggedIndex < index 
                        ? 'border-b-2 border-b-[var(--color-accent-gold)]' 
                        : 'border-t-2 border-t-[var(--color-accent-gold)]') 
                    : ''
                }`}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                  if (dragOverIndex !== index) {
                    setDragOverIndex(index);
                  }
                }}
                onDragLeave={() => {
                  if (dragOverIndex === index) {
                    setDragOverIndex(null);
                  }
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (draggedIndex !== null && draggedIndex !== index) {
                    reorderCelestialObjects(draggedIndex, index);
                  }
                  setDraggedIndex(null);
                  setDragOverIndex(null);
                }}
              >
                
                {/* Accordion Card Header */}
                <div 
                  onClick={() => setExpandedIndex(isExpanded ? null : index)}
                  className="editor-card-header"
                  draggable
                  onDragStart={(e) => {
                    setExpandedIndex(null);
                    setDraggedIndex(index);
                    e.dataTransfer.effectAllowed = 'move';
                  }}
                  onDragEnd={() => {
                    setDraggedIndex(null);
                    setDragOverIndex(null);
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
                      onClick={() => handleUpdateObject(index, { isHidden: !obj.isHidden })}
                      className="editor-card-delete-btn"
                      title={obj.isHidden ? `Show ${obj.name}` : `Hide ${obj.name}`}
                    >
                      {obj.isHidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => handleDeleteObject(index, obj.name)}
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
                      <div className="flex items-center gap-2 cursor-pointer">
                        <input 
                          type="checkbox"
                          id={`boundary-check-${index}`}
                          checked={obj.affectsShellBoundary ?? true}
                          onChange={e => handleUpdateObject(index, { affectsShellBoundary: e.target.checked })}
                          className="cursor-pointer"
                        />
                        <label htmlFor={`boundary-check-${index}`} className="text-[var(--color-text-muted)] text-sm cursor-pointer select-none">
                          ⛶ Affects Shell Boundary
                        </label>
                      </div>

                      <div className="flex items-center gap-2 cursor-pointer border-l border-[var(--color-border-parchment)] pl-4">
                        <input 
                          type="checkbox"
                          id={`dm-only-check-${index}`}
                          checked={obj.isDMOnly ?? false}
                          onChange={e => handleUpdateObject(index, { isDMOnly: e.target.checked })}
                          className="cursor-pointer"
                        />
                        <label htmlFor={`dm-only-check-${index}`} className="text-[var(--color-text-muted)] text-sm cursor-pointer select-none" title="If checked, this object is hidden from Player views.">
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
                        onChange={e => handleUpdateObject(index, { name: e.target.value })}
                      />
                    </div>

                    <div className="editor-form-group">
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
                          } else {
                            if (['ring', 'cylinder', 'ship', 'castle', 'skull'].includes(obj.worldShape || '')) {
                              updates.worldShape = 'sphere';
                            }
                          }
                          handleUpdateObject(index, updates);
                        }}
                      >
                        <option value="star">⭐ Star</option>
                        <option value="planet">🌍 Planet</option>
                        <option value="moon">🌕 Moon</option>
                        <option value="asteroid">☄️ Asteroid</option>
                        <option value="station">🏙️ Station</option>
                        <option value="cloud">☁️ Cloud</option>
                        <option value="living_world">🌳 Living World</option>
                        <option value="constellation">✨ Constellation</option>
                        <option value="custom">⚙️ Custom (Legacy)</option>
                      </select>
                    </div>

                    <div className="editor-form-group">
                      <label>Size Class</label>
                      <select
                        className="editor-select"
                        value={obj.sizeClass || 'D'}
                        onChange={e => {
                          const newClass = e.target.value as SizeClass;
                          const newUnit = newClass === 'J' ? 'AU' : 'miles';
                          handleUpdateObject(index, { sizeClass: newClass, sizeUnit: newUnit });
                        }}
                      >
                        <option value="A">Size A (&lt; 10 mi)</option>
                        <option value="B">Size B (10 - 100 mi)</option>
                        <option value="C">Size C (100 - 1k mi)</option>
                        <option value="D">Size D (1k - 4k mi)</option>
                        <option value="E">Size E (4k - 10k mi)</option>
                        <option value="F">Size F (10k - 40k mi)</option>
                        <option value="G">Size G (40k - 100k mi)</option>
                        <option value="H">Size H (100k - 1M mi)</option>
                        <option value="I">Size I (1M - 10M mi)</option>
                        <option value="J">Size J (&ge; 10M mi / AU)</option>
                      </select>
                    </div>

                    <div className="editor-form-group">
                      <label>Physical Size ({obj.sizeUnit || 'miles'})</label>
                      <input 
                        type="number" 
                        step="any"
                        className={`editor-input ${!ScaleManager.isValidSize(obj.sizeClass || 'D', obj.physicalSize || 1000, obj.sizeUnit || 'miles') ? 'border-[var(--color-accent-red)] text-[var(--color-accent-red)]' : ''}`}
                        value={obj.physicalSize ?? 1000}
                        onChange={e => handleUpdateObject(index, { physicalSize: parseFloat(e.target.value) || 0 })}
                        title={!ScaleManager.isValidSize(obj.sizeClass || 'D', obj.physicalSize || 1000, obj.sizeUnit || 'miles') ? 'Physical size is out of bounds for the selected Size Class.' : ''}
                      />
                    </div>
                    {!ScaleManager.isValidSize(obj.sizeClass || 'D', obj.physicalSize || 1000, obj.sizeUnit || 'miles') && (
                      <div className="text-[var(--color-accent-red)] text-[10px] mt-1 mb-2 px-1 font-bold">
                        Warning: Size is out of bounds for Class {obj.sizeClass || 'D'}
                      </div>
                    )}

                    {(obj.type === 'cloud' || obj.type === 'constellation') && (
                      <div className="editor-form-group">
                        <label>Arc Width (Degrees)</label>
                        <input
                          type="number"
                          step="1"
                          min="1"
                          max="359"
                          className="editor-input"
                          value={obj.arcDegrees ?? 30}
                          onChange={e => handleUpdateObject(index, { arcDegrees: parseFloat(e.target.value) || 30 })}
                        />
                      </div>
                    )}


                        <div className="editor-form-group">
                          <label>Orbiting Parent</label>
                          <select 
                            className="editor-select"
                            value={obj.orbitedObjectName || ''}
                            onChange={e => handleUpdateObject(index, { orbitedObjectName: e.target.value === '' ? null : e.target.value })}
                          >
                            <option value="">None (System Center)</option>
                            {activeSphere.objects
                              .filter(o => o.name !== obj.name && o.type !== 'moon')
                              .map(o => (
                                <option key={o.name} value={o.name}>{o.name}</option>
                              ))}
                          </select>
                        </div>

                        <div className="editor-form-group">
                          <label>Orbit Distance (AU)</label>
                          <input 
                            type="number" 
                            step="any"
                            className="editor-input"
                            value={obj.distanceOrbited}
                            onChange={e => handleUpdateObject(index, { distanceOrbited: parseFloat(e.target.value) || 0 })}
                          />
                        </div>

                        <div className="editor-form-group">
                          <label>Initial Angle (Deg)</label>
                          <div className="flex gap-1">
                            <input 
                              type="number" 
                              step="any"
                              className="editor-input"
                              style={{ flex: 1 }}
                              value={obj.initialAngle}
                              onChange={e => handleUpdateObject(index, { initialAngle: parseFloat(e.target.value) || 0 })}
                            />
                            <button
                              type="button"
                              onClick={() => handleUpdateObject(index, { initialAngle: Math.floor(Math.random() * 360) })}
                              className="px-2 text-xs bg-transparent border border-[var(--color-border-parchment)] text-[var(--color-text-muted)] hover:bg-[var(--color-accent-gold)] hover:text-[#2b2316] transition-colors"
                              title="Randomize Angle"
                            >
                              🎲
                            </button>
                          </div>
                        </div>

                        <div className="editor-form-group">
                          <label>Orbital Period (Days)</label>
                          <input 
                            type="number" 
                            step="any"
                            className="editor-input"
                            value={obj.orbitalPeriodDays}
                            onChange={e => handleUpdateObject(index, { orbitalPeriodDays: parseFloat(e.target.value) || 0 })}
                          />
                        </div>

                        {/* Orbit Motion: Prograde / Stationary / Retrograde */}
                        <div className="editor-form-group">
                          <label>Orbit Motion</label>
                          <div className="flex gap-1">
                            {(['prograde', 'stationary', 'retrograde'] as const).map((motion) => {
                              const isActive =
                                motion === 'stationary' ? !!obj.isStationary
                                : !obj.isStationary && (obj.orbitDirection ?? 'prograde') === motion;
                              return (
                                <button
                                  key={motion}
                                  type="button"
                                  onClick={() => handleUpdateObject(index, {
                                    isStationary: motion === 'stationary',
                                    orbitDirection: motion !== 'stationary' ? motion : obj.orbitDirection,
                                  })}
                                  className={`flex-1 text-[9px] py-1 font-bold transition-colors ${
                                    isActive
                                      ? 'bg-[var(--color-accent-gold)] text-[#2b2316] border border-[var(--color-accent-gold)]'
                                      : 'bg-transparent text-[var(--color-text-muted)] border border-[var(--color-border-parchment)] hover:bg-[var(--color-bg-base)]'
                                  }`}
                                >
                                  {motion === 'prograde' ? '▶ PRO' : motion === 'stationary' ? '◆ FIXED' : '◄ RETRO'}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* World Shape (not shown for cloud-type objects) */}
                        {obj.type !== 'cloud' && obj.type !== 'living_world' && obj.type !== 'constellation' && (
                          <div className="editor-form-group">
                            <label>World Shape</label>
                            {obj.type === 'station' ? (
                              <select
                                className="editor-select"
                                value={obj.worldShape ?? 'ring'}
                                onChange={e => handleUpdateObject(index, { worldShape: e.target.value as WorldShape })}
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
                                onChange={e => handleUpdateObject(index, { worldShape: e.target.value as WorldShape })}
                              >
                                <option value="sphere">● Sphere (Default)</option>
                                <option value="disc">⬡ Disc World</option>
                                <option value="pyramid">△ Pyramid World</option>
                                <option value="cluster">⊛ Cluster World</option>
                                <option value="irregular">✦ Irregular</option>
                                <option value="elliptical">⬭ Elliptical</option>
                                <option value="rectangular">▭ Rectangular</option>
                                <option value="custom">⚙️ Custom SVG</option>
                              </select>
                            )}
                          </div>
                        )}

                        {/* Custom Shape Selector */}
                        {(obj.worldShape === 'custom' || obj.type === 'constellation') && (
                          <div className="editor-form-group">
                            <label>Custom Shape</label>
                            <select
                              className="editor-select"
                              value={obj.customShapeName ?? ''}
                              onChange={e => handleUpdateObject(index, { customShapeName: e.target.value })}
                            >
                              <option value="">-- Select Shape --</option>
                              {shapeManager.getAvailableShapes().map(shape => (
                                <option key={shape} value={shape}>{shape}</option>
                              ))}
                            </select>
                          </div>
                        )}

                        {/* Element Affinity */}
                        <div className="editor-form-group">
                          <label>Element Affinity</label>
                          <select
                            className="editor-select"
                            value={obj.elementAffinity ?? ''}
                            onChange={e => handleUpdateObject(index, { elementAffinity: (e.target.value || null) as ElementAffinity | null })}
                          >
                            <option value="">None</option>
                            <option value="fire">🔥 Fire</option>
                            <option value="water">💧 Water</option>
                            <option value="earth">🪨 Earth</option>
                            <option value="air">💨 Air</option>
                            <option value="mixed">🌿 Mixed</option>
                          </select>
                        </div>

                        {/* Star only properties */}
                        {(obj.type === 'star') && (
                          <>
                            <div className="editor-form-group">
                              <label>Corona Size (x)</label>
                              <input
                                type="number"
                                step="0.1"
                                min="1.0"
                                className="editor-input"
                                value={obj.coronaSize ?? 1.5}
                                onChange={e => handleUpdateObject(index, { coronaSize: parseFloat(e.target.value) || 1.5 })}
                              />
                            </div>
                            <div className="editor-form-group">
                              <label>Corona Alpha (0-1)</label>
                              <input
                                type="number"
                                step="0.05"
                                min="0.0"
                                max="1.0"
                                className="editor-input"
                                value={obj.coronaAlpha ?? 0.3}
                                onChange={e => handleUpdateObject(index, { coronaAlpha: parseFloat(e.target.value) || 0.3 })}
                              />
                            </div>
                          </>
                        )}

                        {/* Cloud only properties */}
                        {(obj.type === 'cloud') && (
                          <>
                            <div className="editor-form-group">
                              <label>Transparency (0-1)</label>
                              <input
                                type="number"
                                step="0.05"
                                min="0"
                                max="1"
                                className="editor-input"
                                value={obj.cloudTransparency ?? 0.45}
                                onChange={e => handleUpdateObject(index, { cloudTransparency: parseFloat(e.target.value) || 0 })}
                              />
                            </div>
                            <div className="editor-form-group">
                              <label>Cloudiness (0-1)</label>
                              <input
                                type="number"
                                step="0.05"
                                min="0"
                                max="1"
                                className="editor-input"
                                value={obj.cloudiness ?? 0.5}
                                onChange={e => handleUpdateObject(index, { cloudiness: parseFloat(e.target.value) || 0 })}
                              />
                            </div>
                            <div className="editor-form-group">
                              <label>Internal Shape</label>
                              <select
                                className="editor-select"
                                value={obj.cloudObjectShape ?? 'sphere'}
                                onChange={e => handleUpdateObject(index, { cloudObjectShape: e.target.value as WorldShape })}
                              >
                                <option value="sphere">● Sphere (Default)</option>
                                <option value="disc">⬡ Disc</option>
                                <option value="pyramid">△ Pyramid</option>
                                <option value="cluster">⊛ Cluster</option>
                                <option value="irregular">✦ Irregular</option>
                                <option value="elliptical">⬭ Elliptical</option>
                              </select>
                            </div>
                            <div className="editor-form-group">
                              <label>Internal Size Class</label>
                              <select
                                className="editor-select"
                                value={obj.cloudObjectSizeClass ?? 'A'}
                                onChange={e => handleUpdateObject(index, { cloudObjectSizeClass: e.target.value as SizeClass })}
                              >
                                <option value="A">Size A (&lt; 10 mi)</option>
                                <option value="B">Size B (10 - 100 mi)</option>
                                <option value="C">Size C (100 - 1,000 mi)</option>
                                <option value="D">Size D (1,000 - 4,000 mi)</option>
                                <option value="E">Size E (4,000 - 10,000 mi)</option>
                                <option value="F">Size F (10,000 - 40,000 mi)</option>
                                <option value="G">Size G (40,000 - 100k mi)</option>
                                <option value="H">Size H (100k - 1m mi)</option>
                                <option value="I">Size I (1m - 10m mi)</option>
                              </select>
                            </div>
                            <div className="editor-form-group">
                              <label>Internal Physical Size (miles)</label>
                              <input
                                type="number"
                                step="any"
                                min="0"
                                className="editor-input"
                                value={obj.cloudObjectPhysicalSize ?? 5}
                                onChange={e => handleUpdateObject(index, { cloudObjectPhysicalSize: parseFloat(e.target.value) || 0 })}
                              />
                            </div>
                            <div className="editor-form-group">
                              <label>Internal Density</label>
                              <input
                                type="number"
                                step="1"
                                min="0"
                                className="editor-input"
                                value={obj.cloudObjectDensity ?? 0}
                                onChange={e => handleUpdateObject(index, { cloudObjectDensity: parseInt(e.target.value, 10) || 0 })}
                              />
                            </div>
                          </>
                        )}

                        {/* Living World Config */}
                        {obj.type === 'living_world' && (
                          <>
                            <div className="editor-form-group">
                              <label>Branch Levels</label>
                              <input
                                type="number"
                                step="1"
                                min="1"
                                max="6"
                                className="editor-input"
                                value={obj.branchLevels ?? 2}
                                onChange={e => handleUpdateObject(index, { branchLevels: parseInt(e.target.value, 10) || 2 })}
                              />
                            </div>
                            <div className="editor-form-group">
                              <label>Branch Density</label>
                              <input
                                type="number"
                                step="1"
                                min="1"
                                max="10"
                                className="editor-input"
                                value={obj.branchDensity ?? 3}
                                onChange={e => handleUpdateObject(index, { branchDensity: parseInt(e.target.value, 10) || 3 })}
                              />
                            </div>
                            <div className="editor-form-group flex items-center justify-between mt-2">
                              <label className="mb-0">Has Leaves</label>
                              <input
                                type="checkbox"
                                checked={obj.hasLeaves ?? true}
                                onChange={e => handleUpdateObject(index, { hasLeaves: e.target.checked })}
                              />
                            </div>
                            <div className="editor-form-group">
                              <label>Branch Bend</label>
                              <input
                                type="number"
                                step="0.1"
                                min="0.0"
                                max="2.0"
                                className="editor-input"
                                value={obj.branchBend ?? 0.5}
                                onChange={e => handleUpdateObject(index, { branchBend: parseFloat(e.target.value) || 0.0 })}
                              />
                            </div>
                          </>
                        )}

                        {/* Constellation Config */}
                        {obj.type === 'constellation' && (
                          <>
                            <div className="editor-form-group">
                              <label>Background Fill Alpha (0-1)</label>
                              <input
                                type="number"
                                step="0.05"
                                min="0.0"
                                max="1.0"
                                className="editor-input"
                                value={obj.constellationFillAlpha ?? 0.2}
                                onChange={e => handleUpdateObject(index, { constellationFillAlpha: parseFloat(e.target.value) || 0.0 })}
                              />
                            </div>
                            <div className="editor-form-group">
                              <label>Wireframe Detail Level</label>
                              <input
                                type="number"
                                step="1"
                                min="2"
                                className="editor-input"
                                value={obj.constellationDetail ?? 10}
                                onChange={e => handleUpdateObject(index, { constellationDetail: parseInt(e.target.value, 10) || 10 })}
                                title="How many segments to break the SVG path into."
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
                                onChange={e => handleUpdateObject(index, { constellationStarCount: parseInt(e.target.value, 10) || 0 })}
                              />
                            </div>
                            <div className="editor-form-group">
                              <label>Min Internal Star Size Class</label>
                              <select
                                className="editor-select"
                                value={obj.constellationStarMinSizeClass || 'A'}
                                onChange={e => handleUpdateObject(index, { constellationStarMinSizeClass: e.target.value as SizeClass })}
                              >
                                <option value="A">Size A</option>
                                <option value="B">Size B</option>
                                <option value="C">Size C</option>
                                <option value="D">Size D</option>
                                <option value="E">Size E</option>
                                <option value="F">Size F</option>
                                <option value="G">Size G</option>
                                <option value="H">Size H</option>
                                <option value="I">Size I</option>
                              </select>
                            </div>
                            <div className="editor-form-group">
                              <label>Max Internal Star Size Class</label>
                              <select
                                className="editor-select"
                                value={obj.constellationStarMaxSizeClass || 'C'}
                                onChange={e => handleUpdateObject(index, { constellationStarMaxSizeClass: e.target.value as SizeClass })}
                              >
                                <option value="A">Size A</option>
                                <option value="B">Size B</option>
                                <option value="C">Size C</option>
                                <option value="D">Size D</option>
                                <option value="E">Size E</option>
                                <option value="F">Size F</option>
                                <option value="G">Size G</option>
                                <option value="H">Size H</option>
                                <option value="I">Size I</option>
                              </select>
                            </div>
                          </>
                        )}


                    <div className="editor-form-group">
                      <label>Description</label>
                      <textarea 
                        className="editor-textarea"
                        value={obj.description || ''}
                        onChange={e => handleUpdateObject(index, { description: e.target.value })}
                      />
                    </div>

                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
};
