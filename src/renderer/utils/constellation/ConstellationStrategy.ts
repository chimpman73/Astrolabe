export interface ConstellationPoint {
  x: number;
  y: number;
}

export interface ConstellationEdge {
  p1: ConstellationPoint;
  p2: ConstellationPoint;
}

export interface ConstellationData {
  points: ConstellationPoint[];
  edges: ConstellationEdge[];
  triangles?: [number, number, number][];
}

export interface IConstellationStrategy {
  /**
   * Generates a constellation graph (points and connecting edges) from an SVG path.
   * @param pathData The raw d="..." string.
   * @param path2d The Path2D object representing the shape (useful for isPointInPath).
   * @param detailLevel A numeric parameter controlling the density/complexity of the graph.
   * @param starCount Optional parameter defining how many nodes (stars) we want.
   * @param randomSeed Optional string to seed random placement for determinism.
   */
  generate(
    pathData: string,
    path2d: Path2D,
    detailLevel: number,
    randomSeed: string
  ): ConstellationData;
}
