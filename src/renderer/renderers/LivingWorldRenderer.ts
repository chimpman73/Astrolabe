import { BaseRenderer } from './BaseRenderer';
import { RenderContext } from '../../types/renderer';

import { PRNG } from '../utils/PRNG';

export class LivingWorldRenderer extends BaseRenderer {
  static #geometryCache = new Map<string, { 
    branches: Record<number, Path2D>, 
    leavesData: {x: number, y: number, rand: number}[], 
    maxRadius: number,
    navBitmap?: HTMLCanvasElement,
    navBitmapScale?: number,
    navBitmapBranchLength?: number,
    navBitmapStroke?: string,
    bookmarkBitmap?: HTMLCanvasElement,
    bookmarkBitmapScale?: number,
    bookmarkBitmapBranchLength?: number,
    bookmarkBitmapStroke?: string
  }>();

  public draw(context: RenderContext): void {
    const { ctx, x, y, obj, size, bodyStroke } = context;
    const levels = obj.branchLevels ?? 2;
    const density = obj.branchDensity ?? 3;
    const bendFactor = obj.branchBend ?? 0.5;
    
    // Set the max reach of the tree to be the visual size calculated by the ScaleManager
    const branchLengthPixels = size;
    const baseSeed = obj.name + (obj.orbitedObjectName || '');
    
    const cacheKey = `${baseSeed}_${levels}_${density}_${bendFactor}_${obj.hasLeaves}`;
    
    // Generate normalized geometry (scale = 1) if not cached
    if (!LivingWorldRenderer.#geometryCache.has(cacheKey)) {
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
        
        const rng = new PRNG(pathSeed);
        const rand = () => rng.next();
        const baseBranches = Math.max(1, Math.floor(density / 2));
        const branchSpread = currentLevel === 1 ? Math.PI * 2 : (Math.PI / 1.5);
        
        const numBranches = currentLevel === 1 
          ? Math.max(3, Math.floor(density)) 
          : baseBranches + Math.floor(rand() * 2) + 1;
          
        for (let i = 0; i < numBranches; i++) {
          const branchSeed = pathSeed + '_' + i;
          const bRng = new PRNG(branchSeed);
          const bRand = () => bRng.next();
          
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
            
            const dist = Math.sqrt(cx * cx + cy * cy);
            if (dist > currentMaxRadius.value) currentMaxRadius.value = dist;
          }
          
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
      
      LivingWorldRenderer.#geometryCache.set(cacheKey, {
        branches: branchPaths,
        leavesData: leavesData,
        maxRadius: radiusTracker.value
      });
    }
    
    // Retrieve cached geometry
    const cachedGeometry = LivingWorldRenderer.#geometryCache.get(cacheKey)!;
    
    // Calculate the scale required to match the target pixels on screen
    const scale = branchLengthPixels / cachedGeometry.maxRadius;
    
    // Separate the cache slots to prevent the Bookmark view and Nav view from overwriting each other
    // and causing the canvas to literally be recreated twice every single frame.
    const isBookmark = context.isBookmarkView === true;
    const currentBitmap = isBookmark ? cachedGeometry.bookmarkBitmap : cachedGeometry.navBitmap;
    const currentBitmapScale = isBookmark ? cachedGeometry.bookmarkBitmapScale : cachedGeometry.navBitmapScale;
    const currentBitmapStroke = isBookmark ? cachedGeometry.bookmarkBitmapStroke : cachedGeometry.navBitmapStroke;

    const needsNewBitmap = !currentBitmap || 
                           currentBitmapStroke !== bodyStroke ||
                           scale > (currentBitmapScale || 0) * 1.5 ||
                           scale < (currentBitmapScale || 0) * 0.5;

    let bmp = currentBitmap;

    if (needsNewBitmap) {
      // Create a padded offscreen canvas
      const padding = 10;
      const drawRadius = branchLengthPixels + padding;
      const idealCanvasSize = Math.ceil(drawRadius * 2);
      
      // Cap hardware size to 2048 to prevent extreme memory spikes when zoomed in massively
      const canvasSize = Math.min(idealCanvasSize, 2048);
      
      const canvas = document.createElement('canvas');
      canvas.width = canvasSize;
      canvas.height = canvasSize;
      const offCtx = canvas.getContext('2d')!;
      
      const hwScale = canvasSize / idealCanvasSize;
      const drawingScale = scale * hwScale;
      
      offCtx.translate(canvasSize / 2, canvasSize / 2);
      offCtx.scale(drawingScale, drawingScale);
      
      // Stroke all branches grouped by thickness
      const sizeScale = Math.max(1, Math.min(3, Math.pow(size / 12, 0.5)));
      for (const [thicknessStr, path] of Object.entries(cachedGeometry.branches)) {
        const visualThickness = parseFloat(thicknessStr) * 0.5;
        offCtx.lineWidth = (visualThickness * sizeScale) / drawingScale;
        offCtx.strokeStyle = bodyStroke;
        offCtx.stroke(path);
      }
      
      // Fill all leaves
      if (obj.hasLeaves !== false) {
        offCtx.fillStyle = '#2ea84b';
        offCtx.beginPath();
        for (const leaf of cachedGeometry.leavesData) {
          const targetPixelSize = 2 + leaf.rand * 0.5;
          const leafRadiusScaled = targetPixelSize / drawingScale;
          offCtx.moveTo(leaf.x + leafRadiusScaled, leaf.y);
          offCtx.arc(leaf.x, leaf.y, leafRadiusScaled, 0, 2 * Math.PI);
        }
        offCtx.fill();
      }
      
      bmp = canvas;
      if (isBookmark) {
        cachedGeometry.bookmarkBitmap = canvas;
        cachedGeometry.bookmarkBitmapScale = scale;
        cachedGeometry.bookmarkBitmapBranchLength = branchLengthPixels;
        cachedGeometry.bookmarkBitmapStroke = bodyStroke;
      } else {
        cachedGeometry.navBitmap = canvas;
        cachedGeometry.navBitmapScale = scale;
        cachedGeometry.navBitmapBranchLength = branchLengthPixels;
        cachedGeometry.navBitmapStroke = bodyStroke;
      }
    }
    
    // Calculate how much the tree has scaled since the bitmap was generated
    const originalScale = isBookmark ? cachedGeometry.bookmarkBitmapScale! : cachedGeometry.navBitmapScale!;
    const originalBranchLength = isBookmark ? cachedGeometry.bookmarkBitmapBranchLength! : cachedGeometry.navBitmapBranchLength!;
    
    const bmpScale = scale / originalScale;
    
    // We must scale the *original* ideal canvas size by bmpScale to prevent double-zooming
    const idealOriginalCanvasSize = Math.ceil((originalBranchLength + 10) * 2);
    const drawSize = idealOriginalCanvasSize * bmpScale;
    
    // Draw the generated bitmap
    ctx.drawImage(bmp!, x - drawSize / 2, y - drawSize / 2, drawSize, drawSize);
    
    // Solid trunk/planet component removed as per AST-033 specification.
  }
}
