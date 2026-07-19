import { MapStyleContext, NavigationChartStyleConfig } from '../../../types/renderer';

export class LegendRenderer {
  public static draw(
    context: MapStyleContext,
    visibleObjects: any[],
    config: NavigationChartStyleConfig,
    getIcon: (name: string) => HTMLImageElement | HTMLCanvasElement | null
  ): void {
    const { ctx, activeZoom, baseZoom, project, selectedObjectId, objects } = context;
    const legends = visibleObjects.filter(o => o.type === 'legend') as any[];
    if (legends.length === 0) return;

    // Filter used attributes for partial legends
    const usedElements = new Set<string>();
    const usedTypes = new Set<string>();
    const usedOrbits = new Set<string>();
    objects.forEach((o: any) => {
        if (o.type === 'note' || o.type === 'legend' || o.type === 'moon' || o.type === 'constellation') return;
        usedElements.add(o.elementAffinity || 'none');
        usedTypes.add(o.type);
        if (o.orbitedObjectName === null || o.distanceOrbited === 0) usedOrbits.add('central');
        else if (o.isStationary) usedOrbits.add('fixed');
        else if ((o.orbitEccentricity || 0) > 0) usedOrbits.add('elliptical');
        else usedOrbits.add('standard');
    });

    ctx.save();
    legends.forEach(legend => {
      const dist = legend.legendDistanceAU || 0;
      const angle = legend.legendAngle || 0;
      const fontSize = legend.legendFontSize || 16;
      const fontFamily = legend.legendFontFamily || 'Elan';
      
      const rad = (angle * Math.PI) / 180;
      const proj = project(Math.cos(rad) * dist, Math.sin(rad) * dist);
      const lScale = legend.legendScale ?? 1.0;

      ctx.save();
      ctx.translate(proj.x, proj.y);
      const normalizedZoom = activeZoom / (baseZoom || 1);
      ctx.scale(normalizedZoom * lScale, normalizedZoom * lScale);

      ctx.font = `bold ${fontSize}px '${fontFamily}', sans-serif`;
      let title = 'Legend';
      if (legend.legendType === 'PlanetType') title = 'Planets';
      else if (legend.legendType === 'OrbitType') title = 'Orbits';
      else if (legend.legendType === 'ElementalAffinity') title = 'Elements';

      const titleWidth = ctx.measureText(title).width;
      
      const items: { key: string, label: string, type: 'svg' | 'draw' }[] = [];
      
      const addSvgItem = (key: string, label: string, condition: boolean) => {
          if (legend.legendMode === 'full' || condition) items.push({ key, label, type: 'svg' });
      };
      const addDrawItem = (key: string, label: string, condition: boolean) => {
          if (legend.legendMode === 'full' || condition) items.push({ key, label, type: 'draw' });
      };

      if (legend.legendType === 'ElementalAffinity') {
          addSvgItem('fire', 'Fire', usedElements.has('fire'));
          addSvgItem('water', 'Water', usedElements.has('water'));
          addSvgItem('earth', 'Earth', usedElements.has('earth'));
          addSvgItem('air', 'Air', usedElements.has('air'));
          addSvgItem('mixed', 'Mixed', usedElements.has('mixed'));
          addSvgItem('none', 'No Affinity', usedElements.has('none'));
      } else if (legend.legendType === 'PlanetType') {
          addSvgItem('star', 'Star', usedTypes.has('star'));
          addSvgItem('planet', 'Planet', usedTypes.has('planet'));
          addSvgItem('moon', 'Moon', usedTypes.has('moon'));
          addSvgItem('asteroid', 'Asteroid', usedTypes.has('asteroid'));
          addSvgItem('station', 'Station', usedTypes.has('station'));
          addSvgItem('cloud', 'Cloud', usedTypes.has('cloud'));
          addSvgItem('living_world', 'Living World', usedTypes.has('living_world'));
      } else if (legend.legendType === 'OrbitType') {
          addDrawItem('central', 'Central', usedOrbits.has('central'));
          addDrawItem('standard', 'Standard', usedOrbits.has('standard'));
          addDrawItem('elliptical', 'Elliptical', usedOrbits.has('elliptical'));
          addDrawItem('fixed', 'Stationary', usedOrbits.has('fixed'));
      }

      ctx.font = `${fontSize * 0.8}px '${fontFamily}', sans-serif`;
      let maxItemWidth = 0;
      items.forEach(item => {
          const w = ctx.measureText(item.label).width;
          if (w > maxItemWidth) maxItemWidth = w;
      });

      const iconSize = fontSize * 1.2;
      const padding = fontSize;
      const lineSpacing = fontSize * 1.5;
      const boxWidth = Math.max(titleWidth, iconSize + fontSize * 0.5 + maxItemWidth) + padding * 2;
      const boxHeight = padding * 2 + fontSize + (items.length > 0 ? fontSize * 0.5 + items.length * lineSpacing : 0);

      // Draw Border Box (no fill)
      ctx.strokeStyle = config.strokeColor;
      ctx.lineWidth = 1 / (normalizedZoom * lScale);
      ctx.beginPath();
      ctx.roundRect(-boxWidth/2, -boxHeight/2, boxWidth, boxHeight, 5 / (normalizedZoom * lScale));
      ctx.stroke();

      // Draw Title
      ctx.fillStyle = config.strokeColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.font = `bold ${fontSize}px '${fontFamily}', sans-serif`;
      ctx.fillText(title, 0, -boxHeight/2 + padding);

      // Draw Items
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.font = `${fontSize * 0.8}px '${fontFamily}', sans-serif`;
      
      const startX = -boxWidth/2 + padding;
      let startY = -boxHeight/2 + padding + fontSize + fontSize * 0.5 + iconSize/2;

      items.forEach(item => {
          if (item.type === 'svg') {
              const img = getIcon(item.key);
              if (img && (img instanceof HTMLCanvasElement || (img.complete && img.naturalWidth > 0))) {
                  ctx.drawImage(img, startX, startY - iconSize/2, iconSize, iconSize);
              }
          } else if (item.type === 'draw') {
              ctx.save();
              ctx.translate(startX + iconSize/2, startY);
              const R = iconSize * 0.4;
              ctx.strokeStyle = config.legendTextColor;
              ctx.fillStyle = config.legendTextColor;
              ctx.lineWidth = R * 0.22;
              
              ctx.beginPath();
              if (item.key === 'central') {
                ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.stroke();
                ctx.beginPath(); ctx.arc(0, 0, R * 0.5, 0, Math.PI * 2); ctx.fill();
              } else if (item.key === 'standard') {
                ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.stroke();
                ctx.beginPath();
                ctx.arc(Math.cos(-Math.PI / 4) * R, Math.sin(-Math.PI / 4) * R, R * 0.6, 0, Math.PI * 2); ctx.fill();
              } else if (item.key === 'elliptical') {
                ctx.ellipse(0, 0, R, R * 0.5, 0, 0, Math.PI * 2); ctx.stroke();
                ctx.beginPath();
                ctx.arc(Math.cos(-Math.PI / 4) * R, Math.sin(-Math.PI / 4) * R * 0.5, R * 0.6, 0, Math.PI * 2); ctx.fill();
              } else if (item.key === 'fixed') {
                ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.stroke();
                ctx.translate(Math.cos(-Math.PI / 4) * R, Math.sin(-Math.PI / 4) * R);
                ctx.rotate(-Math.PI / 4);
                ctx.fillRect(-R * 0.6, -R * 0.2, R * 1.2, R * 0.4);
              }
              ctx.restore();
          }
          
          ctx.fillText(item.label, startX + iconSize + fontSize * 0.5, startY);
          startY += lineSpacing;
      });

      // Draw selection indicator
      const isSelected = selectedObjectId !== null && objects.find((o: any) => o.id === selectedObjectId)?.name === legend.name;
      if (isSelected) {
          ctx.fillStyle = config.strokeColor;
          ctx.beginPath();
          const r = 5 / (normalizedZoom * lScale);
          ctx.arc(0, 0, r, 0, Math.PI * 2);
          ctx.fill();
      }

      ctx.restore();
    });
    ctx.restore();
  }
}
