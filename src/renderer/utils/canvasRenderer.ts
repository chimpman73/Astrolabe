import { CelestialObject } from '../../types/astrolabe';

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

export const drawSolidBody = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  obj: CelestialObject,
  size: number,
  bodyFill: string,
  bodyStroke: string,
  drawEquatorialDetail: boolean = false,
  zoom: number = 1
) => {
  const shape = obj.worldShape ?? 'sphere';
  
  if (obj.type === 'living_world') {
    const levels = obj.branchLevels ?? 2;
    const density = obj.branchDensity ?? 3;
    const extentAU = obj.branchExtent ?? 2.5;
    const bendFactor = obj.branchBend ?? 0.5;
    
    // Convert AU to pixel length by multiplying by zoom factor
    const branchLengthPixels = extentAU * zoom;
    
    const baseSeed = obj.name + (obj.orbitedObjectName || '');
    
    let maxTreeRadius = 1;
    
    const traverseTree = (
      startX: number, startY: number, 
      baseAngle: number, 
      totalLength: number, 
      currentLevel: number,
      pathSeed: string,
      dryRun: boolean
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
        
        // Fixed topology based on seed, decoupled from length
        const numNodes = 3 + Math.floor(bRand() * 4); // 3 to 6 segments
        const actualSegLen = branchLen / numNodes;
        
        let cx = startX;
        let cy = startY;
        let cAngle = branchAngle;
        
        if (!dryRun) {
          ctx.beginPath();
          ctx.moveTo(cx, cy);
        }
        
        const nodes: {x: number, y: number, angle: number}[] = [];
        
        for (let n = 0; n < numNodes; n++) {
          cAngle += (bRand() - 0.5) * bendFactor; // bend at node using variable
          cx += Math.cos(cAngle) * actualSegLen;
          cy += Math.sin(cAngle) * actualSegLen;
          if (!dryRun) ctx.lineTo(cx, cy);
          nodes.push({ x: cx, y: cy, angle: cAngle });
        }
        
        if (!dryRun) {
          ctx.lineWidth = Math.max(1, thickness);
          ctx.strokeStyle = bodyStroke;
          ctx.stroke();
        }
        
        if (dryRun) {
          // dist is relative to origin if startX/Y was 0
          const dist = Math.sqrt(cx * cx + cy * cy);
          if (dist > maxTreeRadius) maxTreeRadius = dist;
        }
        
        if (currentLevel < levels) {
          // Main continuation from tip
          traverseTree(cx, cy, cAngle, branchLen * 0.75, currentLevel + 1, branchSeed + '_tip', dryRun);
          
          // Side branches from earlier nodes (guaranteed on level 1, random on others)
          const doSide = currentLevel === 1 || bRand() > 0.4;
          if (nodes.length > 1 && doSide) {
            // Pick a node from the middle/start, to clearly show it splitting off before the tip
            const rNodeIdx = Math.floor(bRand() * (nodes.length - 1));
            const rNode = nodes[rNodeIdx];
            const sideAngleOff = (bRand() > 0.5 ? 0.8 : -0.8) * (bendFactor > 0 ? 1 : 0);
            traverseTree(rNode.x, rNode.y, rNode.angle + sideAngleOff, branchLen * 0.6, currentLevel + 1, branchSeed + '_side', dryRun);
          }
        }
        
        // Leaves at tips
        if (!dryRun && currentLevel === levels && (obj.hasLeaves !== false)) {
          ctx.beginPath();
          ctx.arc(cx, cy, 3 + bRand() * 3, 0, 2 * Math.PI);
          ctx.fillStyle = '#2ea84b';
          ctx.fill();
        }
      }
    };
    
    // Determine the unscaled length
    const maxLevelsSum = (1 - Math.pow(0.75, levels)) / (1 - 0.75);
    const unscaledInitial = branchLengthPixels / maxLevelsSum;
    
    // Dry run to find actual max physical radius this tree will reach
    traverseTree(0, 0, 0, unscaledInitial, 1, baseSeed, true);
    
    // Scale up so the longest branch hits exactly branchLengthPixels
    const treeScale = branchLengthPixels / maxTreeRadius;
    const initialSegmentLength = unscaledInitial * treeScale;
    
    // Draw the branches behind the trunk
    traverseTree(x, y, 0, initialSegmentLength, 1, baseSeed, false);
    
    // Central ball (trunk)
    ctx.beginPath();
    ctx.arc(x, y, size, 0, 2 * Math.PI);
    ctx.fillStyle = bodyFill;
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = bodyStroke;
    ctx.stroke();
    
    return;
  }
  
  const drawShapePath = (s: number) => {
    ctx.beginPath();
    switch (shape) {
      case 'disc':
        ctx.ellipse(x, y, s, s * 0.35, 0, 0, 2 * Math.PI);
        break;
      case 'pyramid':
        ctx.moveTo(x, y - s * 1.2);
        ctx.lineTo(x + s, y + s * 0.7);
        ctx.lineTo(x - s, y + s * 0.7);
        ctx.closePath();
        break;
      case 'cluster': {
        const offs = s * 0.55; 
        ctx.arc(x - offs, y + offs * 0.4, s * 0.65, 0, 2 * Math.PI);
        ctx.moveTo(x + offs + s * 0.65, y + offs * 0.4);
        ctx.arc(x + offs, y + offs * 0.4, s * 0.65, 0, 2 * Math.PI);
        ctx.moveTo(x + s * 0.65, y - offs * 0.6);
        ctx.arc(x, y - offs * 0.6, s * 0.65, 0, 2 * Math.PI);
        break;
      }
      case 'irregular': {
        const ipts: [number, number][] = [
          [0, -1.0], [0.55, -0.65], [1.0, -0.05], [0.7, 0.65],
          [-0.1, 0.88], [-0.65, 0.55], [-0.95, 0.0], [-0.55, -0.7],
        ];
        const iradii = [1.0, 0.82, 0.95, 0.78, 0.88, 0.75, 0.92, 0.80];
        ipts.forEach(([dx, dy], i) => {
          const ir = s * iradii[i];
          if (i === 0) ctx.moveTo(x + dx * ir, y + dy * ir);
          else ctx.lineTo(x + dx * ir, y + dy * ir);
        });
        ctx.closePath();
        break;
      }
      default: // sphere
        ctx.arc(x, y, s, 0, 2 * Math.PI);
    }
  };

  if (obj.type === 'star') {
    const cSize = obj.coronaSize ?? 1.5;
    const cAlpha = obj.coronaAlpha ?? 0.3;
    ctx.save();
    drawShapePath(size * cSize);
    ctx.fillStyle = bodyFill;
    ctx.globalAlpha = cAlpha;
    ctx.fill();
    ctx.restore();
  }

  drawShapePath(size);
  ctx.fillStyle = bodyFill;
  ctx.fill();
  ctx.lineWidth = obj.type === 'star' ? 2 : 1.5;
  ctx.strokeStyle = bodyStroke;
  ctx.stroke();

  // Equatorial detail line for sphere/disc
  if (drawEquatorialDetail && (shape === 'sphere' || shape === 'disc') && (obj.type === 'planet' || size > 8)) {
    ctx.beginPath();
    ctx.moveTo(x - size, y);
    ctx.lineTo(x + size, y);
    ctx.stroke();
  }
};

export const getElementColor = (affinity: string | null) => {
  if (!affinity) return null;
  const elementColors: Record<string, string> = {
    fire: '#eab308', // yellow
    water: '#3b82f6', // blue
    earth: '#8b4513', // brown
    air: '#ffffff', // white
    mixed: '#22c55e', // green
  };
  return elementColors[affinity] || null;
};

export const getBodyColors = (
  obj: CelestialObject,
  isParchment: boolean,
  defaultBg: string,
  defaultStroke: string,
  defaultGold: string
) => {
  let bodyFill = defaultBg;
  let bodyStroke = defaultStroke;

  const elemColor = getElementColor(obj.elementAffinity ?? null);

  if (obj.type === 'star') {
    bodyFill = elemColor || defaultGold;
    bodyStroke = defaultStroke;
  } else if (obj.type === 'moon') {
    bodyFill = elemColor || (isParchment ? '#dcd2b9' : '#555866');
  } else if (obj.type === 'cloud') {
    bodyFill = elemColor || (isParchment ? '#808080' : '#a0a0a0');
    bodyStroke = isParchment ? '#505050' : '#d0d0d0';
  } else if (obj.type === 'living_world') {
    bodyFill = elemColor || (isParchment ? '#7c8e6b' : '#3d5c34');
    bodyStroke = isParchment ? '#4a3d31' : '#6b5443';
  } else {
    if (elemColor) bodyFill = elemColor;
  }

  return { bodyFill, bodyStroke };
};

export const drawStationaryIndicator = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string
) => {
  const ds = size + 5;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x, y - ds);
  ctx.lineTo(x + ds, y);
  ctx.lineTo(x, y + ds);
  ctx.lineTo(x - ds, y);
  ctx.closePath();
  ctx.strokeStyle = color;
  ctx.lineWidth = 0.75;
  ctx.stroke();
  ctx.restore();
};

export const getMotionSuffix = (isStationary?: boolean, direction?: string) => {
  return isStationary ? ' ◆' : direction === 'retrograde' ? ' ↺' : '';
};
