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
  private static maxRadiusCache = new Map<string, number>();

  public draw(context: RenderContext): void {
    const { ctx, x, y, obj, size, bodyFill, bodyStroke, zoom = 1 } = context;
    const levels = obj.branchLevels ?? 2;
    const density = obj.branchDensity ?? 3;
    const extentAU = obj.branchExtent ?? 2.5;
    const bendFactor = obj.branchBend ?? 0.5;
    
    // Convert AU to pixel length by multiplying by zoom factor
    const branchLengthPixels = extentAU * zoom;
    const baseSeed = obj.name + (obj.orbitedObjectName || '');
    
    const branchPaths: Record<number, Path2D> = {};
    const leavesPath = new Path2D();
    
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
      dryRun: boolean,
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
        
        let bPath: Path2D | null = null;
        if (!dryRun) {
          bPath = getBranchPath(pathThickness);
          bPath.moveTo(cx, cy);
        }
        
        const nodes: {x: number, y: number, angle: number}[] = [];
        
        for (let n = 0; n < numNodes; n++) {
          cAngle += (bRand() - 0.5) * bendFactor; 
          cx += Math.cos(cAngle) * actualSegLen;
          cy += Math.sin(cAngle) * actualSegLen;
          if (!dryRun && bPath) bPath.lineTo(cx, cy);
          nodes.push({ x: cx, y: cy, angle: cAngle });
        }
        
        if (dryRun) {
          const dist = Math.sqrt(cx * cx + cy * cy);
          if (dist > currentMaxRadius.value) currentMaxRadius.value = dist;
        }
        
        if (currentLevel < levels) {
          traverseTree(cx, cy, cAngle, branchLen * 0.75, currentLevel + 1, branchSeed + '_tip', dryRun, currentMaxRadius);
          
          const doSide = currentLevel === 1 || bRand() > 0.4;
          if (nodes.length > 1 && doSide) {
            const rNodeIdx = Math.floor(bRand() * (nodes.length - 1));
            const rNode = nodes[rNodeIdx];
            const sideAngleOff = (bRand() > 0.5 ? 0.8 : -0.8) * (bendFactor > 0 ? 1 : 0);
            traverseTree(rNode.x, rNode.y, rNode.angle + sideAngleOff, branchLen * 0.6, currentLevel + 1, branchSeed + '_side', dryRun, currentMaxRadius);
          }
        }
        
        if (!dryRun && currentLevel === levels && (obj.hasLeaves !== false)) {
          const leafR = 3 + bRand() * 3;
          leavesPath.moveTo(cx + leafR, cy);
          leavesPath.arc(cx, cy, leafR, 0, 2 * Math.PI);
        }
      }
    };
    
    const maxLevelsSum = (1 - Math.pow(0.75, levels)) / (1 - 0.75);
    const unscaledInitial = branchLengthPixels / maxLevelsSum;
    
    // Step 1: Cache the max radius to avoid re-running the dry run every frame
    let maxTreeRadius = LivingWorldRenderer.maxRadiusCache.get(baseSeed);
    if (maxTreeRadius === undefined) {
      const radiusTracker = { value: 1 };
      traverseTree(0, 0, 0, unscaledInitial, 1, baseSeed, true, radiusTracker);
      maxTreeRadius = radiusTracker.value;
      LivingWorldRenderer.maxRadiusCache.set(baseSeed, maxTreeRadius);
    }
    
    const treeScale = branchLengthPixels / maxTreeRadius;
    const initialSegmentLength = unscaledInitial * treeScale;
    
    // Step 2 & 3: Traverse and build Path2Ds (Megapaths)
    traverseTree(x, y, 0, initialSegmentLength, 1, baseSeed, false, { value: 1 });
    
    // Stroke all branches grouped by thickness
    for (const [thicknessStr, path] of Object.entries(branchPaths)) {
      ctx.lineWidth = parseFloat(thicknessStr);
      ctx.strokeStyle = bodyStroke;
      ctx.stroke(path);
    }
    
    // Fill all leaves in a single draw call
    if (obj.hasLeaves !== false) {
      ctx.fillStyle = '#2ea84b';
      ctx.fill(leavesPath);
    }
    
    // Central ball (trunk)
    ctx.beginPath();
    ctx.arc(x, y, size, 0, 2 * Math.PI);
    ctx.fillStyle = bodyFill;
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = bodyStroke;
    ctx.stroke();
  }
}
