import { MapStyleContext, INavigationChartRenderer } from '../../types/renderer';
import { CelestialObject } from '../../types/astrolabe';
import { getNoteCorners } from '../utils/noteInteractions';
import { drawSolidBody, drawStationaryIndicator, getBodyColors, getElementColor } from '../utils/canvasRenderer';
import { ScaleManager } from '../utils/ScaleManager';

import fireSvgUrl from '../../../assets/elements/fire.svg';
import waterSvgUrl from '../../../assets/elements/water.svg';
import earthSvgUrl from '../../../assets/elements/earth.svg';
import airSvgUrl from '../../../assets/elements/air.svg';
import mixedSvgUrl from '../../../assets/elements/mixed.svg';
import noneSvgUrl from '../../../assets/elements/none.svg';

import starObjSvgUrl from '../../../assets/objects/star.svg';
import planetObjSvgUrl from '../../../assets/objects/planet.svg';
import moonObjSvgUrl from '../../../assets/objects/moon.svg';
import asteroidObjSvgUrl from '../../../assets/objects/asteroid.svg';
import stationObjSvgUrl from '../../../assets/objects/station.svg';
import cloudObjSvgUrl from '../../../assets/objects/cloud.svg';
import livingWorldObjSvgUrl from '../../../assets/objects/living_world.svg';
import customObjSvgUrl from '../../../assets/objects/custom.svg';

export class SpaceNavigationChartRenderer implements INavigationChartRenderer {
  readonly #colorBg = '#06070a';
  readonly #colorGrid = 'rgba(255, 255, 255, 0.03)';
  readonly #colorStroke = '#ffffff';
  readonly #colorMuted = '#888d9e';
  readonly #colorGold = '#e2b34a';

  #svgIcons: Record<string, HTMLImageElement> = {};
  #imagesLoaded = false;
  #loadCount = 0;
  readonly #totalImages = 14;
  #forceRedraw?: () => void;

  constructor(forceRedraw?: () => void) {
    this.#forceRedraw = forceRedraw;
    const onLoad = () => {
      this.#loadCount++;
      if (this.#loadCount >= this.#totalImages) {
        this.#imagesLoaded = true;
        this.#forceRedraw?.();
      }
    };

    const svgSources: Record<string, string> = {
      fire: fireSvgUrl,
      water: waterSvgUrl,
      earth: earthSvgUrl,
      air: airSvgUrl,
      mixed: mixedSvgUrl,
      none: noneSvgUrl,
      star: starObjSvgUrl,
      planet: planetObjSvgUrl,
      moon: moonObjSvgUrl,
      asteroid: asteroidObjSvgUrl,
      station: stationObjSvgUrl,
      cloud: cloudObjSvgUrl,
      living_world: livingWorldObjSvgUrl,
      custom: customObjSvgUrl
    };

    for (const [key, src] of Object.entries(svgSources)) {
      const img = new Image();
      img.src = src;
      img.onload = onLoad;
      img.onerror = onLoad; 
      this.#svgIcons[key] = img;
    }
  }

  drawBackground({ ctx, width, height }: MapStyleContext): void {
    ctx.fillStyle = this.#colorBg;
    ctx.fillRect(0, 0, width, height);
  }

  drawGrid({ ctx, width, height, activePan }: MapStyleContext): void {
    ctx.strokeStyle = this.#colorGrid;
    ctx.lineWidth = 1;
    const gridSize = 80;
    
    ctx.beginPath();
    for (let r = gridSize; r < Math.max(width, height); r += gridSize) {
      ctx.arc(activePan.x, activePan.y, r, 0, 2 * Math.PI);
    }
    ctx.stroke();

    ctx.beginPath();
    const spokes = 12;
    for (let i = 0; i < spokes; i++) {
      const rad = (i * 2 * Math.PI) / spokes;
      const x = Math.cos(rad) * Math.max(width, height);
      const y = Math.sin(rad) * Math.max(width, height);
      ctx.moveTo(activePan.x, activePan.y);
      ctx.lineTo(activePan.x + x, activePan.y + y);
    }
    ctx.stroke();

    // Subtle sun icon at origin
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const rad = (i * Math.PI) / 4;
      ctx.moveTo(activePan.x, activePan.y);
      ctx.lineTo(activePan.x + Math.cos(rad) * 15, activePan.y + Math.sin(rad) * 15);
    }
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  drawDecorations(): void {
    // No decorations in space mode
  }

  drawOrbits({ ctx, activeZoom, positions, project, isPrimary, activeSphere, isExport }: MapStyleContext, activeVisibleObjects: CelestialObject[]): void {
    activeVisibleObjects.forEach((obj) => {
      if (obj.type === 'constellation' || obj.type === 'note' || obj.type === 'legend') return;
      
      let px = 0;
      let py = 0;
      if (obj.orbitedObjectName && obj.orbitedObjectName !== obj.name) {
        const parentPos = positions[obj.orbitedObjectName];
        if (parentPos) {
          px = parentPos.x;
          py = parentPos.y;
        }
      }

      const parentProj = project(px, py);
      const orbitRadius = obj.distanceOrbited * activeZoom;

      if (orbitRadius > 0) {
        ctx.beginPath();
        const e = Math.min(Math.max(obj.orbitEccentricity || 0, 0), 0.99);
        const rotRad = ((obj.orbitRotation || 0) * Math.PI) / 180;
        
        if (e <= 0) {
          ctx.arc(parentProj.x, parentProj.y, orbitRadius, 0, 2 * Math.PI);
        } else {
          const c = orbitRadius * e;
          const cx = parentProj.x - c * Math.cos(rotRad);
          const cy = parentProj.y - c * Math.sin(rotRad);
          const b = orbitRadius * Math.sqrt(1 - e * e);
          ctx.ellipse(cx, cy, orbitRadius, b, rotRad, 0, 2 * Math.PI);
        }
        
        const exportScale = isExport ? 2.5 : 1.0;
        const isPrimaryOrbit = isPrimary(obj);
        ctx.lineWidth = (isPrimaryOrbit ? 1.5 : 1.0) * exportScale;
        
        const strength = activeSphere?.orbitalDrawStrength ?? 1.0;
        const dashLength = (isPrimaryOrbit ? 3 : 2) * exportScale;
        const gapLength = (isPrimaryOrbit ? 4 : 5) * exportScale;
        
        const baseAlpha = isPrimaryOrbit ? 0.15 : 0.3;
        const finalAlpha = Math.min(1.0, baseAlpha * strength);
        const rgb = isPrimaryOrbit ? '255, 255, 255' : '68, 128, 230';
        
        ctx.setLineDash([dashLength, gapLength]);
        ctx.strokeStyle = `rgba(${rgb}, ${finalAlpha})`;
        ctx.stroke();
        ctx.setLineDash([]);
      }
    });
  }

  drawShell({ ctx, activeSphere }: MapStyleContext, shellRadius: number, shellProj: { x: number; y: number }): void {
    ctx.beginPath();
    ctx.arc(shellProj.x, shellProj.y, Math.max(0, shellRadius), 0, 2 * Math.PI);
    ctx.strokeStyle = this.#colorStroke;
    ctx.lineWidth = 3;
    ctx.stroke();
    
    ctx.beginPath();
    ctx.arc(shellProj.x, shellProj.y, Math.max(0, shellRadius - 5), 0, 2 * Math.PI);
    ctx.lineWidth = 0.75;
    ctx.stroke();

    ctx.font = `bold 24px 'Elan', 'Cinzel', serif`;
    ctx.fillStyle = this.#colorStroke;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(
      (activeSphere?.sphereName || 'CRYSTAL SHELL').toUpperCase() + ' SHELL',
      shellProj.x,
      shellProj.y - shellRadius - 10
    );
  }

  drawBodies({ ctx, activeZoom, positions, project, activeSphere, isExport }: MapStyleContext, activeVisibleObjects: CelestialObject[]): void {
    const exportScale = isExport ? 2.5 : 1.0;
    
    activeVisibleObjects.forEach((obj) => {
      if (obj.type === 'note' || obj.type === 'legend') return;
      const pos = positions[obj.name];
      if (!pos) return;

      let px = 0, py = 0;
      if (obj.orbitedObjectName) {
        const parentPos = positions[obj.orbitedObjectName];
        if (parentPos) { px = parentPos.x; py = parentPos.y; }
      }
      const parentProj = project(px, py);
      const proj = project(pos.x, pos.y);
      const baseRenderSize = ScaleManager.getNavChartVisualRadius(obj.sizeClass || 'D', obj.physicalSize || 1000, obj.sizeUnit || 'miles', activeZoom);
      const isScalableType = ['planet', 'moon', 'asteroid', 'star'].includes(obj.type);
      const renderSize = Math.max(1, baseRenderSize + (isScalableType ? ((activeSphere?.navChartPlanetSizeOffset ?? 0) * exportScale) : 0));

      if (obj.type === 'cloud') {
        if (obj.distanceOrbited <= 0) return;
        const orbitR = obj.distanceOrbited * activeZoom;
        const cloudFill = getElementColor(obj.elementAffinity || null) || '#808080';
        
        drawSolidBody(ctx, proj.x, proj.y, obj, renderSize, cloudFill, '#505050', false, activeZoom,
          false, parentProj.x, parentProj.y, orbitR, pos.angle, undefined, undefined, undefined, isExport, exportScale
        );
      } else {
        const { bodyFill, bodyStroke } = getBodyColors(obj, false, this.#colorBg, this.#colorStroke, this.#colorGold);
        const orbitR = obj.distanceOrbited * activeZoom;
        drawSolidBody(ctx, proj.x, proj.y, obj, renderSize, bodyFill, bodyStroke, false, activeZoom,
          false, parentProj.x, parentProj.y, orbitR, pos.angle, undefined, undefined, undefined, isExport, exportScale
        );

        if (obj.isStationary && obj.type !== 'star' && obj.type !== 'constellation' && obj.type !== 'living_world') {
          drawStationaryIndicator(ctx, proj.x, proj.y, renderSize, this.#colorMuted);
        }
      }

      const shouldLabel = obj.type !== 'moon' || activeZoom > 150;
      if (shouldLabel) {
        const starFontSize = Math.round(16 * exportScale);
        const defaultFontSize = Math.round(14 * exportScale);
        
        ctx.font = obj.type === 'star'
          ? `bold ${starFontSize}px 'Elan', 'Cinzel', serif`
          : `500 ${defaultFontSize}px 'Elan', 'Outfit', sans-serif`;
        
        if (obj.type === 'constellation') {
          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          
          if (activeSphere?.navTitleStrike) {
            ctx.save();
            ctx.strokeStyle = this.#colorBg;
            ctx.lineWidth = starFontSize * 0.15;
            ctx.lineJoin = 'round';
            ctx.strokeText(obj.name, proj.x, proj.y);
            ctx.restore();
          }
          
          ctx.fillText(obj.name, proj.x, proj.y);
        } else {
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';
          const titleY = proj.y + renderSize + (5 * exportScale);
          const fontSize = obj.type === 'star' ? starFontSize : defaultFontSize;
          
          if (activeSphere?.navTitleStrike) {
            ctx.save();
            ctx.strokeStyle = this.#colorBg;
            ctx.lineWidth = fontSize * 0.15 + 1;
            ctx.lineJoin = 'round';
            ctx.strokeText(obj.name, proj.x, titleY);
            ctx.restore();
          }
          
          ctx.fillStyle = this.#colorStroke;
          ctx.fillText(obj.name, proj.x, titleY);
        }
      }
    });
  }

  drawScaleBar({ ctx, width, height, activeZoom }: MapStyleContext): void {
    const scaleBarWidth = 50;
    const auRepresented = scaleBarWidth / activeZoom;
    
    const padding = 20;
    const barX = width - padding - scaleBarWidth;
    const barY = height - padding;
    
    ctx.beginPath();
    ctx.moveTo(barX, barY - 5);
    ctx.lineTo(barX, barY);
    ctx.lineTo(barX + scaleBarWidth, barY);
    ctx.lineTo(barX + scaleBarWidth, barY - 5);
    
    ctx.strokeStyle = this.#colorStroke;
    ctx.lineWidth = 2;
    ctx.stroke();

    let scaleLabel = '';
    if (auRepresented >= 0.1) {
      scaleLabel = `${auRepresented.toFixed(2)} AU`;
    } else {
      const miles = Math.round(ScaleManager.auToMiles(auRepresented));
      scaleLabel = `${miles.toLocaleString()} mi`;
    }

    ctx.font = `500 10px 'Elan', 'Outfit', sans-serif`;
    ctx.fillStyle = this.#colorStroke;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(scaleLabel, barX + (scaleBarWidth / 2), barY - 8);
  }

  drawForeground(): void {
    // No foreground in space mode
  }

  #drawNotes({ ctx, activeZoom, project, selectedObjectIndex, objects }: MapStyleContext, visibleObjects: CelestialObject[]): void {
    const notes = visibleObjects.filter(o => o.type === 'note');
    if (notes.length === 0) return;

    ctx.save();
    notes.forEach(note => {
      const dist = note.noteDistanceAU || 0;
      const angle = note.noteAngle || 0;
      const rot = note.noteRotation || 0;
      const fontSize = note.noteFontSize || 16;
      const fontFamily = note.noteFontFamily || 'Elan';
      
      const rad = (angle * Math.PI) / 180;
      const x = Math.cos(rad) * dist;
      const y = Math.sin(rad) * dist;
      
      const proj = project(x, y);

      ctx.save();
      ctx.translate(proj.x, proj.y);
      ctx.rotate((rot * Math.PI) / 180);
      ctx.scale(activeZoom, activeZoom);

      ctx.font = `${fontSize}px '${fontFamily}', sans-serif`;
      ctx.fillStyle = '#ffffff'; // White for space mode
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      const corners = getNoteCorners(note);
      const tl = corners.tl;
      const tr = corners.tr;
      const bl = corners.bl;
      const br = corners.br;
      
      const lineHeight = fontSize * 1.2;
      const text = note.description || 'New Note';
      const paragraphs = text.split('\n');
      
      const lines: { text: string; x: number; y: number }[] = [];
      
      const minY = Math.min(tl.y, tr.y);
      const maxY = Math.max(bl.y, br.y);
      let currentY = minY + lineHeight / 2;
      
      const getBoundsAtY = (y: number) => {
         const leftX = tl.y === bl.y ? Math.min(tl.x, bl.x) : tl.x + (y - tl.y) * (bl.x - tl.x) / (bl.y - tl.y);
         const rightX = tr.y === br.y ? Math.max(tr.x, br.x) : tr.x + (y - tr.y) * (br.x - tr.x) / (br.y - tr.y);
         return { leftX, rightX };
      };

      paragraphs.forEach(paragraph => {
        const words = paragraph.split(' ');
        let currentLine = '';
        
        words.forEach(word => {
          if (currentY > maxY) return;
          
          const testLine = currentLine === '' ? word : currentLine + ' ' + word;
          const metrics = ctx.measureText(testLine);
          
          const { leftX, rightX } = getBoundsAtY(currentY);
          const availableWidth = rightX - leftX;
          
          if (metrics.width > availableWidth && currentLine !== '') {
            const prevBounds = getBoundsAtY(currentY);
            lines.push({ text: currentLine, x: (prevBounds.leftX + prevBounds.rightX) / 2, y: currentY });
            currentLine = word;
            currentY += lineHeight;
          } else {
            currentLine = testLine;
          }
        });
        if (currentLine !== '' && currentY <= maxY) {
          const { leftX, rightX } = getBoundsAtY(currentY);
          lines.push({ text: currentLine, x: (leftX + rightX) / 2, y: currentY });
          currentY += lineHeight;
        }
      });

      const isSelected = selectedObjectIndex !== null && objects[selectedObjectIndex]?.name === note.name;
      
      const drawPolyPath = () => {
        ctx.beginPath();
        ctx.moveTo(tl.x, tl.y);
        ctx.lineTo(tr.x, tr.y);
        ctx.lineTo(br.x, br.y);
        ctx.lineTo(bl.x, bl.y);
        ctx.closePath();
      };

      if (isSelected) {
        ctx.save();
        drawPolyPath();
        ctx.setLineDash([5 / activeZoom, 5 / activeZoom]);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1 / activeZoom;
        ctx.stroke();
        ctx.restore();
      }

      ctx.save();
      drawPolyPath();
      ctx.clip();

      lines.forEach((line) => {
        ctx.fillText(line.text, line.x, line.y);
      });
      ctx.restore();

      if (isSelected) {
         ctx.fillStyle = '#ffffff';
         const r = 5 / activeZoom;
         ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
         ctx.beginPath(); ctx.arc(tl.x, tl.y, r, 0, Math.PI * 2); ctx.fill();
         ctx.beginPath(); ctx.arc(tr.x, tr.y, r, 0, Math.PI * 2); ctx.fill();
         ctx.beginPath(); ctx.arc(bl.x, bl.y, r, 0, Math.PI * 2); ctx.fill();
         ctx.beginPath(); ctx.arc(br.x, br.y, r, 0, Math.PI * 2); ctx.fill();
         
         ctx.beginPath(); ctx.arc(tr.x + 20, tr.y - 20, r, 0, Math.PI * 2); ctx.fill();
         
         ctx.save();
         ctx.beginPath();
         ctx.moveTo(tr.x, tr.y);
         ctx.lineTo(tr.x + 20, tr.y - 20);
         ctx.strokeStyle = '#ffffff';
         ctx.lineWidth = 1 / activeZoom;
         ctx.setLineDash([2 / activeZoom, 2 / activeZoom]);
         ctx.stroke();
         ctx.restore();
      }

      ctx.restore();
    });
    ctx.restore();
  }

  #drawLegends({ ctx, activeZoom, project, selectedObjectIndex, objects }: MapStyleContext, visibleObjects: CelestialObject[]): void {
    if (!this.#imagesLoaded) return;
    const legends = visibleObjects.filter(o => o.type === 'legend');
    if (legends.length === 0) return;

    // Filter used attributes for partial legends
    const usedElements = new Set<string>();
    const usedTypes = new Set<string>();
    const usedOrbits = new Set<string>();
    objects.forEach(o => {
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
      ctx.scale(activeZoom * lScale, activeZoom * lScale);

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
      ctx.strokeStyle = this.#colorStroke;
      ctx.lineWidth = 1 / activeZoom;
      ctx.beginPath();
      ctx.roundRect(-boxWidth/2, -boxHeight/2, boxWidth, boxHeight, 5 / activeZoom);
      ctx.stroke();

      // Draw Title
      ctx.fillStyle = this.#colorStroke;
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
              const img = this.#svgIcons[item.key];
              if (img && img.complete && img.naturalWidth > 0) {
                  // White tint for space mode svg icons
                  ctx.save();
                  ctx.filter = 'brightness(0) invert(1)';
                  ctx.drawImage(img, startX, startY - iconSize/2, iconSize, iconSize);
                  ctx.restore();
              }
          } else if (item.type === 'draw') {
              ctx.save();
              ctx.translate(startX + iconSize/2, startY);
              const R = iconSize * 0.4;
              ctx.strokeStyle = this.#colorStroke;
              ctx.fillStyle = this.#colorStroke;
              ctx.lineWidth = 1.5 / activeZoom;
              
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
      const isSelected = selectedObjectIndex !== null && objects[selectedObjectIndex]?.name === legend.name;
      if (isSelected) {
          ctx.fillStyle = this.#colorStroke;
          ctx.beginPath();
          const r = 5 / (activeZoom * lScale);
          ctx.arc(0, 0, r, 0, Math.PI * 2);
          ctx.fill();
      }

      ctx.restore();
    });
    ctx.restore();
  }

  render(context: MapStyleContext): void {
    this.drawBackground(context);
    this.drawGrid(context);
    this.drawDecorations();
    this.drawOrbits(context, context.visibleObjects);

    let maxDist = 0.1;
    context.objects.forEach((o: any) => {
      if (!context.isPrimary(o) || o.affectsShellBoundary === false) return;
      const reach = ScaleManager.getPhysicalReachAU(o);
      if (reach > maxDist) maxDist = reach;
    });
    
    const shellProj = context.project(0, 0);
    const isCustom = context.activeSphere?.shellBoundaryType === 'custom' || context.activeSphere?.shellBoundaryType === 'relativeMargin';
    const shellScale = isCustom ? (context.activeSphere?.shellCustomScale ?? 1.2) : 2.0;
    const shellRadius = maxDist * shellScale * context.activeZoom;

    this.drawShell(context, shellRadius, shellProj);
    this.drawBodies(context, context.visibleObjects);
    this.#drawNotes(context, context.visibleObjects);
    this.#drawLegends(context, context.visibleObjects);
    
    const bounds = this.#getScrollBounds(context);
    this.#drawSystemDirectory(context, bounds);
    
    this.drawScaleBar(context);
    this.drawForeground();
  }

  #getScrollBounds(context: MapStyleContext): any {
    let maxDist = 0.1;
    context.objects.forEach((o: any) => {
      if (!context.isPrimary(o) || o.affectsShellBoundary === false) return;
      const reach = ScaleManager.getPhysicalReachAU(o);
      if (reach > maxDist) maxDist = reach;
    });
    const shellScale = (context.activeSphere?.shellBoundaryType === 'custom' || context.activeSphere?.shellBoundaryType === 'relativeMargin') 
      ? (context.activeSphere?.shellCustomScale ?? 1.2) : 2.0;
    const shellRadiusPx = maxDist * shellScale * context.activeZoom;
    
    const paddingPx = shellRadiusPx * 0.25;
    const directoryWidthPx = shellRadiusPx;
    
    const paperWidthPx = shellRadiusPx * 2 + paddingPx * 2 + directoryWidthPx;
    const paperHeightPx = shellRadiusPx * 2 + paddingPx * 2;
    
    const centerProj = context.project(0, 0);
    const originalLeft = centerProj.x - (shellRadiusPx * 2 + paddingPx * 2) / 2;
    
    return {
      x: originalLeft - directoryWidthPx,
      y: centerProj.y - paperHeightPx / 2,
      width: paperWidthPx,
      height: paperHeightPx,
      directoryWidthPx,
      shellRadiusPx,
      paddingPx
    };
  }

  #drawSystemDirectory(context: MapStyleContext, bounds: any): void {
    const { ctx, activeSphere, visibleObjects, currentSystemDate, project } = context;
    if (!this.#imagesLoaded) return;

    ctx.save();
    
    const z = bounds.shellRadiusPx / 800; 
    const dividerX = bounds.x + bounds.directoryWidthPx + bounds.paddingPx * 0.5;
    ctx.beginPath();
    ctx.moveTo(dividerX, bounds.y + bounds.paddingPx);
    ctx.lineTo(dividerX, bounds.y + bounds.height - bounds.paddingPx);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 4 * z;
    ctx.stroke();

    const startX = bounds.x + bounds.paddingPx;
    const shellProj = project(0, 0);
    let curY = shellProj.y - bounds.shellRadiusPx;

    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${48 * z}px 'Elan', 'Cinzel', serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText((activeSphere?.sphereName || 'CRYSTAL SPHERE').toUpperCase(), startX, curY);

    curY += 50 * z;
    ctx.font = `normal ${24 * z}px 'Elan', 'Outfit', sans-serif`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.fillText(`System Directory — Epoch: Day ${currentSystemDate}`, startX, curY);

    curY += 80 * z;

    const directoryObjects = visibleObjects.filter((o) => o.type !== 'moon' && o.type !== 'constellation' && o.type !== 'note' && o.type !== 'legend');
    
    directoryObjects.forEach((obj) => {
      if (curY > bounds.y + bounds.height - bounds.paddingPx) return;

      let orbitIconType = 'standard';
      if (obj.orbitedObjectName === null || obj.distanceOrbited === 0) {
        orbitIconType = 'central';
      } else if (obj.isStationary) {
        orbitIconType = 'fixed';
      } else if ((obj.orbitEccentricity || 0) > 0) {
        orbitIconType = 'elliptical';
      }

      const iconSize = 30 * z;
      const textOffsetX = 140 * z;

      ctx.save();
      ctx.translate(startX + 15 * z, curY + 15 * z);
      
      const R = iconSize / 2 - 2 * z;
      ctx.strokeStyle = '#ffffff';
      ctx.fillStyle = '#ffffff';
      ctx.lineWidth = 1.5 * z;

      ctx.beginPath();
      if (orbitIconType === 'central') {
        ctx.arc(0, 0, R, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, 0, R * 0.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (orbitIconType === 'standard') {
        ctx.arc(0, 0, R, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        const px = Math.cos(-Math.PI / 4) * R;
        const py = Math.sin(-Math.PI / 4) * R;
        ctx.arc(px, py, R * 0.6, 0, Math.PI * 2);
        ctx.fill();
      } else if (orbitIconType === 'elliptical') {
        ctx.ellipse(0, 0, R, R * 0.5, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        const px = Math.cos(-Math.PI / 4) * R;
        const py = Math.sin(-Math.PI / 4) * R * 0.5;
        ctx.arc(px, py, R * 0.6, 0, Math.PI * 2);
        ctx.fill();
      } else if (orbitIconType === 'fixed') {
        ctx.arc(0, 0, R, 0, Math.PI * 2);
        ctx.stroke();
        const px = Math.cos(-Math.PI / 4) * R;
        const py = Math.sin(-Math.PI / 4) * R;
        ctx.translate(px, py);
        ctx.rotate(-Math.PI / 4);
        ctx.fillRect(-R * 0.6, -R * 0.2, R * 1.2, R * 0.4);
      }
      ctx.restore();

      const elemIconName = obj.elementAffinity || 'none';
      const elemIcon = this.#svgIcons[elemIconName];
      if (elemIcon && elemIcon.complete && elemIcon.naturalWidth > 0) {
        ctx.save();
        ctx.translate(startX + 55 * z, curY + 15 * z);
        ctx.filter = 'brightness(0) invert(1)';
        ctx.drawImage(elemIcon, -iconSize / 2, -iconSize / 2, iconSize, iconSize);
        ctx.restore();
      }

      const typeIconName = obj.type || 'custom';
      const typeIcon = this.#svgIcons[typeIconName];
      if (typeIcon && typeIcon.complete && typeIcon.naturalWidth > 0) {
        ctx.save();
        ctx.translate(startX + 100 * z, curY + 15 * z);
        ctx.filter = 'brightness(0) invert(1)';
        ctx.drawImage(typeIcon, -iconSize / 2, -iconSize / 2, iconSize, iconSize);
        ctx.restore();
      }

      ctx.fillStyle = '#ffffff';
      ctx.font = `500 ${28 * z}px 'Elan', 'Outfit', sans-serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(obj.name.toUpperCase(), startX + textOffsetX, curY + 15 * z);

      curY += 60 * z;
    });

    ctx.restore();
  }
}
