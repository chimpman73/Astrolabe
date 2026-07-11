import { ParchmentDecoration, MapStyleContext, INavigationChartRenderer } from '../../types/renderer';
import { CelestialObject } from '../../types/astrolabe';
import { getNoteCorners } from '../utils/noteInteractions';
import { drawSolidBody, drawStationaryIndicator, getBodyColors, getElementColor } from '../utils/canvasRenderer';
import { ScaleManager } from '../utils/ScaleManager';
import { calculateSystemPositions } from '../utils/orbitMath';

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

export class VellumNavigationChartRenderer implements INavigationChartRenderer {
  readonly #colorBg = '#f9f5e8';
  readonly #colorVellumAverage = '#e0caa6'; // Accurately sampled average color of parchment.jpg
  readonly #colorGrid = 'rgba(94, 79, 60, 0.05)';
  readonly #colorStroke = '#2b2316';
  readonly #colorMuted = '#7c694e';
  readonly #colorGold = '#b58315';

  #bgPattern: CanvasPattern | null = null;
  #woodPattern: CanvasPattern | null = null;
  #bgImage = new Image();
  #woodDeskImage = new Image();
  #stainInk = new Image();
  #stainCoffee = new Image();
  #stainBurn = new Image();
  
  // Icons
  #svgIcons: Record<string, HTMLImageElement> = {};

  #imagesLoaded = false;
  #loadCount = 0;
  readonly #totalImages = 5 + 6 + 8;
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

    this.#bgImage.src = '/images/vellum_bg.png';
    this.#bgImage.onload = onLoad;

    this.#woodDeskImage.src = '/images/wood_desk.png';
    this.#woodDeskImage.onload = onLoad;

    this.#stainInk.src = '/images/stain_ink.png';
    this.#stainInk.onload = onLoad;

    this.#stainCoffee.src = '/images/stain_coffee.png';
    this.#stainCoffee.onload = onLoad;

    this.#stainBurn.src = '/images/stain_burn.png';
    this.#stainBurn.onload = onLoad;

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

  #getScrollBounds(context: MapStyleContext) {
    let maxDist = 0.1;
    context.objects.forEach((o: any) => {
      if (!context.isPrimary(o) || o.affectsShellBoundary === false) return;
      const reach = ScaleManager.getPhysicalReachAU(o);
      if (reach > maxDist) maxDist = reach;
    });
    const shellScale = (context.activeSphere?.shellBoundaryType === 'custom' || context.activeSphere?.shellBoundaryType === 'relativeMargin') 
      ? (context.activeSphere?.shellCustomScale ?? 1.2) : 2.0;
    const shellRadiusPx = maxDist * shellScale * context.activeZoom;
    
    // 25% padding ensures the 24px title has room to breathe horizontally
    const paddingPx = shellRadiusPx * 0.25;
    
    // Extend directory to the left by 1.0 * shellRadiusPx (which is 0.5 * diameter)
    const directoryWidthPx = shellRadiusPx;
    
    const paperWidthPx = shellRadiusPx * 2 + paddingPx * 2 + directoryWidthPx;
    const paperHeightPx = shellRadiusPx * 2 + paddingPx * 2;
    
    const centerProj = context.project(0, 0);
    
    // Center was previously `centerProj.x - (shellRadiusPx * 2 + paddingPx * 2) / 2`. 
    // Now we shift left by the directory width.
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

  drawBackground(context: MapStyleContext): void {
    const { ctx, width, height } = context;
    // 1. Clear the entire canvas to transparent
    ctx.clearRect(0, 0, width, height);

    if (!this.#imagesLoaded || !this.#bgImage.complete || !this.#woodDeskImage.complete) {
      return;
    }

    if (!this.#bgPattern) {
      this.#bgPattern = ctx.createPattern(this.#bgImage, 'repeat');
    }
    if (!this.#woodPattern) {
      this.#woodPattern = ctx.createPattern(this.#woodDeskImage, 'repeat');
    }

    const bounds = this.#getScrollBounds(context);

    ctx.save();
    
    if (!context.isExport) {
      // Drop shadow for the paper
      ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
      ctx.shadowBlur = 30;
      ctx.shadowOffsetX = 10;
      ctx.shadowOffsetY = 15;
    }

    // Draw the main parchment paper body
    ctx.beginPath();
    if (context.isExport) {
      ctx.rect(bounds.x, bounds.y, bounds.width, bounds.height);
    } else {
      ctx.roundRect(bounds.x, bounds.y, bounds.width, bounds.height, 10);
    }
    
    if (this.#bgPattern) {
      ctx.fillStyle = this.#bgPattern;
    } else {
      ctx.fillStyle = this.#colorBg;
    }
    
    ctx.fill();
    ctx.shadowColor = 'transparent'; // Turn off shadow for remaining items

    if (!context.isExport) {
      // Draw the wooden rolled rods on left and right
      const rodWidth = Math.max(30, bounds.width * 0.03); // rod width scales slightly with paper size
      
      // Left rod
    const leftRodGradient = ctx.createLinearGradient(bounds.x - rodWidth, 0, bounds.x, 0);
    leftRodGradient.addColorStop(0, '#2e1909');
    leftRodGradient.addColorStop(0.3, '#5c3314');
    leftRodGradient.addColorStop(0.7, '#784824');
    leftRodGradient.addColorStop(1, '#241205');
    
    ctx.fillStyle = leftRodGradient;
    ctx.beginPath();
    ctx.roundRect(bounds.x - rodWidth, bounds.y - 10, rodWidth, bounds.height + 20, 5);
    ctx.fill();

    // Right rod
    const rightRodGradient = ctx.createLinearGradient(bounds.x + bounds.width, 0, bounds.x + bounds.width + rodWidth, 0);
    rightRodGradient.addColorStop(0, '#241205');
    rightRodGradient.addColorStop(0.3, '#784824');
    rightRodGradient.addColorStop(0.7, '#5c3314');
    rightRodGradient.addColorStop(1, '#2e1909');
    
      ctx.fillStyle = rightRodGradient;
      ctx.beginPath();
      ctx.roundRect(bounds.x + bounds.width, bounds.y - 10, rodWidth, bounds.height + 20, 5);
      ctx.fill();
    }

    ctx.restore();
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
  }

  drawDecorations({ ctx, activeZoom, project, decorations }: MapStyleContext): void {
    if (!this.#imagesLoaded || !decorations) return;

    ctx.save();
    // Multiply blend mode simulates ink/coffee soaking into parchment
    // and naturally drops out white backgrounds
    ctx.globalCompositeOperation = 'multiply';

    decorations.forEach((dec: ParchmentDecoration) => {
      const proj = project(dec.x, dec.y);
      let img: HTMLImageElement | null = null;
      if (dec.type === 'ink') img = this.#stainInk;
      if (dec.type === 'coffee') img = this.#stainCoffee;
      if (dec.type === 'burn') img = this.#stainBurn;

      if (img && img.complete) {
        ctx.save();
        ctx.translate(proj.x, proj.y);
        ctx.rotate(dec.rotation);
        const imgScale = dec.scale * (activeZoom / 100);
        ctx.scale(imgScale, imgScale);
        ctx.globalAlpha = dec.opacity;
        
        if (dec.type === 'burn') {
          // Draw the charred edges using multiply so the white background disappears
          ctx.globalCompositeOperation = 'multiply';
          ctx.drawImage(img, -img.width / 2, -img.height / 2);
          
          // Now punch the hole in the parchment and the stain
          ctx.globalCompositeOperation = 'destination-out';
          ctx.beginPath();
          // Create a soft radial mask for the hole
          const holeGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, img.width * 0.25);
          holeGrad.addColorStop(0, 'rgba(0,0,0,1)');
          holeGrad.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = holeGrad;
          ctx.arc(0, 0, img.width * 0.25, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Regular stains (ink, coffee) just use multiply
          ctx.globalCompositeOperation = 'multiply';
          ctx.drawImage(img, -img.width / 2, -img.height / 2);
        }
        
        ctx.restore();
      }
    });

    ctx.restore();
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
        
        const baseAlpha = isPrimaryOrbit ? 0.18 : 0.25;
        const finalAlpha = Math.min(1.0, baseAlpha * strength);
        const rgb = isPrimaryOrbit ? '94, 79, 60' : '143, 50, 36';
        
        ctx.setLineDash([dashLength, gapLength]);
        ctx.strokeStyle = `rgba(${rgb}, ${finalAlpha})`;
        ctx.stroke();
        ctx.setLineDash([]);
      }
    });
  }

  drawShell({ ctx, activeSphere }: MapStyleContext, shellRadius: number, shellProj: { x: number; y: number }): void {
    ctx.save();
    
    // "Burned" effect for the shell boundary
    ctx.shadowColor = 'rgba(43, 20, 10, 0.8)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    ctx.beginPath();
    ctx.arc(shellProj.x, shellProj.y, Math.max(0, shellRadius), 0, 2 * Math.PI);
    ctx.strokeStyle = '#382013'; // Very dark brown char color
    ctx.lineWidth = 4;
    ctx.stroke();
    
    ctx.shadowBlur = 0; // Turn off shadow for inner ring
    ctx.beginPath();
    ctx.arc(shellProj.x, shellProj.y, Math.max(0, shellRadius - 5), 0, 2 * Math.PI);
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#5c3a21'; // Lighter singe
    ctx.stroke();

    ctx.restore();

    ctx.font = `bold 24px 'Elan', 'Cinzel', serif`;
    ctx.fillStyle = this.#colorStroke;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(
      (activeSphere?.sphereName || 'CRYSTAL SHELL').toUpperCase() + ' SHELL',
      shellProj.x,
      shellProj.y - shellRadius - 15
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
          false, parentProj.x, parentProj.y, orbitR, pos.angle
        );
      } else {
        const { bodyFill, bodyStroke } = getBodyColors(obj, true, this.#colorBg, this.#colorStroke, this.#colorGold);
        const orbitR = obj.distanceOrbited * activeZoom;
        drawSolidBody(ctx, proj.x, proj.y, obj, renderSize, bodyFill, bodyStroke, false, activeZoom,
          false, parentProj.x, parentProj.y, orbitR, pos.angle
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
            ctx.strokeStyle = this.#colorVellumAverage;
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
            ctx.strokeStyle = this.#colorVellumAverage;
            ctx.lineWidth = fontSize * 0.15 + 1; // slightly thicker than standard to ensure legibility
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

  drawForeground({ ctx, width, height, isExport }: MapStyleContext): void {
    if (isExport) return;
    if (!this.#imagesLoaded || !this.#woodDeskImage.complete) return;

    ctx.save();
    // destination-over draws behind existing canvas content
    ctx.globalCompositeOperation = 'destination-over';
    
    if (this.#woodPattern) {
      ctx.fillStyle = this.#woodPattern;
      ctx.fillRect(0, 0, width, height);
    }
    
    ctx.restore();
  }

  render(context: MapStyleContext): void {
    this.drawBackground(context);
    this.drawGrid(context);
    this.drawDecorations(context);
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
    
    const bounds = this.#getScrollBounds(context);
    this.#drawSystemDirectory(context, bounds);
    
    this.drawScaleBar(context);
    this.drawForeground(context);
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
      ctx.fillStyle = this.#colorStroke;
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
        ctx.strokeStyle = this.#colorStroke;
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
         ctx.fillStyle = this.#colorStroke;
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
         ctx.strokeStyle = this.#colorStroke;
         ctx.lineWidth = 1 / activeZoom;
         ctx.setLineDash([2 / activeZoom, 2 / activeZoom]);
         ctx.stroke();
         ctx.restore();
      }

      ctx.restore();
    });
    ctx.restore();
  }

  #drawSystemDirectory(context: MapStyleContext, bounds: any): void {
    const { ctx, activeSphere, visibleObjects, currentSystemDate, project } = context;
    if (!this.#imagesLoaded) return;

    ctx.save();
    
    // Base zoom multiplier for text. 
    // This makes the text scale perfectly with the directory width (which is 1x shellRadiusPx).
    // A value of 800 means if the column is 400px wide, 'z' is 0.5 (Title: 24px, Name: 16px)
    const z = bounds.shellRadiusPx / 800; 

    // Draw divider line
    const dividerX = bounds.x + bounds.directoryWidthPx + bounds.paddingPx * 0.5;
    ctx.beginPath();
    ctx.moveTo(dividerX, bounds.y + bounds.paddingPx);
    ctx.lineTo(dividerX, bounds.y + bounds.height - bounds.paddingPx);
    ctx.strokeStyle = '#c8b185';
    ctx.lineWidth = 4 * z;
    ctx.stroke();

    // Render Directory Header
    const startX = bounds.x + bounds.paddingPx;
    
    const shellProj = project(0, 0);
    // Start at the exact same height as the crystal shell
    let curY = shellProj.y - bounds.shellRadiusPx;

    ctx.fillStyle = this.#colorStroke;
    ctx.font = `bold ${48 * z}px 'Elan', 'Cinzel', serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top'; // use top so it precisely aligns with the shell's top edge
    ctx.fillText((activeSphere?.sphereName || 'CRYSTAL SPHERE').toUpperCase(), startX, curY);

    curY += 50 * z;
    ctx.font = `normal ${24 * z}px 'Elan', 'Outfit', sans-serif`;
    ctx.fillStyle = '#5e4f3c';
    ctx.fillText(`System Directory — Epoch: Day ${currentSystemDate}`, startX, curY);

    curY += 80 * z;

    // Render primary planets (no moons, constellations, or notes)
    const directoryObjects = visibleObjects.filter((o) => o.type !== 'moon' && o.type !== 'constellation' && o.type !== 'note');
    
    directoryObjects.forEach((obj) => {
      if (curY > bounds.y + bounds.height - bounds.paddingPx) return; // Bounds limit

      // Determine Orbital Symbol
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

      // Draw Orbit Icon manually via Canvas
      ctx.save();
      ctx.translate(startX + 15 * z, curY + 15 * z);
      
      const R = iconSize / 2 - 2 * z;
      ctx.strokeStyle = this.#colorStroke;
      ctx.fillStyle = this.#colorStroke;
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
        ctx.arc(px, py, R * 0.6, 0, Math.PI * 2); // Increased planet size
        ctx.fill();
      } else if (orbitIconType === 'elliptical') {
        ctx.ellipse(0, 0, R, R * 0.5, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        const px = Math.cos(-Math.PI / 4) * R;
        const py = Math.sin(-Math.PI / 4) * R * 0.5;
        ctx.arc(px, py, R * 0.6, 0, Math.PI * 2); // Increased planet size
        ctx.fill();
      } else if (orbitIconType === 'fixed') {
        ctx.arc(0, 0, R, 0, Math.PI * 2);
        ctx.stroke();
        const px = Math.cos(-Math.PI / 4) * R;
        const py = Math.sin(-Math.PI / 4) * R;
        ctx.translate(px, py);
        ctx.rotate(-Math.PI / 4); // Rotate to point radially outward
        ctx.fillRect(-R * 0.6, -R * 0.2, R * 1.2, R * 0.4); // Rectangular hash
      }
      ctx.restore();

      // Draw Element Icon
      const elemIconName = obj.elementAffinity || 'none';
      const elemIcon = this.#svgIcons[elemIconName];
      if (elemIcon && elemIcon.complete && elemIcon.naturalWidth > 0) {
        ctx.save();
        ctx.translate(startX + 55 * z, curY + 15 * z);
        ctx.drawImage(elemIcon, -iconSize / 2, -iconSize / 2, iconSize, iconSize);
        ctx.restore();
      }

      // Draw Object Type Icon
      const typeIconName = obj.type || 'custom';
      const typeIcon = this.#svgIcons[typeIconName];
      if (typeIcon && typeIcon.complete && typeIcon.naturalWidth > 0) {
        ctx.save();
        ctx.translate(startX + 95 * z, curY + 15 * z);
        ctx.drawImage(typeIcon, -iconSize / 2, -iconSize / 2, iconSize, iconSize);
        ctx.restore();
      }

      // Draw details
      ctx.fillStyle = this.#colorStroke;
      ctx.font = `bold ${32 * z}px 'Elan', 'Cinzel', serif`;
      ctx.fillText(obj.name, startX + textOffsetX, curY);

      curY += 35 * z;
      ctx.font = `italic ${20 * z}px 'Elan', 'Outfit', sans-serif`;
      ctx.fillStyle = '#5e4f3c';
      
      const period = calculateSystemPositions([obj], 0)[obj.name]?.period || 0;
      ctx.fillText(
        `Dist: ${obj.distanceOrbited.toFixed(2)} AU | Period: ${Math.round(period)} Days`,
        startX + textOffsetX,
        curY
      );

      curY += 60 * z; // Spacing for next item
    });

    ctx.restore();
  }
}
