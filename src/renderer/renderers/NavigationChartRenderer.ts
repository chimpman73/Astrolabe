import { ParchmentDecoration, MapStyleContext, INavigationChartRenderer, NavigationChartStyleConfig } from '../../types/renderer';
import { CelestialObject } from '../../types/astrolabe';
import { drawSolidBody, drawStationaryIndicator, getBodyColors } from '../utils/canvasRenderer';
import { ScaleManager } from '../utils/ScaleManager';
import { NoteRenderer } from './subrenderers/NoteRenderer';
import { LegendRenderer } from './subrenderers/LegendRenderer';
import { SystemDirectoryRenderer } from './subrenderers/SystemDirectoryRenderer';

export class NavigationChartRenderer implements INavigationChartRenderer {
  #config: NavigationChartStyleConfig;

  #bgPattern: CanvasPattern | null = null;
  #woodPattern: CanvasPattern | null = null;
  #bgImage = new Image();
  #woodDeskImage = new Image();
  #stainInk = new Image();
  #stainCoffee = new Image();
  #stainBurn = new Image();
  
  // Icons
  #svgIcons: Record<string, HTMLImageElement> = {};
  #tintedSvgIcons: Record<string, HTMLCanvasElement> = {};

  #imagesLoaded = false;
  #loadCount = 0;
  #totalImages = 0;
  #forceRedraw?: () => void;

  constructor(config: NavigationChartStyleConfig, forceRedraw?: () => void) {
    this.#config = config;
    this.#forceRedraw = forceRedraw;
    
    const onLoad = () => {
      this.#loadCount++;
      if (this.#loadCount >= this.#totalImages) {
        this.#imagesLoaded = true;
        this.#prepareTintedIcons();
        this.#forceRedraw?.();
      }
    };

    const imagesToLoad: { img: HTMLImageElement, src: string }[] = [];

    if (this.#config.backgroundImageUrl) {
      imagesToLoad.push({ img: this.#bgImage, src: this.#config.backgroundImageUrl });
    }
    if (this.#config.foregroundImageUrl) {
      imagesToLoad.push({ img: this.#woodDeskImage, src: this.#config.foregroundImageUrl });
    }
    if (this.#config.assets.decorations) {
      imagesToLoad.push({ img: this.#stainInk, src: this.#config.assets.decorations.ink });
      imagesToLoad.push({ img: this.#stainCoffee, src: this.#config.assets.decorations.coffee });
      imagesToLoad.push({ img: this.#stainBurn, src: this.#config.assets.decorations.burn });
    }

    const svgSources: Record<string, string> = {
      ...this.#config.assets.elements,
      ...this.#config.assets.objects
    };

    for (const [key, src] of Object.entries(svgSources)) {
      const img = new Image();
      this.#svgIcons[key] = img;
      imagesToLoad.push({ img, src });
    }

    this.#totalImages = imagesToLoad.length;
    
    if (this.#totalImages === 0) {
      this.#imagesLoaded = true;
    } else {
      imagesToLoad.forEach(({ img, src }) => {
        img.onload = onLoad;
        img.onerror = onLoad;
        img.src = src;
      });
    }
  }

  #prepareTintedIcons() {
    if (!this.#config.directoryIconColor) return;
    
    for (const [key, img] of Object.entries(this.#svgIcons)) {
      if (!img.complete || img.naturalWidth === 0) continue;
      
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) continue;
      
      ctx.drawImage(img, 0, 0);
      ctx.globalCompositeOperation = 'source-in';
      ctx.fillStyle = this.#config.directoryIconColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      this.#tintedSvgIcons[key] = canvas;
    }
  }

  #getIcon(key: string): HTMLImageElement | HTMLCanvasElement | undefined {
    if (this.#config.directoryIconColor && this.#tintedSvgIcons[key]) {
      return this.#tintedSvgIcons[key];
    }
    return this.#svgIcons[key];
  }

      #getScrollBounds(context: MapStyleContext) {
    let maxDist = 0.1;
    context.objects.forEach((o: any) => {
      if (o.type === 'note' || o.type === 'legend' || o.type === 'constellation') return;
      if (!context.isPrimary(o) || o.affectsShellBoundary === false) return;
      const reach = ScaleManager.getPhysicalReachAU(o);
      if (reach > maxDist) maxDist = reach;
    });
    const shellScale = (context.activeSphere?.shellBoundaryType === 'custom' || 
context.activeSphere?.shellBoundaryType === 'relativeMargin') 
      ? (context.activeSphere?.shellCustomScale ?? 1.2) : 2.0;
    const shellRadiusPx = maxDist * shellScale * context.activeZoom;
    
    const centerProj = context.project(0, 0);

    const topMargin = (shellRadiusPx * 1.15) + 20;
    const rightMargin = (shellRadiusPx * 1.375) - 10;
    const leftMargin = shellRadiusPx * 2.184;

    const directoryStartX = centerProj.x - leftMargin + 20;
    const directoryWidthPx = leftMargin - shellRadiusPx - 20;

    return {
      x: centerProj.x - leftMargin,
      y: centerProj.y - topMargin,
      width: leftMargin + rightMargin,
      height: topMargin * 2,
      directoryStartX,
      directoryWidthPx,
      shellRadiusPx,
      parchmentRadiusPx: shellRadiusPx,
      paddingPx: 0
    };
  }

  drawBackground(context: MapStyleContext): void {
    const { ctx, width, height } = context;
    // 1. Clear the entire canvas to transparent
    ctx.clearRect(0, 0, width, height);

    if (!this.#imagesLoaded || !this.#bgImage.complete || !this.#woodDeskImage.complete) {
      return;
    }

    if (!this.#bgPattern && this.#config.backgroundImageUrl) {
      this.#bgPattern = ctx.createPattern(this.#bgImage, 'repeat');
    }
    if (!this.#woodPattern && this.#config.foregroundImageUrl) {
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
      ctx.fillStyle = this.#config.backgroundColor;
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
    ctx.strokeStyle = this.#config.gridColor;
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
    if (!this.#imagesLoaded || !decorations || !this.#config.hasDecorations) return;

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
    activeVisibleObjects.forEach((obj: any) => {
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
      const orbitRadius = (obj.distanceOrbited || 0) * activeZoom;

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
        
        const baseAlpha = isPrimaryOrbit ? this.#config.primaryOrbitAlpha : this.#config.secondaryOrbitAlpha;
        const finalAlpha = Math.min(1.0, baseAlpha * strength);
        const rgb = isPrimaryOrbit ? this.#config.primaryOrbitRgb : this.#config.secondaryOrbitRgb;
        
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
    if (this.#config.shellShadowColor) {
      ctx.shadowColor = this.#config.shellShadowColor;
      ctx.shadowBlur = 10;
    } else {
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
    }
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    ctx.beginPath();
    ctx.arc(shellProj.x, shellProj.y, Math.max(0, shellRadius), 0, 2 * Math.PI);
    ctx.strokeStyle = this.#config.shellStrokeColor;
    ctx.lineWidth = 4;
    ctx.stroke();
    
    ctx.shadowBlur = 0; // Turn off shadow for inner ring
    ctx.beginPath();
    ctx.arc(shellProj.x, shellProj.y, Math.max(0, shellRadius - 5), 0, 2 * Math.PI);
    ctx.lineWidth = 1;
    ctx.strokeStyle = this.#config.shellInnerStrokeColor;
    ctx.stroke();

    ctx.restore();

    const fontSize = shellRadius * 0.058;
    const offset = shellRadius * 0.04;
    
    ctx.font = `bold ${fontSize}px ${this.#config.titleFontFamily}`;
    ctx.fillStyle = this.#config.strokeColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(
      (activeSphere?.sphereName || 'CRYSTAL SHELL').toUpperCase() + ' SHELL',
      shellProj.x,
      shellProj.y - shellRadius - offset
    );
  }

  drawBodies({ ctx, activeZoom, positions, project, activeSphere, isExport }: MapStyleContext, activeVisibleObjects: CelestialObject[]): void {
    const exportScale = isExport ? 2.5 : 1.0;
    
    // Calculate system reach for relative sizing of constellations
    let maxDist = 0.1;
    activeVisibleObjects.forEach((o: any) => {
      if (o.type === 'note' || o.type === 'legend' || o.type === 'constellation') return;
      const reach = ScaleManager.getPhysicalReachAU(o);
      if (reach > maxDist) maxDist = reach;
    });
    
    activeVisibleObjects.forEach((obj: any) => {
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
      
      let renderSize = 1;
      if (obj.type === 'constellation') {
         renderSize = maxDist * activeZoom;
      } else {
         const baseRenderSize = ScaleManager.getNavChartVisualRadius(obj.sizeClass || 'D', obj.physicalSize || 1000, obj.sizeUnit || 'miles', activeZoom);
         const isScalableType = ['planet', 'moon', 'asteroid', 'star'].includes(obj.type);
         renderSize = Math.max(1, baseRenderSize + (isScalableType ? ((activeSphere?.navChartPlanetSizeOffset ?? 0) * exportScale) : 0));
      }

      if (obj.type === 'cloud') {
        if ((obj.distanceOrbited || 0) <= 0) return;
        const { bodyFill, bodyStroke } = getBodyColors(obj, !this.#config.isDarkTheme, this.#config.backgroundColor, this.#config.strokeColor, this.#config.goldColor);
        const orbitR = (obj.distanceOrbited || 0) * activeZoom;
        
        drawSolidBody(ctx, proj.x, proj.y, obj, renderSize, bodyFill, bodyStroke, false, activeZoom,
          false, parentProj.x, parentProj.y, orbitR, pos.angle, undefined, undefined, undefined, isExport, exportScale
        );
      } else {
        const { bodyFill, bodyStroke } = getBodyColors(obj, !this.#config.isDarkTheme, this.#config.backgroundColor, this.#config.strokeColor, this.#config.goldColor);
        const orbitR = (obj.distanceOrbited || 0) * activeZoom;
        drawSolidBody(ctx, proj.x, proj.y, obj, renderSize, bodyFill, bodyStroke, false, activeZoom,
          false, parentProj.x, parentProj.y, orbitR, pos.angle, undefined, undefined, undefined, isExport, exportScale
        );

        if (obj.isStationary && obj.type !== 'star' && obj.type !== 'constellation' && obj.type !== 'living_world') {
          drawStationaryIndicator(ctx, proj.x, proj.y, renderSize, this.#config.mutedColor);
        }
      }
    });
  }

  #drawLabels({ ctx, activeZoom, positions, project, activeSphere, isExport }: MapStyleContext, activeVisibleObjects: CelestialObject[]): void {
    const exportScale = isExport ? 2.5 : 1.0;
    
    // Calculate system reach for relative sizing of constellations
    let maxDist = 0.1;
    activeVisibleObjects.forEach((o: any) => {
      if (o.type === 'note' || o.type === 'legend' || o.type === 'constellation') return;
      const reach = ScaleManager.getPhysicalReachAU(o);
      if (reach > maxDist) maxDist = reach;
    });

    activeVisibleObjects.forEach((obj: any) => {
      if (obj.type === 'note' || obj.type === 'legend') return;
      const pos = positions[obj.name];
      if (!pos) return;

      const proj = project(pos.x, pos.y);
      
      let renderSize = 1;
      if (obj.type === 'constellation') {
         renderSize = maxDist * activeZoom;
      } else {
         const baseRenderSize = ScaleManager.getNavChartVisualRadius(obj.sizeClass || 'D', obj.physicalSize || 1000, obj.sizeUnit || 'miles', activeZoom);
         const isScalableType = ['planet', 'moon', 'asteroid', 'star'].includes(obj.type);
         renderSize = Math.max(1, baseRenderSize + (isScalableType ? ((activeSphere?.navChartPlanetSizeOffset ?? 0) * exportScale) : 0));
      }

      const shouldLabel = obj.type !== 'moon' || activeZoom > 150;
      if (shouldLabel) {
        const starFontSize = Math.round(16 * exportScale);
        const defaultFontSize = Math.round(14 * exportScale);
        
        ctx.font = obj.type === 'star'
          ? `bold ${starFontSize}px ${this.#config.starFontFamily}`
          : `500 ${defaultFontSize}px ${this.#config.defaultFontFamily}`;
        
        if (obj.type === 'constellation') {
          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          
          if (activeSphere?.navTitleStrike) {
            ctx.save();
            ctx.strokeStyle = (this.#config.titleStrikeColor || '#e0caa6');
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
            ctx.strokeStyle = (this.#config.titleStrikeColor || '#e0caa6');
            ctx.lineWidth = fontSize * 0.15 + 1; // slightly thicker than standard to ensure legibility
            ctx.lineJoin = 'round';
            ctx.strokeText(obj.name, proj.x, titleY);
            ctx.restore();
          }
          
          ctx.fillStyle = this.#config.strokeColor;
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
    
    ctx.strokeStyle = this.#config.strokeColor;
    ctx.lineWidth = 2;
    ctx.stroke();

    let scaleLabel = '';
    if (auRepresented >= 0.1) {
      scaleLabel = `${auRepresented.toFixed(2)} AU`;
    } else {
      const miles = Math.round(ScaleManager.auToMiles(auRepresented));
      scaleLabel = `${miles.toLocaleString()} mi`;
    }

    ctx.font = `500 10px ${this.#config.defaultFontFamily}`;
    ctx.fillStyle = this.#config.strokeColor;
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
      if (o.type === 'note' || o.type === 'legend' || o.type === 'constellation') return;
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
    this.#drawLabels(context, context.visibleObjects);
    this.#drawNotes(context, context.visibleObjects);
    this.#drawLegends(context, context.visibleObjects);
    
    const bounds = this.#getScrollBounds(context);
    this.#drawSystemDirectory(context, bounds);
    
    this.drawScaleBar(context);
    this.drawForeground(context);
  }

  #drawNotes(context: MapStyleContext, visibleObjects: any[]): void {
    NoteRenderer.draw(context, visibleObjects, this.#config);
  }

  #drawLegends(context: MapStyleContext, visibleObjects: any[]): void {
    LegendRenderer.draw(context, visibleObjects, this.#config, (name) => this.#getIcon(name) ?? null);
  }

  #drawSystemDirectory(context: MapStyleContext, bounds: any): void {
    SystemDirectoryRenderer.draw(context, bounds, this.#config, this.#imagesLoaded, (name) => this.#getIcon(name) ?? null);
  }
}
