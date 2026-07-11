export class UnionFind {
  #parent: number[];
  constructor(size: number) {
    this.#parent = Array.from({ length: size }, (_, i) => i);
  }
  find(i: number): number {
    if (this.#parent[i] === i) return i;
    this.#parent[i] = this.find(this.#parent[i]);
    return this.#parent[i];
  }
  union(i: number, j: number): void {
    const rootI = this.find(i);
    const rootJ = this.find(j);
    if (rootI !== rootJ) {
      this.#parent[rootI] = rootJ;
    }
  }
}
