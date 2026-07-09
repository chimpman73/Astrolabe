import { IConstellationStrategy, ConstellationData, ConstellationPoint, ConstellationEdge } from './ConstellationStrategy';

export class OutlineStrategy implements IConstellationStrategy {
  public generate(
    pathData: string,
    _path2d: Path2D,
    detailLevel: number,
    _randomSeed: string
  ): ConstellationData {
    const pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    pathEl.setAttribute('d', pathData);
    
    // totalLength requires the element to be in the DOM in some browsers, but in many modern browsers it works detached.
    // If it fails, fallback gracefully (handled in caller).
    const totalLength = pathEl.getTotalLength();
    
    const points: ConstellationPoint[] = [];
    const steps = Math.max(2, detailLevel);
    const stepLength = totalLength / steps;
    
    for (let i = 0; i <= steps; i++) {
      const pt = pathEl.getPointAtLength(i * stepLength);
      points.push({ x: pt.x, y: pt.y });
    }

    const edges: ConstellationEdge[] = [];
    for (let i = 0; i < points.length - 1; i++) {
      edges.push({ p1: points[i], p2: points[i + 1] });
    }

    return { points, edges };
  }
}
