import { BaseRenderer, RenderContext } from './BaseRenderer';

function mulberry32(a: number) {
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}

function hashString(str: string) {
  let h = 0x811c9dc5;
  for(let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h;
}

export class LivingWorldRenderer extends BaseRenderer {
  private static geometryCache = new Map<string, { branches: Record<number, Path2D>, leavesData: {x: number, y: number, rand: number}[], maxRadius: number }>();

  public draw(context: RenderContext): void {
    const { ctx, x, y, obj, size, bodyFill, bodyStroke, zoom = 1 } = context;
    const levels = obj.branchLevels ?? 2;
    const density = obj.branchDensity ?? 3;
    const extentAU = obj.branchExtent ?? 2.5;
    const bendFactor = obj.branchBend ?? 0.5;
    
    // Convert AU to pixel length by multiplying by zoom factor
    const branchLengthPixels = extentAU * zoom;
    const baseSeed = obj.name + (obj.orbitedObjectName || '');
    
    // Generate normalized geometry (scale = 1) if not cached
    if (!LivingWorldRenderer.geometryCache.has(baseSeed)) {
      const branchPaths: Record<number, Path2D> = {};
      const leavesData: {x: number, y: number, rand: number}[] = [];
      
      const getBranchPath = (thickness: number) => {
        if (!branchPaths[thickness]) branchPaths[thickness] = new Path2D();
        return branchPaths[thickness];
      };

      const traverseTree = (
        startX: number, startY: number, 
        baseAngle: number, 
        totalLength: number, 
        currentLevel: number,
        pathSeed: string,
        currentMaxRadius: { value: number }
      ) => {
        if (currentLevel > levels) return;
        
        const rand = mulberry32(hashString(pathSeed));
        const baseBranches = Math.max(1, Math.floor(density / 2));
        const branchSpread = currentLevel === 1 ? Math.PI * 2 : (Math.PI / 1.5);
        
        const numBranches = currentLevel === 1 
          ? Math.max(3, Math.floor(density)) 
          : baseBranches + Math.floor(rand() * 2) + 1;
          
        for (let i = 0; i < numBranches; i++) {
          const branchSeed = pathSeed + '_' + i;
          const bRand = mulberry32(hashString(branchSeed));
          
          let branchAngle = baseAngle;
          const noiseFactor = Math.max(0.1, bendFactor * 2);
          if (currentLevel === 1) {
            branchAngle = baseAngle + (i / numBranches) * branchSpread;
            branchAngle += (bRand() - 0.5) * 0.2 * noiseFactor; // noise
          } else {
            branchAngle = baseAngle - branchSpread/2 + (numBranches > 1 ? (i / (numBranches - 1)) * branchSpread : 0);
            branchAngle += (bRand() - 0.5) * 0.4 * noiseFactor;
          }
          
          const branchLen = totalLength * (0.6 + bRand() * 0.4);
          const thickness = 1.0 + (levels - currentLevel) * 1.5;
          const pathThickness = Math.max(1, thickness);
          
          const numNodes = 3 + Math.floor(bRand() * 4); // 3 to 6 segments
          const actualSegLen = branchLen / numNodes;
          
          let cx = startX;
          let cy = startY;
          let cAngle = branchAngle;
          
          const bPath = getBranchPath(pathThickness);
          bPath.moveTo(cx, cy);
          
          const nodes: {x: number, y: number, angle: number}[] = [];
          
          for (let n = 0; n < numNodes; n++) {
            cAngle += (bRand() - 0.5) * bendFactor; 
            cx += Math.cos(cAngle) * actualSegLen;
            cy += Math.sin(cAngle) * actualSegLen;
            bPath.lineTo(cx, cy);
            nodes.push({ x: cx, y: cy, angle: cAngle });
          }
          
          const dist = Math.sqrt(cx * cx + cy * cy);
          if (dist > currentMaxRadius.value) currentMaxRadius.value = dist;
          
          if (currentLevel < levels) {
            traverseTree(cx, cy, cAngle, branchLen * 0.75, currentLevel + 1, branchSeed + '_tip', currentMaxRadius);
            
            const doSide = currentLevel === 1 || bRand() > 0.4;
            if (nodes.length > 1 && doSide) {
              const rNodeIdx = Math.floor(bRand() * (nodes.length - 1));
              const rNode = nodes[rNodeIdx];
              const sideAngleOff = (bRand() > 0.5 ? 0.8 : -0.8) * (bendFactor > 0 ? 1 : 0);
              traverseTree(rNode.x, rNode.y, rNode.angle + sideAngleOff, branchLen * 0.6, currentLevel + 1, branchSeed + '_side', currentMaxRadius);
            }
          }
          
          if (currentLevel === levels && (obj.hasLeaves !== false)) {
            leavesData.push({ x: cx, y: cy, rand: bRand() });
          }
        }
      };

      const maxLevelsSum = (1 - Math.pow(0.75, levels)) / (1 - 0.75);
      const unscaledInitial = 1 / maxLevelsSum; // Run with a normalized target length of 1
      
      const radiusTracker = { value: 0 };
      traverseTree(0, 0, 0, unscaledInitial, 1, baseSeed, radiusTracker);
      
      LivingWorldRenderer.geometryCache.set(baseSeed, {
        branches: branchPaths,
        leavesData: leavesData,
        maxRadius: radiusTracker.value
      });
    }
    
    // Retrieve cached geometry
    const cachedGeometry = LivingWorldRenderer.geometryCache.get(baseSeed)!;
    
    // Calculate the scale required to match the target pixels on screen
    const scale = branchLengthPixels / cachedGeometry.maxRadius;
    
    // GPU hardware rendering of the complex fractal tree
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    
    // Stroke all branches grouped by thickness
    for (const [thicknessStr, path] of Object.entries(cachedGeometry.branches)) {
      // Counter-act the canvas scale to maintain precise pixel thickness on screen
      ctx.lineWidth = parseFloat(thicknessStr) / scale;
      ctx.strokeStyle = bodyStroke;
      ctx.stroke(path);
    }
    
    // Fill all leaves in a single draw call, counter-scaling so they stay a fixed physical pixel size!
    if (obj.hasLeaves !== false) {
      ctx.fillStyle = '#2ea84b';
      ctx.beginPath();
      for (const leaf of cachedGeometry.leavesData) {
        const leafRadiusScaled = (3 + leaf.rand * 3) / scale;
        ctx.moveTo(leaf.x + leafRadiusScaled, leaf.y);
        ctx.arc(leaf.x, leaf.y, leafRadiusScaled, 0, 2 * Math.PI);
      }
      ctx.fill();
    }
    
    ctx.restore();
    
    // Central ball (trunk) - rendered unscaled so it stays a perfect sphere size
    ctx.beginPath();
    ctx.arc(x, y, size, 0, 2 * Math.PI);
    ctx.fillStyle = bodyFill;
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = bodyStroke;
    ctx.stroke();
  }
}
