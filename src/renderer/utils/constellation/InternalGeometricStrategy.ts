import { IConstellationStrategy, ConstellationData, ConstellationPoint, ConstellationEdge } from './ConstellationStrategy';

import { PRNG } from '../PRNG';
import { UnionFind } from '../UnionFind';

export class InternalGeometricStrategy implements IConstellationStrategy {
  public generate(
    _pathData: string,
    path2d: Path2D,
    detailLevel: number,
    randomSeed: string
  ): ConstellationData {
    const rng = new PRNG(randomSeed || 'default_seed');
    
    // We need a temporary context for isPointInPath
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error("Failed to get 2d context for constellation strategy");
    }

    const points: ConstellationPoint[] = [];
    
    // 1. Generate internal points
    // Constellation bounds are usually 0-100 based on our generate-shape tool.
    // However, if the path exceeds 100, we still sample within 0-100 since viewBox is 100x100.
    const maxAttempts = 5000;
    let attempts = 0;
    
    // Wireframe Detail Level exclusively dictates how complex the wireframe is (how many internal nodes to generate)
    const targetPoints = Math.max(3, detailLevel);

    while (points.length < targetPoints && attempts < maxAttempts) {
      const x = rng.next() * 100;
      const y = rng.next() * 100;
      
      // Check if point is inside the SVG path
      if (ctx.isPointInPath(path2d, x, y)) {
        points.push({ x, y });
      }
      attempts++;
    }

    // 2. Build potential edges and validate they don't cross empty space
    const validEdges: { p1: ConstellationPoint, p2: ConstellationPoint, dist: number, i: number, j: number }[] = [];
    
    for (let i = 0; i < points.length; i++) {
      for (let j = i + 1; j < points.length; j++) {
        const p1 = points[i];
        const p2 = points[j];
        
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        // Exclude incredibly long edges from even being considered to keep it local
        if (dist > 60) continue;

        // Check midpoint and quarter points to ensure line doesn't cross outside
        const samples = 5;
        let isValid = true;
        for (let s = 1; s <= samples; s++) {
          const t = s / (samples + 1);
          const sx = p1.x + t * dx;
          const sy = p1.y + t * dy;
          if (!ctx.isPointInPath(path2d, sx, sy)) {
            isValid = false;
            break;
          }
        }

        if (isValid) {
          validEdges.push({ p1, p2, dist, i, j });
        }
      }
    }

    // Sort edges by distance (Kruskal's algorithm for MST)
    validEdges.sort((a, b) => a.dist - b.dist);

    // 3. Generate Minimum Spanning Tree (MST)
    const uf = new UnionFind(points.length);
    const edges: ConstellationEdge[] = [];
    const unusedEdges: typeof validEdges = [];

    for (const edge of validEdges) {
      if (uf.find(edge.i) !== uf.find(edge.j)) {
        uf.union(edge.i, edge.j);
        edges.push({ p1: edge.p1, p2: edge.p2 });
      } else {
        unusedEdges.push(edge);
      }
    }

    // 4. Add geometric loops (triangles, quads)
    // We add back a fraction of the unused valid edges. We favor shorter edges.
    const loopFactor = 0.15; // 15% of remaining valid edges added back
    const edgesToAdd = Math.floor(unusedEdges.length * loopFactor);
    
    for (let i = 0; i < edgesToAdd; i++) {
      // Unused edges are already sorted by distance, so taking from the beginning
      // favors small, tight geometric shapes (triangles/quads).
      const edge = unusedEdges[i];
      edges.push({ p1: edge.p1, p2: edge.p2 });
    }

    return { points, edges };
  }
}
