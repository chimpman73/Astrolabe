export type CelestialObjectType =
  | 'star' | 'planet' | 'moon' | 'asteroid'
  | 'station' | 'cloud' | 'custom' | 'living_world';

export type WorldShape = 'sphere' | 'disc' | 'pyramid' | 'cluster' | 'irregular' | 'elliptical' | 'ring' | 'cylinder' | 'ship' | 'rectangular' | 'castle' | 'skull';
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
  /** If true, the object is completely hidden from map canvases (but still affects boundary calculations). */
  isHidden?: boolean;
  /** If false, the object is ignored when calculating the system's Crystal Sphere shell bounds. Defaults to true. */
  affectsShellBoundary?: boolean;
  /** If true, the object is only visible to the DM (not a PC object). By default, everything is a PC object (false). */
  isDMOnly?: boolean;
  /** If true, the object remains fixed at initialAngle and does not advance with time. */
  isStationary?: boolean;
  /** Direction of orbital travel. Retrograde moves clockwise (negative angular velocity). Defaults to prograde. */
  orbitDirection?: OrbitDirection;
  /** Visual shape of the celestial body. Defaults to sphere. */
  worldShape?: WorldShape;
  /** Elemental association for fantasy worlds. */
  elementAffinity?: ElementAffinity | null;
  /** For cloud types: angular arc width in degrees along the orbital path. */
  arcDegrees?: number;
  /** For cloud types: alpha transparency of the cloud (0.0 to 1.0). */
  cloudTransparency?: number;
  /** For cloud types: bumpiness of the cloud edges (0.0 is smooth, 1.0 is max cloudy). */
  cloudiness?: number;
  /** For cloud types: shape of objects drawn inside the cloud. */
  cloudObjectShape?: WorldShape;
  /** For cloud types: size of objects drawn inside the cloud. */
  cloudObjectSize?: number;
  /** For cloud types: density (or count) of objects drawn inside the cloud. */
  cloudObjectDensity?: number;
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
  /** For star types: multiplier for the corona size (default 1.5). */
  coronaSize?: number;
  /** For star types: alpha transparency of the corona (0.0 to 1.0, default 0.3). */
  coronaAlpha?: number;
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
  code?: string;
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
  onBackendError: (callback: (data: { type: string; message: string; stack?: string }) => void) => void;
}

declare global {
  interface Window {
    astrolabeAPI?: IAstrolabeAPI;
  }
}
