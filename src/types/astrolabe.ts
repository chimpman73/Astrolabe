export type CelestialObjectType =
  | 'star' | 'planet' | 'moon' | 'asteroid'
  | 'station' | 'nebula' | 'sargasso' | 'custom' | 'living_world';

export type WorldShape = 'sphere' | 'disc' | 'pyramid' | 'cluster' | 'irregular';
export type ElementAffinity = 'fire' | 'water' | 'earth' | 'air' | 'mixed';
export type OrbitDirection = 'prograde' | 'retrograde';

export interface CelestialObject {
  name: string;
  type: CelestialObjectType;
  size: number; // visual scale size
  description: string;
  orbitedObjectName: string | null;
  distanceOrbited: number; // radius from parent in AU or system units
  initialAngle: number; // angle in degrees at t=0
  orbitalPeriodDays?: number; // optional orbital override

  // --- Fantasy Extensions ---
  /** If true, the object remains fixed at initialAngle and does not advance with time. */
  isStationary?: boolean;
  /** Direction of orbital travel. Retrograde moves clockwise (negative angular velocity). Defaults to prograde. */
  orbitDirection?: OrbitDirection;
  /** Visual shape of the celestial body. Defaults to sphere. */
  worldShape?: WorldShape;
  /** Elemental association for fantasy worlds. */
  elementAffinity?: ElementAffinity | null;
  /** For nebula/sargasso types: angular arc width in degrees along the orbital path. */
  arcDegrees?: number;
  /** For living_world types: depth/tiers of branching. */
  branchLevels?: number;
  /** For living_world types: branching factor. */
  branchDensity?: number;
  /** For living_world types: how far branches extend in AU. */
  branchExtent?: number;
  /** For living_world types: whether to draw leaves at the tips. */
  hasLeaves?: boolean;
  /** For living_world types: how much the branches bend at nodes. */
  branchBend?: number;
}

export interface CrystalSphere {
  sphereName: string;
  currentCampaignDate: string;
  currentSystemDate: number; // elapsed days from start epoch
  shellBoundaryType?: 'double' | 'relativeMargin' | 'custom'; // 'double' = maxDist * 2, 'relativeMargin' = maxDist * 1.2, 'custom' = uses shellCustomScale
  shellCustomScale?: number;
  objects: CelestialObject[];
}

export interface IpcResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface SaveFileInfo {
  filename: string;
  fullPath: string;
  sphereName: string;
  currentCampaignDate: string;
  currentSystemDate: number;
}

// Window API augmentation for Electron
export interface IAstrolabeAPI {
  selectSaveDirectory: () => Promise<IpcResponse<string>>;
  listSavesDirectory: (dirPath: string) => Promise<IpcResponse<SaveFileInfo[]>>;
  loadJsonFile: (filePath: string) => Promise<IpcResponse<CrystalSphere>>;
  saveJsonFile: (filePath: string, data: CrystalSphere) => Promise<IpcResponse<void>>;
  exportPngFile: (dataUrl: string, defaultName: string) => Promise<IpcResponse<string>>;
  getDefaultSaveDirectory: () => Promise<IpcResponse<string>>;
}

declare global {
  interface Window {
    astrolabeAPI?: IAstrolabeAPI;
  }
}
