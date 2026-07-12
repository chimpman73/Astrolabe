import { BaseRenderer } from './BaseRenderer';
import { RenderContext } from '../../types/renderer';
import { ScaleManager } from '../utils/ScaleManager';

import { PRNG } from '../utils/PRNG';

export class CloudRenderer extends BaseRenderer {
  public draw(context: RenderContext): void {
    const { 
      ctx, obj, size, bodyFill, bodyStroke,
      isBookmarkView, 
      parentX, parentY, orbitRadius, orbitAngle,
      bookmarkWidth, bookmarkCenterY, bookmarkR
    } = context;
    
    const arcDegrees = obj.arcDegrees ?? 30;
    const isFullRing = arcDegrees >= 359;
    const numBumps = Math.max(3, Math.floor(arcDegrees / 20));
    const amp = (obj.cloudiness ?? 0.5) * (isBookmarkView ? 0.4 : 0.3);

    ctx.save();
    ctx.globalAlpha = obj.cloudTransparency ?? (isBookmarkView ? 0.35 : 0.45);
    ctx.fillStyle = bodyFill;
    ctx.beginPath();
    
    if (isBookmarkView) {
      if (bookmarkWidth === undefined || bookmarkCenterY === undefined || bookmarkR === undefined || parentX === undefined) return;
      
      const halfH = Math.max(8, size * 1.5); 
      // Cap halfAngle at PI/2 so it doesn't draw below the horizon (semicircle)
      const halfAngle = Math.min(Math.PI / 2, (arcDegrees / 2) * (Math.PI / 180));
      const cloudW = bookmarkR * halfAngle * 2;
      const numSegments = Math.max(100, Math.floor(cloudW));

      for (let i = 0; i <= numSegments; i++) {
        const t = i / numSegments;
        const nx = -1 + 2 * t;
        const envelope = isFullRing ? 1 : (1 - nx * nx);
        const bump = (1 - amp) + amp * Math.cos(nx * Math.PI * numBumps);
        
        const alpha = 1.5 * Math.PI + nx * halfAngle;
        const currentR = bookmarkR + halfH * envelope * bump;
        const cx = parentX + currentR * Math.cos(alpha);
        const cy = bookmarkCenterY + currentR * Math.sin(alpha);
        
        if (i === 0) ctx.moveTo(cx, cy);
        else ctx.lineTo(cx, cy);
      }
      
      for (let i = numSegments; i >= 0; i--) {
        const t = i / numSegments;
        const nx = -1 + 2 * t;
        const envelope = isFullRing ? 1 : (1 - nx * nx);
        const bump = (1 - amp) + amp * Math.cos(nx * Math.PI * numBumps);
        
        const alpha = 1.5 * Math.PI + nx * halfAngle;
        const currentR = Math.max(0, bookmarkR - halfH * envelope * bump);
        const cx = parentX + currentR * Math.cos(alpha);
        const cy = bookmarkCenterY + currentR * Math.sin(alpha);
        
        ctx.lineTo(cx, cy);
      }
    } else {
      if (parentX === undefined || parentY === undefined || orbitRadius === undefined || orbitAngle === undefined) return;
      if (obj.distanceOrbited <= 0) return;
      
      const arcHalf = (arcDegrees / 2) * (Math.PI / 180);
      const centerAngle = orbitAngle * (Math.PI / 180);
      const halfH = Math.max(8, size * 1.5);
      const numSegments = Math.max(40, Math.floor(arcDegrees * 1.5));

      for (let i = 0; i <= numSegments; i++) {
        const t = i / numSegments;
        const nx = -1 + 2 * t;
        const envelope = isFullRing ? 1 : (1 - nx * nx);
        const bump = (1 - amp) + amp * Math.cos(nx * Math.PI * numBumps);
        
        const angle = centerAngle + nx * arcHalf;
        const rOuter = orbitRadius + halfH * envelope * bump;
        
        const cx = parentX + rOuter * Math.cos(angle);
        const cy = parentY + rOuter * Math.sin(angle);
        if (i === 0) ctx.moveTo(cx, cy);
        else ctx.lineTo(cx, cy);
      }
      
      for (let i = numSegments; i >= 0; i--) {
        const t = i / numSegments;
        const nx = -1 + 2 * t;
        const envelope = isFullRing ? 1 : (1 - nx * nx);
        const bump = (1 - amp) + amp * Math.cos(nx * Math.PI * numBumps);
        
        const angle = centerAngle + nx * arcHalf;
        const rInner = orbitRadius - halfH * envelope * bump;
        
        const cx = parentX + rInner * Math.cos(angle);
        const cy = parentY + rInner * Math.sin(angle);
        ctx.lineTo(cx, cy);
      }
    }
    
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Draw internal objects
    const density = obj.cloudObjectDensity || 0;
    if (density > 0) {
      const rng = new PRNG(obj.name);
      const objShape = obj.cloudObjectShape ?? 'sphere';
      const baseSizeClass = obj.cloudObjectSizeClass ?? 'A';
      const basePhysicalSize = obj.cloudObjectPhysicalSize ?? 5;
      const arcHalf = (arcDegrees / 2) * (Math.PI / 180);
      const halfH = Math.max(8, size * 1.5);
      
      let scaledBaseSize = 0;
      if (isBookmarkView) {
        scaledBaseSize = ScaleManager.getBookmarkVisualRadius(baseSizeClass) * (bookmarkWidth ? bookmarkWidth / 300 : 1);
      } else {
        scaledBaseSize = ScaleManager.getNavChartVisualRadius(baseSizeClass, basePhysicalSize, 'miles', context.zoom || 1);
        if (context.isExport) {
          scaledBaseSize *= (context.exportScale || 2.5);
        }
      }

      ctx.save();
      ctx.fillStyle = bodyFill;
      ctx.strokeStyle = bodyStroke;
      ctx.lineWidth = 1;

      for (let i = 0; i < density; i++) {
        const rndRot = rng.next() * Math.PI * 2;
        const rndAngleFrac = (rng.next() * 2) - 1; // -1 to 1
        const rndRadFrac = (rng.next() * 2) - 1; // -1 to 1
        
        const s = Math.max(0.5, scaledBaseSize * (0.7 + rng.next() * 0.6));

        let cx = 0;
        let cy = 0;

        if (isBookmarkView) {
          if (bookmarkWidth === undefined || bookmarkCenterY === undefined || bookmarkR === undefined || parentX === undefined) continue;
          
          const halfAngle = Math.min(Math.PI / 2, (arcDegrees / 2) * (Math.PI / 180));
          
          const nx = rndAngleFrac;
          const envelope = isFullRing ? 1 : (1 - nx * nx);
          const bump = (1 - amp) + amp * Math.cos(nx * Math.PI * numBumps);
          
          const alpha = 1.5 * Math.PI + nx * halfAngle;
          const rDelta = halfH * envelope * bump;
          const currentR = bookmarkR + rndRadFrac * rDelta;
          
          cx = parentX + currentR * Math.cos(alpha);
          cy = bookmarkCenterY + currentR * Math.sin(alpha);

        } else {
          if (parentX === undefined || parentY === undefined || orbitRadius === undefined || orbitAngle === undefined) continue;
          const centerAngle = orbitAngle * (Math.PI / 180);
          const nx = rndAngleFrac;
          const envelope = isFullRing ? 1 : (1 - nx * nx);
          const bump = (1 - amp) + amp * Math.cos(nx * Math.PI * numBumps);
          
          const angle = centerAngle + nx * arcHalf;
          const rDelta = halfH * envelope * bump;
          const rPos = orbitRadius + rndRadFrac * rDelta;
          
          cx = parentX + rPos * Math.cos(angle);
          cy = parentY + rPos * Math.sin(angle);
        }

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(rndRot);
        this.drawShapePath(ctx, objShape, 0, 0, s);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
      ctx.restore();
    }
  }
}
