import { ParchmentDecoration, MapStyleContext, INavigationChartRenderer } from '../../types/renderer';
import { CelestialObject } from '../../types/astrolabe';
import { drawSolidBody, drawStationaryIndicator, getBodyColors, getElementColor } from '../utils/canvasRenderer';
import { ScaleManager } from '../utils/ScaleManager';

export class VellumNavigationChartRenderer implements INavigationChartRenderer {
  private readonly colorBg = '#f9f5e8';
  private readonly colorGrid = 'rgba(94, 79, 60, 0.05)';
  private readonly colorOrbit = 'rgba(94, 79, 60, 0.18)';
  private readonly colorOrbitDash = 'rgba(143, 50, 36, 0.25)';
  private readonly colorStroke = '#2b2316';
  private readonly colorMuted = '#7c694e';
  private readonly colorGold = '#b58315';

  private bgPattern: CanvasPattern | null = null;
  private woodPattern: CanvasPattern | null = null;
  private bgImage = new Image();
  private woodDeskImage = new Image();
  private stainInk = new Image();
  private stainCoffee = new Image();
  private stainBurn = new Image();
  
  private imagesLoaded = false;
  private loadCount = 0;
  private readonly totalImages = 5;
  private forceRedraw?: () => void;

  constructor(forceRedraw?: () => void) {
    this.forceRedraw = forceRedraw;
    const onLoad = () => {
      this.loadCount++;
      if (this.loadCount === this.totalImages) {
        this.imagesLoaded = true;
        this.forceRedraw?.();
      }
    };

    this.bgImage.src = '/images/vellum_bg.png';
    this.bgImage.onload = onLoad;

    this.woodDeskImage.src = '/images/wood_desk.png';
    this.woodDeskImage.onload = onLoad;

    this.stainInk.src = '/images/stain_ink.png';
    this.stainInk.onload = onLoad;

    this.stainCoffee.src = '/images/stain_coffee.png';
    this.stainCoffee.onload = onLoad;

    this.stainBurn.src = '/images/stain_burn.png';
    this.stainBurn.onload = onLoad;
  }

  private getScrollBounds(context: MapStyleContext) {
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
    const paperWidthPx = shellRadiusPx * 2 + paddingPx * 2;
    const paperHeightPx = shellRadiusPx * 2 + paddingPx * 2;
    
    const centerProj = context.project(0, 0);
    return {
      x: centerProj.x - paperWidthPx / 2,
      y: centerProj.y - paperHeightPx / 2,
      width: paperWidthPx,
      height: paperHeightPx
    };
  }

  drawBackground(context: MapStyleContext): void {
    const { ctx, width, height } = context;
    // 1. Clear the entire canvas to transparent
    ctx.clearRect(0, 0, width, height);

    if (!this.imagesLoaded || !this.bgImage.complete || !this.woodDeskImage.complete) {
      return;
    }

    if (!this.bgPattern) {
      this.bgPattern = ctx.createPattern(this.bgImage, 'repeat');
    }
    if (!this.woodPattern) {
      this.woodPattern = ctx.createPattern(this.woodDeskImage, 'repeat');
    }

    const bounds = this.getScrollBounds(context);

    ctx.save();
    
    // Drop shadow for the paper
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 30;
    ctx.shadowOffsetX = 10;
    ctx.shadowOffsetY = 15;

    // Draw the main parchment paper body
    ctx.beginPath();
    ctx.roundRect(bounds.x, bounds.y, bounds.width, bounds.height, 10);
    
    if (this.bgPattern) {
      ctx.fillStyle = this.bgPattern;
    } else {
      ctx.fillStyle = this.colorBg;
    }
    
    ctx.fill();
    ctx.shadowColor = 'transparent'; // Turn off shadow for remaining items

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

    ctx.restore();
  }

  drawGrid({ ctx, width, height, activePan }: MapStyleContext): void {
    ctx.strokeStyle = this.colorGrid;
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
    if (!this.imagesLoaded || !decorations) return;

    ctx.save();
    // Multiply blend mode simulates ink/coffee soaking into parchment
    // and naturally drops out white backgrounds
    ctx.globalCompositeOperation = 'multiply';

    decorations.forEach((dec: ParchmentDecoration) => {
      const proj = project(dec.x, dec.y);
      let img: HTMLImageElement | null = null;
      if (dec.type === 'ink') img = this.stainInk;
      if (dec.type === 'coffee') img = this.stainCoffee;
      if (dec.type === 'burn') img = this.stainBurn;

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

  drawOrbits({ ctx, activeZoom, positions, project, isPrimary }: MapStyleContext, activeVisibleObjects: CelestialObject[]): void {
    activeVisibleObjects.forEach((obj) => {
      if (obj.type === 'constellation') return;

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
        ctx.arc(parentProj.x, parentProj.y, orbitRadius, 0, 2 * Math.PI);
        const isPrimaryOrbit = isPrimary(obj);
        ctx.lineWidth = isPrimaryOrbit ? 1.2 : 0.75;
        ctx.strokeStyle = isPrimaryOrbit ? this.colorOrbit : this.colorOrbitDash;
        ctx.stroke();
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
    ctx.fillStyle = this.colorStroke;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(
      (activeSphere?.sphereName || 'CRYSTAL SHELL').toUpperCase() + ' SHELL',
      shellProj.x,
      shellProj.y - shellRadius - 15
    );
  }

  drawBodies({ ctx, activeZoom, positions, project }: MapStyleContext, activeVisibleObjects: CelestialObject[]): void {
    activeVisibleObjects.forEach((obj) => {
      const pos = positions[obj.name];
      if (!pos) return;

      let px = 0, py = 0;
      if (obj.orbitedObjectName) {
        const parentPos = positions[obj.orbitedObjectName];
        if (parentPos) { px = parentPos.x; py = parentPos.y; }
      }
      const parentProj = project(px, py);
      const proj = project(pos.x, pos.y);
      const renderSize = ScaleManager.getNavChartVisualRadius(obj.sizeClass || 'D', obj.physicalSize || 1000, obj.sizeUnit || 'miles', activeZoom);

      if (obj.type === 'cloud') {
        if (obj.distanceOrbited <= 0) return;
        const orbitR = obj.distanceOrbited * activeZoom;
        const cloudFill = getElementColor(obj.elementAffinity || null) || '#808080';
        
        drawSolidBody(ctx, proj.x, proj.y, obj, renderSize, cloudFill, '#505050', false, activeZoom,
          false, parentProj.x, parentProj.y, orbitR, pos.angle
        );
      } else {
        const { bodyFill, bodyStroke } = getBodyColors(obj, true, this.colorBg, this.colorStroke, this.colorGold);
        const orbitR = obj.distanceOrbited * activeZoom;
        drawSolidBody(ctx, proj.x, proj.y, obj, renderSize, bodyFill, bodyStroke, false, activeZoom,
          false, parentProj.x, parentProj.y, orbitR, pos.angle
        );

        if (obj.isStationary && obj.type !== 'star' && obj.type !== 'constellation' && obj.type !== 'living_world') {
          drawStationaryIndicator(ctx, proj.x, proj.y, renderSize, this.colorMuted);
        }
      }

      const shouldLabel = obj.type !== 'moon' || activeZoom > 150;
      if (shouldLabel) {
        ctx.font = obj.type === 'star'
          ? `bold 12px 'Elan', 'Cinzel', serif`
          : `500 10px 'Elan', 'Outfit', sans-serif`;
        
        if (obj.type === 'constellation') {
          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(obj.name, proj.x, proj.y);
        } else {
          ctx.fillStyle = this.colorStroke;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';
          ctx.fillText(obj.name, proj.x, proj.y + renderSize + 5);
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
    
    ctx.strokeStyle = this.colorStroke;
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
    ctx.fillStyle = this.colorStroke;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(scaleLabel, barX + (scaleBarWidth / 2), barY - 8);
  }

  drawForeground({ ctx, width, height }: MapStyleContext): void {
    if (!this.imagesLoaded || !this.woodDeskImage.complete) return;

    ctx.save();
    // destination-over draws behind existing canvas content
    ctx.globalCompositeOperation = 'destination-over';
    
    if (this.woodPattern) {
      ctx.fillStyle = this.woodPattern;
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
    this.drawScaleBar(context);
    this.drawForeground(context);
  }
}
