import { MapStyleContext, INavigationChartRenderer } from '../../types/renderer';
import { CelestialObject } from '../../types/astrolabe';
import { drawSolidBody, drawStationaryIndicator, getBodyColors, getElementColor } from '../utils/canvasRenderer';
import { ScaleManager } from '../utils/ScaleManager';

export class SpaceNavigationChartRenderer implements INavigationChartRenderer {
  private readonly colorBg = '#06070a';
  private readonly colorGrid = 'rgba(255, 255, 255, 0.03)';
  private readonly colorOrbit = 'rgba(255, 255, 255, 0.15)';
  private readonly colorOrbitDash = 'rgba(68, 128, 230, 0.3)';
  private readonly colorStroke = '#ffffff';
  private readonly colorMuted = '#888d9e';
  private readonly colorGold = '#e2b34a';

  drawBackground({ ctx, width, height }: MapStyleContext): void {
    ctx.fillStyle = this.colorBg;
    ctx.fillRect(0, 0, width, height);
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
        
        const isPrimaryOrbit = isPrimary(obj);
        ctx.lineWidth = isPrimaryOrbit ? 1.2 : 0.75;
        ctx.strokeStyle = isPrimaryOrbit ? this.colorOrbit : this.colorOrbitDash;
        ctx.stroke();
      }
    });
  }

  drawShell({ ctx, activeSphere }: MapStyleContext, shellRadius: number, shellProj: { x: number; y: number }): void {
    ctx.beginPath();
    ctx.arc(shellProj.x, shellProj.y, Math.max(0, shellRadius), 0, 2 * Math.PI);
    ctx.strokeStyle = this.colorStroke;
    ctx.lineWidth = 3;
    ctx.stroke();
    
    ctx.beginPath();
    ctx.arc(shellProj.x, shellProj.y, Math.max(0, shellRadius - 5), 0, 2 * Math.PI);
    ctx.lineWidth = 0.75;
    ctx.stroke();

    ctx.font = `bold 24px 'Elan', 'Cinzel', serif`;
    ctx.fillStyle = this.colorStroke;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(
      (activeSphere?.sphereName || 'CRYSTAL SHELL').toUpperCase() + ' SHELL',
      shellProj.x,
      shellProj.y - shellRadius - 10
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
        const cloudFill = getElementColor(obj.elementAffinity || null) || '#a0a0a0';
        
        drawSolidBody(ctx, proj.x, proj.y, obj, renderSize, cloudFill, '#505050', false, activeZoom,
          false, parentProj.x, parentProj.y, orbitR, pos.angle
        );
      } else {
        const { bodyFill, bodyStroke } = getBodyColors(obj, false, this.colorBg, this.colorStroke, this.colorGold);
        const orbitR = obj.distanceOrbited * activeZoom;
        drawSolidBody(ctx, proj.x, proj.y, obj, renderSize, bodyFill, bodyStroke, false, activeZoom,
          false, parentProj.x, parentProj.y, orbitR, pos.angle
        );

        if (obj.isStationary && obj.type !== 'star' && obj.type !== 'constellation') {
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

  drawForeground(): void {
    // No foreground in space mode
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
    this.drawScaleBar(context);
    this.drawForeground();
  }
}
