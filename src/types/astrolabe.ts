export type CelestialObjectType = 'star' | 'planet' | 'moon' | 'asteroid' | 'station' | 'custom';

export interface CelestialObject {
  name: string;
  type: CelestialObjectType;
  size: number; // visual scale size
  description: string;
  orbitedObjectName: string | null;
  distanceOrbited: number; // radius from parent in AU or system units
  initialAngle: number; // angle in degrees at t=0
  orbitalPeriodDays?: number; // optional orbital override
}

export interface CrystalSphere {
  sphereName: string;
  currentCampaignDate: string;
  currentSystemDate: number; // elapsed days from start epoch
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
