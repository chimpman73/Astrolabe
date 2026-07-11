import { MapStyleContext, INavigationChartRenderer } from '../../types/renderer';
import { CelestialObject } from '../../types/astrolabe';
import { getNoteCorners } from '../utils/noteInteractions';
import { drawSolidBody, drawStationaryIndicator, getBodyColors, getElementColor } from '../utils/canvasRenderer';
import { ScaleManager } from '../utils/ScaleManager';

export class SpaceNavigationChartRenderer implements INavigationChartRenderer {
  readonly #colorBg = '#06070a';
  readonly #colorGrid = 'rgba(255, 255, 255, 0.03)';
  readonly #colorStroke = '#ffffff';
  readonly #colorMuted = '#888d9e';
  readonly #colorGold = '#e2b34a';

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
      if (obj.type === 'constellation' || obj.type === 'note') return;
      
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
      if (obj.type === 'note') return;
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
          true, parentProj.x, parentProj.y, orbitR, pos.angle
        );
      } else {
        const { bodyFill, bodyStroke } = getBodyColors(obj, false, this.#colorBg, this.#colorStroke, this.#colorGold);
        const orbitR = obj.distanceOrbited * activeZoom;
        drawSolidBody(ctx, proj.x, proj.y, obj, renderSize, bodyFill, bodyStroke, false, activeZoom,
          true, parentProj.x, parentProj.y, orbitR, pos.angle
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
    this.drawScaleBar(context);
    this.drawForeground();
  }
}
