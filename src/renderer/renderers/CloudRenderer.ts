import { BaseRenderer, RenderContext } from './BaseRenderer';

export class CloudRenderer extends BaseRenderer {
  public draw(context: RenderContext): void {
    const { 
      ctx, obj, size, bodyFill, 
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
      
      const arcFrac = Math.min(1.0, arcDegrees / 360);
      const cloudW = bookmarkWidth * arcFrac;
      const halfH = Math.max(8, size * 1.5); 
      const halfW = cloudW / 2;
      const safeR = Math.max(1, bookmarkR);
      const halfAngle = halfW >= safeR ? Math.PI : Math.asin(halfW / safeR);
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
  }
}
