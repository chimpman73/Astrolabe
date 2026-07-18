import { CrystalSphere } from '../../types/astrolabe';
import { BookmarkStyleConfig } from '../../types/renderer';
import { drawSolidBody, getBodyColors } from '../utils/canvasRenderer';
import { ScaleManager } from '../utils/ScaleManager';

export function drawBookmark(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  config: BookmarkStyleConfig,
  showShell: boolean,
  showDistance: boolean,
  activeSphere: CrystalSphere | null,
  planetaryObjects: any[],
  shellBasisDistance: number,
  absoluteMaxDistance: number,
  visibleMaxDistance: number
) {
  const isDark = config.isDarkTheme;
  
  // Theme Colors
  const colorBg = config.backgroundColor;
  const colorStroke = config.strokeColor;
  const colorMuted = config.mutedColor;

  // Clear background
  ctx.fillStyle = colorBg;
  ctx.fillRect(0, 0, width, height);
  
  const sizeMultiplier = width / 300;

  // Calculate bottom margin dynamically based on the central object's size to prevent clipping
  const centerObj = planetaryObjects.find(obj => obj.distanceOrbited === 0);
  let centerObjSize = 10 * sizeMultiplier;
  if (centerObj) {
    centerObjSize = ScaleManager.getBookmarkVisualRadius(centerObj.sizeClass || 'D') * sizeMultiplier;
  }
  
  // Coordinate settings
  const bottomMargin = Math.max(35 * sizeMultiplier, centerObjSize + 30 * sizeMultiplier);
  const centerX = width / 2;
  const centerY = height - bottomMargin; // True center is slightly above bottom edge

  const isCustom = activeSphere?.shellBoundaryType === 'custom' || activeSphere?.shellBoundaryType === 'relativeMargin';
  const shellScale = isCustom ? (activeSphere?.shellCustomScale ?? 1.2) : 2.0;
  const shellDistance = shellBasisDistance * shellScale;
  
  // Determine the furthest point that needs to be drawn on the canvas
  const canvasBoundary = showShell 
    ? Math.max(absoluteMaxDistance, shellDistance)
    : visibleMaxDistance;

  // --- Dynamic Gap Compression Algorithm ---
  const topMargin = (showShell ? 15 : 45) * sizeMultiplier;
  const scaleHeight = height - topMargin - bottomMargin;
  
  // Collect all objects that will be plotted to calculate spacing
  const plottedDistances: { dist: number, sizeClass: string, physicalSize?: number }[] = [
    { dist: 0, sizeClass: 'A', physicalSize: 0 } // Sun/Center
  ];
  
  planetaryObjects.forEach(obj => {
    plottedDistances.push({
      dist: obj.distanceOrbited,
      sizeClass: obj.sizeClass || 'D',
      physicalSize: obj.physicalSize || 0
    });
  });
  
  // Always ensure the canvasBoundary is represented in the layout spacing
  // so that physical spans (like massive Living World branches) are accounted for in the bookmark height!
  const maxPlottedDist = Math.max(...plottedDistances.map(d => d.dist));
  if (canvasBoundary > maxPlottedDist) {
    plottedDistances.push({ dist: canvasBoundary, sizeClass: 'A', physicalSize: 0 }); // System Boundary
  }

  // Sort by distance ascending
  plottedDistances.sort((a, b) => a.dist - b.dist);

  // Minimum padding between labels/icons in pixels
  const MIN_PIXEL_GAP = 40; // Allow enough space for standard text + icon

  // Calculate raw gaps and weights
  let totalWeight = 0;
  const gaps: { gapAU: number, weight: number, minPixels: number, pixels: number }[] = [];
  
  for (let i = 1; i < plottedDistances.length; i++) {
    const prev = plottedDistances[i - 1];
    const curr = plottedDistances[i];
    const gapAU = curr.dist - prev.dist;
    
    // Weighting curve: square-root-like compression
    const weight = Math.pow(Math.max(0, gapAU), 0.4);
    totalWeight += weight;
    
    // Handle overlap rules for Size J worlds > 1 AU physical size, or basically identical orbits
    const prevIsJ = prev.sizeClass === 'J' && (prev.physicalSize ?? 0) >= 1;
    const currIsJ = curr.sizeClass === 'J' && (curr.physicalSize ?? 0) >= 1;
    const allowsOverlap = prevIsJ || currIsJ || gapAU < 0.005;
    
    const minPixels = allowsOverlap ? 0 : MIN_PIXEL_GAP;
    
    gaps.push({ gapAU, weight, minPixels, pixels: 0 });
  }

  if (totalWeight > 0) {
    let totalRequiredPixels = 0;
    for (const g of gaps) {
      g.pixels = (g.weight / totalWeight) * scaleHeight;
      if (g.pixels < g.minPixels) {
        g.pixels = g.minPixels;
      }
      totalRequiredPixels += g.pixels;
    }
    
    // If we overshoot or undershoot due to MIN_PIXEL_GAP bounds, proportionally scale the final values
    if (totalRequiredPixels > 0) {
      const ratio = scaleHeight / totalRequiredPixels;
      for (const g of gaps) {
        g.pixels *= ratio;
      }
    }
  }

  const distanceToPixels = new Map<number, number>();
  distanceToPixels.set(0, 0);
  
  let currentRadius = 0;
  for (let i = 1; i < plottedDistances.length; i++) {
    currentRadius += gaps[i - 1].pixels;
    distanceToPixels.set(plottedDistances[i].dist, currentRadius);
  }

  // Helper: translate distance into pixel radius using the map
  const getPixelRadius = (distance: number) => {
    if (distanceToPixels.has(distance)) return distanceToPixels.get(distance)!;
    
    // Interpolate for distances not explicitly in the list (e.g. cloud radius boundaries)
    let lowerDist = 0;
    let lowerPx = 0;
    let upperDist = canvasBoundary;
    let upperPx = scaleHeight;
    
    for (const [d, px] of distanceToPixels.entries()) {
      if (d <= distance && d >= lowerDist) { lowerDist = d; lowerPx = px; }
      if (d >= distance && d <= upperDist) { upperDist = d; upperPx = px; }
    }
    
    if (upperDist === lowerDist) return lowerPx;
    const fraction = (distance - lowerDist) / (upperDist - lowerDist);
    return lowerPx + fraction * (upperPx - lowerPx);
  };

  // Draw orbits
  ctx.lineWidth = 1 * sizeMultiplier;
  planetaryObjects.forEach((obj: any) => {
    const r = getPixelRadius(obj.distanceOrbited);
    ctx.beginPath();
    // Draw top semicircle arc
    ctx.arc(centerX, centerY, r, Math.PI, 2 * Math.PI);
    ctx.strokeStyle = colorMuted;
    ctx.setLineDash([4 * sizeMultiplier, 4 * sizeMultiplier]); // Dashed orbit line
    ctx.stroke();
  });
  ctx.setLineDash([]); // Reset dashed lines

  // Draw Crystal Sphere Shell (at very top boundary)
  if (showShell) {
    const shellR = getPixelRadius(shellDistance); // which equals height
    ctx.beginPath();
    ctx.arc(centerX, centerY, shellR - 2 * sizeMultiplier, Math.PI, 2 * Math.PI);
    ctx.strokeStyle = colorStroke;
    ctx.lineWidth = 3 * sizeMultiplier;
    ctx.stroke();

    // Inner border detail
    ctx.beginPath();
    ctx.arc(centerX, centerY, shellR - 8 * sizeMultiplier, Math.PI, 2 * Math.PI);
    ctx.lineWidth = 1 * sizeMultiplier;
    ctx.stroke();
  }

  // Title label at the top center
  ctx.font = `bold ${Math.max(10, width * 0.035) * 1.5}px 'Elan', 'Cinzel', serif`;
  ctx.fillStyle = colorStroke;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(
    showShell 
      ? (activeSphere?.sphereName || 'CRYSTAL SHELL').toUpperCase() + ' SHELL'
      : (activeSphere?.sphereName || 'UNTITLED SYSTEM').toUpperCase(),
    centerX,
    (showShell ? 32 : 12) * sizeMultiplier
  );

  // Group objects by their orbital distance
  const groupedObjects = new Map<number, typeof planetaryObjects>();
  planetaryObjects.forEach((obj: any) => {
    const d = obj.distanceOrbited;
    if (!groupedObjects.has(d)) groupedObjects.set(d, []);
    groupedObjects.get(d)!.push(obj);
  });

  // First Pass: Draw all object bodies
  groupedObjects.forEach((objects, distance) => {
    const rBase = getPixelRadius(distance);
    const groupSize = objects.length;
    
    objects.forEach((obj, idx) => {
      const scaleFactor = groupSize > 1 ? Math.max(0.6, 1 - (groupSize - 1) * 0.1) : 1;
      
      let objSize = ScaleManager.getBookmarkVisualRadius(obj.sizeClass || 'D') * sizeMultiplier * scaleFactor;
      const physicalRadiusAU = ScaleManager.getPhysicalRadiusAU(obj);
      const physicalPixelSize = getPixelRadius(physicalRadiusAU) * scaleFactor;
      objSize = Math.max(objSize, physicalPixelSize);

      let alpha = -Math.PI / 2;
      let x = centerX;
      let y = centerY - rBase;

      if (groupSize > 1) {
        if (rBase === 0) {
          const spread = 60 * sizeMultiplier * scaleFactor;
          const offset = (idx - (groupSize - 1) / 2) * spread;
          x = centerX + offset;
          y = centerY;
        } else {
          const j = idx - (groupSize - 1) / 2;
          const spacingPixels = 70 * sizeMultiplier * scaleFactor;
          let stepTheta = spacingPixels / rBase;
          const maxTotalArc = Math.PI * 0.8;
          if (stepTheta * (groupSize - 1) > maxTotalArc) {
            stepTheta = maxTotalArc / (groupSize - 1);
          }
          alpha = -Math.PI / 2 + j * stepTheta;
          x = centerX + rBase * Math.cos(alpha);
          y = centerY + rBase * Math.sin(alpha);
        }
      }

      const { bodyFill, bodyStroke } = getBodyColors(obj, !isDark, colorBg, colorStroke, '#e2b34a');
      const scaleHeight = height - (showShell ? 15 : 45) - bottomMargin;
      const pixelsPerAU = canvasBoundary > 0 ? scaleHeight / canvasBoundary : 1;
      
      const objClone = { ...obj };
      let cloudArcScale = 1;
      if (obj.type === 'cloud' && groupSize > 1) {
        cloudArcScale = Math.max(0.4, 1 / groupSize);
        objClone.arcDegrees = (obj.arcDegrees ?? 30) * cloudArcScale;
      }
      (objClone as any).cloudArcScale = cloudArcScale;
      
      const orbitAngleDeg = alpha * (180 / Math.PI);

      drawSolidBody(
        ctx, x, y, objClone, objSize, bodyFill, bodyStroke, false, pixelsPerAU * scaleFactor, 
        true, centerX, centerY, rBase, orbitAngleDeg, width, rBase, centerY
      );
    });
  });

  // Second Pass: Draw all labels and names on top of the bodies
  groupedObjects.forEach((objects, distance) => {
    const rBase = getPixelRadius(distance);
    const groupSize = objects.length;
    
    objects.forEach((obj, idx) => {
      const scaleFactor = groupSize > 1 ? Math.max(0.6, 1 - (groupSize - 1) * 0.1) : 1;
      
      let objSize = ScaleManager.getBookmarkVisualRadius(obj.sizeClass || 'D') * sizeMultiplier * scaleFactor;
      const physicalRadiusAU = ScaleManager.getPhysicalRadiusAU(obj);
      const physicalPixelSize = getPixelRadius(physicalRadiusAU) * scaleFactor;
      objSize = Math.max(objSize, physicalPixelSize);

      let alpha = -Math.PI / 2;
      let x = centerX;
      let y = centerY - rBase;
      let actualSpacing = 999;

      if (groupSize > 1) {
        if (rBase === 0) {
          const spread = 60 * sizeMultiplier * scaleFactor;
          const offset = (idx - (groupSize - 1) / 2) * spread;
          x = centerX + offset;
          y = centerY;
          actualSpacing = spread;
        } else {
          const j = idx - (groupSize - 1) / 2;
          const spacingPixels = 70 * sizeMultiplier * scaleFactor;
          let stepTheta = spacingPixels / rBase;
          const maxTotalArc = Math.PI * 0.8;
          if (stepTheta * (groupSize - 1) > maxTotalArc) {
            stepTheta = maxTotalArc / (groupSize - 1);
          }
          alpha = -Math.PI / 2 + j * stepTheta;
          x = centerX + rBase * Math.cos(alpha);
          y = centerY + rBase * Math.sin(alpha);
          actualSpacing = rBase * stepTheta;
        }
      }

      // Check if fanned labels will overlap horizontally
      const isOverlapping = groupSize > 1 && actualSpacing < 85 * sizeMultiplier;
      const staggerOffset = isOverlapping && (idx % 2 === 1) ? (14 * sizeMultiplier) : 0;

      // --- Name label ---
      ctx.font = `normal ${Math.max(10, width * 0.035) * 1.5}px 'ITC Eras-Bold', 'Eras Bold ITC', sans-serif`;
      ctx.fillStyle = colorStroke;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      const nameY = y - objSize - 4 * sizeMultiplier - staggerOffset;
      ctx.fillText(obj.name, x, nameY);

      // --- Distance label ---
      if (showDistance) {
        ctx.font = `italic ${Math.max(8, width * 0.028) * 1.5}px 'ITC Eras-Bold', 'Eras Bold ITC', sans-serif`;
        ctx.fillStyle = colorMuted;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        const distText = `${obj.distanceOrbited.toFixed(2)} AU`;
        const distanceY = y + objSize + 4 * sizeMultiplier + staggerOffset;
        ctx.fillText(distText, x, distanceY);
      }
    });
  });

  // Decorative Bookmark borders
  ctx.strokeStyle = colorStroke;
  ctx.lineWidth = 4 * sizeMultiplier;
  ctx.strokeRect(2 * sizeMultiplier, 2 * sizeMultiplier, width - 4 * sizeMultiplier, height - 4 * sizeMultiplier);
  ctx.lineWidth = 1 * sizeMultiplier;
  ctx.strokeRect(6 * sizeMultiplier, 6 * sizeMultiplier, width - 12 * sizeMultiplier, height - 12 * sizeMultiplier);
}
