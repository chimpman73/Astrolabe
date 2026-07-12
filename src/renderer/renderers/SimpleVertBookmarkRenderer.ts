import { CrystalSphere, CelestialObject } from '../../types/astrolabe';
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
  const bottomMargin = Math.max(25 * sizeMultiplier, centerObjSize + 20 * sizeMultiplier);
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

  // Draw objects and labels
  groupedObjects.forEach((objects, distance) => {
    const r = getPixelRadius(distance);
    
    // Sub-group by initialAngle to allow overlapping for objects that share the exact same position
    const angleGroups = new Map<number, typeof objects>();
    objects.forEach(o => {
      const ang = o.initialAngle || 0;
      if (!angleGroups.has(ang)) angleGroups.set(ang, []);
      angleGroups.get(ang)!.push(o);
    });
    
    const clusterCount = angleGroups.size;
    let clusterIndex = 0;
    
    angleGroups.forEach((cluster) => {
      cluster.forEach((obj, objIndexInCluster) => {
        let objSize = ScaleManager.getBookmarkVisualRadius(obj.sizeClass || 'D') * sizeMultiplier;
        const physicalRadiusAU = ScaleManager.getPhysicalRadiusAU(obj);
        const physicalPixelSize = getPixelRadius(physicalRadiusAU);
        // Only override the symbolic icon size if the physical size is actually larger!
        // This ensures massive objects (like giant stars, nebula clouds, or Dyson spheres) reflect their true scale.
        objSize = Math.max(objSize, physicalPixelSize);
        let x = centerX;
        let y = centerY - r;
        
        let nameTextAlign: CanvasTextAlign = 'left';
        let nameXOffset = objSize + 12;
        
        if (clusterCount > 1) {
          if (r === 0) {
            // Binary central stars: spread horizontally
            const spread = 80;
            const offset = (clusterIndex - (clusterCount - 1) / 2) * spread;
            x = centerX + offset;
            
            if (offset < 0) {
              nameTextAlign = 'right';
              nameXOffset = -objSize - 12;
            }
          } else {
            // Fan out along the arc
            const j = clusterIndex - (clusterCount - 1) / 2; 
            const avgArcPixels = 120; // Approx horizontal space needed per item
            let stepTheta = avgArcPixels / r;
            if (stepTheta > Math.PI / 4) stepTheta = Math.PI / 4; // Cap angle to prevent wrapping
            
            const alpha = -Math.PI / 2 + j * stepTheta;
            
            x = centerX + r * Math.cos(alpha);
            y = centerY + r * Math.sin(alpha);
            
            if (j < 0) {
               nameTextAlign = 'right'; // Draw name to the left of the body
               nameXOffset = -objSize - 12;
            }
          }
        }

        const { bodyFill, bodyStroke } = getBodyColors(obj, !isDark, colorBg, colorStroke, '#e2b34a');
        const scaleHeight = height - (showShell ? 15 : 45) - bottomMargin;
        const pixelsPerAU = canvasBoundary > 0 ? scaleHeight / canvasBoundary : 1;
        
        drawSolidBody(
          ctx, x, y, obj, objSize, bodyFill, bodyStroke, false, pixelsPerAU, 
          true, centerX, centerY, undefined, undefined, width, r, centerY
        );

        // --- Name label ---
        // If multiple objects share this exact same angle, offset their text vertically so they don't overwrite each other
        const verticalOffset = objIndexInCluster * 14; 
        ctx.font = `normal ${Math.max(10, width * 0.035) * 1.5}px 'ITC Eras-Bold', 'Eras Bold ITC', sans-serif`;
        ctx.fillStyle = colorStroke;
        ctx.textAlign = nameTextAlign;
        ctx.textBaseline = 'middle';
        ctx.fillText(obj.name, x + nameXOffset, y + verticalOffset);

        // --- Distance label (only for the leftmost cluster, and only for the first object in that cluster) ---
        if (showDistance && clusterIndex === 0 && objIndexInCluster === 0) {
          ctx.font = `italic ${Math.max(8, width * 0.028) * 1.5}px 'ITC Eras-Bold', 'Eras Bold ITC', sans-serif`;
          ctx.fillStyle = colorMuted;
          ctx.textAlign = 'right';
          ctx.textBaseline = 'middle';
          
          let distanceXOffset = -objSize - 12;
          if (nameTextAlign === 'right') {
             const textW = ctx.measureText(obj.name).width;
             distanceXOffset = -objSize - 12 - textW - 12; // Push past the name label
          }
          
          ctx.fillText(`${obj.distanceOrbited.toFixed(2)} AU`, x + distanceXOffset, y);
        }
      });
      clusterIndex++;
    });
  });

  // Decorative Bookmark borders
  ctx.strokeStyle = colorStroke;
  ctx.lineWidth = 4 * sizeMultiplier;
  ctx.strokeRect(2 * sizeMultiplier, 2 * sizeMultiplier, width - 4 * sizeMultiplier, height - 4 * sizeMultiplier);
  ctx.lineWidth = 1 * sizeMultiplier;
  ctx.strokeRect(6 * sizeMultiplier, 6 * sizeMultiplier, width - 12 * sizeMultiplier, height - 12 * sizeMultiplier);
}
