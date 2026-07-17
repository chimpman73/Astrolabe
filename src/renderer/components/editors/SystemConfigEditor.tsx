import React from 'react';
import { Compass, ChevronUp, ChevronDown } from 'lucide-react';
import { CrystalSphere } from '../../../types/astrolabe';

interface SystemConfigEditorProps {
  activeSphere: CrystalSphere;
  isSystemConfigExpanded: boolean;
  setIsSystemConfigExpanded: (val: boolean) => void;
  updateActiveSphereMeta: (updated: Partial<CrystalSphere>) => void;
}

export const SystemConfigEditor: React.FC<SystemConfigEditorProps> = ({
  activeSphere,
  isSystemConfigExpanded,
  setIsSystemConfigExpanded,
  updateActiveSphereMeta
}) => {
  return (
    <div className="editor-card mb-4 border-t-2 border-t-[var(--color-accent-gold)]">
      <div 
        onClick={() => setIsSystemConfigExpanded(!isSystemConfigExpanded)}
        className="editor-card-header"
        style={{ cursor: 'pointer' }}
      >
        <div className="editor-card-title">
          <Compass className="w-3.5 h-3.5 text-[var(--color-accent-gold)]" />
          <span className="editor-card-name">System Config</span>
        </div>
        
        <div className="editor-card-actions" onClick={e => e.stopPropagation()}>
          <div className="editor-card-chevron">
            {isSystemConfigExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </div>
        </div>
      </div>

      {isSystemConfigExpanded && (
        <div className="editor-card-body">
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
            <label>System Time</label>
            <div style={{ display: 'flex', gap: '4px' }}>
              <input
                type="text"
                className="editor-input"
                style={{ flex: 1, minWidth: '40px' }}
                placeholder="Epoch"
                value={activeSphere.epoch || ''}
                onChange={e => updateActiveSphereMeta({ epoch: e.target.value })}
              />
              <input
                type="number"
                className="editor-input"
                style={{ flex: 1, minWidth: '60px' }}
                placeholder="Year"
                value={activeSphere.campaignYear ?? ''}
                onChange={e => {
                  const yr = parseInt(e.target.value, 10);
                  if (!isNaN(yr)) {
                    updateActiveSphereMeta({ campaignYear: yr });
                  }
                }}
              />
              <input
                type="number"
                min="1"
                max="365"
                className="editor-input"
                style={{ flex: 1, minWidth: '50px' }}
                placeholder="Day"
                value={activeSphere.campaignDay ?? ''}
                onChange={e => {
                  let dy = parseInt(e.target.value, 10);
                  if (!isNaN(dy)) {
                    updateActiveSphereMeta({ campaignDay: dy });
                  }
                }}
              />
            </div>
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

          <div className="editor-form-group">
            <label>Orbital Line Strength (x)</label>
            <div className="flex gap-2 items-center w-full">
              <input 
                type="range"
                min="0.1"
                max="5.0"
                step="0.1"
                className="flex-1"
                value={activeSphere.orbitalDrawStrength ?? 1.0}
                onChange={e => updateActiveSphereMeta({ orbitalDrawStrength: parseFloat(e.target.value) || 1.0 })}
              />
              <span className="text-[10px] w-6">{(activeSphere.orbitalDrawStrength ?? 1.0).toFixed(1)}</span>
            </div>
          </div>

          <div className="editor-form-group">
            <label>Planet Base Size Offset (px)</label>
            <div className="flex gap-2 items-center w-full">
              <input 
                type="number"
                step="1"
                className="editor-input text-center flex-1"
                value={activeSphere.navChartPlanetSizeOffset ?? 0}
                onChange={e => {
                  const val = parseInt(e.target.value, 10);
                  updateActiveSphereMeta({ navChartPlanetSizeOffset: isNaN(val) ? 0 : val });
                }}
              />
            </div>
          </div>
          <div className="editor-form-group">
            <label>Title Strike Outline</label>
            <div className="flex items-center gap-2 mt-1">
              <input
                type="checkbox"
                checked={activeSphere.navTitleStrike ?? false}
                onChange={e => updateActiveSphereMeta({ navTitleStrike: e.target.checked })}
                className="w-4 h-4 text-amber-900 bg-amber-50 border-amber-900 rounded focus:ring-amber-900 focus:ring-2"
              />
              <span className="text-xs text-[var(--color-text-muted)]">
                Add outline to planet names for better legibility on the map.
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
