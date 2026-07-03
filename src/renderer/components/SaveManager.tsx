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
  Wind,
} from 'lucide-react';
import { CelestialObject, CelestialObjectType, WorldShape, ElementAffinity } from '../../types/astrolabe';

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
    setToastMessage,
  } = useSystemStore();

  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

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
    if (updated.type === 'nebula' || updated.type === 'sargasso') {
      const current = activeSphere!.objects[index];
      updated.arcDegrees = updated.arcDegrees ?? current.arcDegrees ?? 30;
    }
    updateCelestialObject(index, updated);
  };

  const handleAddObject = () => {
    const newObj: CelestialObject = {
      name: `New Body ${activeSphere.objects.length + 1}`,
      type: 'planet',
      size: 10,
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
      case 'nebula':
        return <Cloud className="w-3.5 h-3.5 text-blue-400" />;
      case 'sargasso':
        return <Wind className="w-3.5 h-3.5 text-green-500" />;
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

          <div className="editor-form-group">
            <label>Shell Boundary</label>
            <select
              className="editor-select"
              value={activeSphere.shellBoundaryType || 'double'}
              onChange={e => updateActiveSphereMeta({ shellBoundaryType: e.target.value as 'double' | 'relativeMargin' })}
            >
              <option value="double">Double (Max x2)</option>
              <option value="relativeMargin">Plus Margin (Max x1.2)</option>
            </select>
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
              <div key={index} className="editor-card">
                
                {/* Accordion Card Header */}
                <div 
                  onClick={() => setExpandedIndex(isExpanded ? null : index)}
                  className="editor-card-header"
                >
                  <div className="editor-card-title">
                    {renderTypeIcon(obj.type)}
                    <span className="editor-card-name">{obj.name}</span>
                    <span className="editor-card-type-label">
                      ({obj.type})
                    </span>
                  </div>
                  
                  <div className="editor-card-actions" onClick={e => e.stopPropagation()}>
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
                        onChange={e => handleUpdateObject(index, { type: e.target.value as CelestialObjectType })}
                      >
                        <option value="star">⭐ Star</option>
                        <option value="planet">🌍 Planet</option>
                        <option value="moon">🌕 Moon</option>
                        <option value="asteroid">☄️ Asteroid</option>
                        <option value="station">🏙️ Station</option>
                        <option value="nebula">☁️ Nebula</option>
                        <option value="sargasso">🌿 Sargasso</option>
                        <option value="custom">✨ Custom</option>
                      </select>
                    </div>

                    <div className="editor-form-group">
                      <label>Size</label>
                      <input 
                        type="number" 
                        step="any"
                        className="editor-input"
                        value={obj.size}
                        onChange={e => handleUpdateObject(index, { size: parseFloat(e.target.value) || 0 })}
                      />
                    </div>


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
                          <input 
                            type="number" 
                            step="any"
                            className="editor-input"
                            value={obj.initialAngle}
                            onChange={e => handleUpdateObject(index, { initialAngle: parseFloat(e.target.value) || 0 })}
                          />
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
                        {obj.type !== 'nebula' && obj.type !== 'sargasso' && (
                          <div className="editor-form-group">
                            <label>World Shape</label>
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

                        {/* Arc Width — nebula/sargasso only */}
                        {(obj.type === 'nebula' || obj.type === 'sargasso') && (
                          <div className="editor-form-group">
                            <label>Arc Width (°)</label>
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
