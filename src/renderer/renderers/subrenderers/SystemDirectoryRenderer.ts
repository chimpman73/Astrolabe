import { calculateSystemPositions } from '../../utils/orbitMath';
import { MapStyleContext, NavigationChartStyleConfig } from '../../../types/renderer';

export class SystemDirectoryRenderer {
  public static draw(
    context: MapStyleContext,
    bounds: any,
    config: NavigationChartStyleConfig,
    imagesLoaded: boolean,
    getIcon: (name: string) => HTMLImageElement | HTMLCanvasElement | null
  ): void {
    const { ctx, activeSphere, visibleObjects, project, activeZoom, currentSystemDate } = context;
    if (!imagesLoaded) return;

    ctx.save();
    
    // Base zoom multiplier for text. 
    // This makes the text scale perfectly with the directory width (which is 1x shellRadiusPx).
    // A value of 800 means if the column is 400px wide, 'z' is 0.5 (Title: 24px, Name: 16px)
    const z = bounds.shellRadiusPx / 800; 

    // Render Directory Header
    const startX = bounds.directoryStartX;
    
    const shellProj = project(0, 0);
    // Align with the top edge of the sphere title (which sits above the shell)
    const titleOffset = bounds.shellRadiusPx * 0.04;
    const titleFontSize = bounds.shellRadiusPx * 0.058;
    let curY = shellProj.y - bounds.shellRadiusPx - titleOffset - titleFontSize;

    ctx.fillStyle = config.directoryTitleColor;
    ctx.font = `bold ${48 * z}px ${config.titleFontFamily}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top'; // use top so it precisely aligns with the shell's top edge
    ctx.fillText((activeSphere?.sphereName || 'CRYSTAL SPHERE').toUpperCase(), startX, curY);

    curY += 50 * z;
    ctx.font = `normal ${24 * z}px ${config.defaultFontFamily}`;
    ctx.fillStyle = config.directorySubTitleColor;
    const shellRadiusAU = bounds.shellRadiusPx / activeZoom;
    ctx.fillText(`Radius: ${shellRadiusAU.toFixed(2)} AU`, startX, curY);

    curY += 80 * z;

    // Render primary planets (no moons, constellations, notes, or legends)
    const directoryObjects = visibleObjects.filter((o) => o.type !== 'moon' && o.type !== 'constellation' && o.type !== 'note' && o.type !== 'legend');
    
    directoryObjects.forEach((obj) => {
      if (curY > bounds.y + bounds.height - bounds.paddingPx) return; // Bounds limit

      // Determine Orbital Symbol
      let orbitIconType = 'standard';
      if (obj.orbitedObjectName === null || (obj.distanceOrbited || 0) === 0) {
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
      ctx.strokeStyle = config.strokeColor;
      ctx.fillStyle = config.strokeColor;
      ctx.lineWidth = 1.8 * z;

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
      const elemIcon = getIcon(elemIconName);
      if (elemIcon && (elemIcon instanceof HTMLCanvasElement || (elemIcon.complete && elemIcon.naturalWidth > 0))) {
        ctx.save();
        ctx.translate(startX + 55 * z, curY + 15 * z);
        ctx.drawImage(elemIcon, -iconSize / 2, -iconSize / 2, iconSize, iconSize);
        ctx.restore();
      }

      // Draw Object Type Icon
      const typeIconName = obj.type || 'custom';
      const typeIcon = getIcon(typeIconName);
      if (typeIcon && (typeIcon instanceof HTMLCanvasElement || (typeIcon.complete && typeIcon.naturalWidth > 0))) {
        ctx.save();
        ctx.translate(startX + 95 * z, curY + 15 * z);
        ctx.drawImage(typeIcon, -iconSize / 2, -iconSize / 2, iconSize, iconSize);
        ctx.restore();
      }

      // Draw details
      ctx.fillStyle = config.directoryTextColor;
      ctx.font = `bold ${32 * z}px ${config.titleFontFamily}`;
      ctx.fillText(obj.name, startX + textOffsetX, curY);

      curY += 35 * z;
      ctx.font = `italic ${20 * z}px ${config.defaultFontFamily}`;
      ctx.fillStyle = config.directorySubTitleColor;
      
      const positions = calculateSystemPositions(activeSphere as any, currentSystemDate);
      const period = positions[obj.name]?.period || 0;
      ctx.fillText(
        `Dist: ${(obj.distanceOrbited || 0).toFixed(2)} AU | Period: ${Math.round(period)} Days`,
        startX + textOffsetX,
        curY
      );

      curY += 60 * z; // Spacing for next item
    });

    ctx.restore();
  }
}
