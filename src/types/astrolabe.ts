export type PhysicalBodyType = 'star' | 'planet' | 'moon' | 'asteroid' | 'station' | 'custom' | 'living_world';
export type PhenomenonType = 'cloud';
export type ConstellationType = 'constellation';
export type MapOverlayType = 'note' | 'legend';
export type GroupType = 'group';

export type CelestialObjectType = PhysicalBodyType | PhenomenonType | ConstellationType | MapOverlayType | GroupType;

export type WorldShape = 'sphere' | 'disc' | 'pyramid' | 'cluster' | 'irregular' | 'elliptical' | 'ring' | 'cylinder' | 'ship' | 'rectangular' | 'castle' | 'skull' | 'custom' | 'hollow_world';
export type ElementAffinity = 'fire' | 'water' | 'earth' | 'air' | 'mixed' | 'none';
export type OrbitDirection = 'prograde' | 'retrograde';
export type SizeClass = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I' | 'J';
export type SizeUnit = 'miles' | 'AU';

export interface ICelestialBase {
  id: string;
  name: string;
  type: CelestialObjectType;
  description: string;
  isHidden?: boolean;
  isDMOnly?: boolean;
  groupId?: string;
  
  // Legacy support during migration/renderers
  groupName?: string;
  orbitedObjectName?: string | null;
  
  // Optional shared properties
  distanceOrbited?: number;
  initialAngle?: number;
  sizeClass?: SizeClass;
  physicalSize?: number;
  sizeUnit?: SizeUnit;
  isStationary?: boolean;
  orbitEccentricity?: number;
  orbitRotation?: number;
  orbitDirection?: string;
  orbitalPeriodDays?: number;
  affectsShellBoundary?: boolean;
  elementAffinity?: ElementAffinity | null;
  worldShape?: WorldShape;
  customShapeName?: string;
  shapeRotation?: number;
  hasLeaves?: boolean;
  branchLevels?: number;
  branchDensity?: number;
  branchBend?: number;
  coronaSize?: number;
  coronaAlpha?: number;
  cloudTransparency?: number;
  cloudiness?: number;
  cloudObjectShape?: WorldShape;
  cloudObjectSizeClass?: SizeClass;
  cloudObjectPhysicalSize?: number;
  cloudObjectDensity?: number;
  cloudObjectCustomShapeName?: string;
  cloudObjectShapeRotation?: number;
  arcDegrees?: number;
  constellationDetail?: number;
  constellationStarCount?: number;
  constellationStyle?: string;
  constellationFlipX?: boolean;
  constellationFillAlpha?: number;
  constellationStarMinSizeClass?: SizeClass;
  constellationStarMaxSizeClass?: SizeClass;
  noteDistanceAU?: number;
  noteAngle?: number;
  noteRotation?: number;
}

export interface IGroup extends ICelestialBase {
  type: GroupType;
}

export interface IPhysicalBody extends ICelestialBase {
  type: PhysicalBodyType;
  sizeClass?: SizeClass;
  physicalSize?: number;
  sizeUnit?: SizeUnit;
  /** @deprecated The old visual size property. Use physicalSize instead. */
  size?: number;
  
  subOrbiters?: (IPhysicalBody | IPhenomenon)[];
  
  distanceOrbited: number; 
  initialAngle: number; 
  orbitalPeriodDays?: number; 
  orbitEccentricity?: number;
  orbitRotation?: number;
  isStationary?: boolean;
  orbitDirection?: OrbitDirection;
  
  worldShape?: WorldShape;
  customShapeName?: string;
  elementAffinity?: ElementAffinity | null;
  affectsShellBoundary?: boolean;
  
  coronaSize?: number;
  coronaAlpha?: number;
  
  branchLevels?: number;
  branchDensity?: number;
  hasLeaves?: boolean;
  branchBend?: number;
}

export interface IPhenomenon extends ICelestialBase {
  type: PhenomenonType;
  
  distanceOrbited: number;
  initialAngle: number;
  orbitalPeriodDays?: number;
  orbitEccentricity?: number;
  orbitRotation?: number;
  isStationary?: boolean;
  orbitDirection?: OrbitDirection;
  affectsShellBoundary?: boolean;
  
  arcDegrees?: number;
  cloudTransparency?: number;
  cloudiness?: number;
  cloudObjectShape?: WorldShape;
  cloudObjectSizeClass?: SizeClass;
  cloudObjectPhysicalSize?: number;
  cloudObjectDensity?: number;
  cloudObjectCustomShapeName?: string;
  cloudObjectShapeRotation?: number;
}

export interface IConstellation extends ICelestialBase {
  type: ConstellationType;
  constellationDetail?: number;
  constellationStarCount?: number;
  constellationStarMinSizeClass?: SizeClass;
  constellationStarMaxSizeClass?: SizeClass;
  constellationStyle?: 'outline' | 'internal';
  constellationFillAlpha?: number;
  constellationFlipX?: boolean;
  
  // They sometimes orbit or have placement angles based on initialAngle in legacy
  initialAngle?: number;
  distanceOrbited?: number;
}

export interface IMapOverlay extends ICelestialBase {
  type: MapOverlayType;
  noteDistanceAU?: number;
  noteAngle?: number;
  noteRotation?: number;
  noteFontSize?: number;
  noteFontFamily?: string;
  noteMaxWidth?: number;
  noteMaxHeight?: number;
  noteCorners?: {
    tl: { x: number; y: number };
    tr: { x: number; y: number };
    bl: { x: number; y: number };
    br: { x: number; y: number };
  };
  
  legendType?: 'OrbitType' | 'ElementalAffinity' | 'PlanetType';
  legendMode?: 'full' | 'partial';
  legendDistanceAU?: number;
  legendAngle?: number;
  legendFontSize?: number;
  legendFontFamily?: string;
  legendScale?: number;
}

// Keeping this as a union type so that generic components like 'ObjectIcon' can still accept any of them
export type CelestialObject = IPhysicalBody | IPhenomenon | IConstellation | IMapOverlay | IGroup;

export interface CrystalSphere {
  version?: number; // 2 for V2 Schema
  sphereName: string;
  campaignYear?: number;
  campaignDay?: number;
  epoch?: string;
  currentSystemDate: number; 
  shellBoundaryType?: 'double' | 'relativeMargin' | 'custom'; 
  shellCustomScale?: number;
  orbitalDrawStrength?: number;
  navChartPlanetSizeOffset?: number;
  navTitleStrike?: boolean;
  
  // V1 Schema
  objects?: CelestialObject[];
  
  // V2 Schema
  groups?: IGroup[];
  celestialBodies?: IPhysicalBody[];
  phenomena?: IPhenomenon[];
  constellations?: IConstellation[];
  mapOverlays?: IMapOverlay[];
  
  // Ordering across all object categories
  objectOrder?: string[];
}

interface IpcResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

export interface SaveFileInfo {
  filename: string;
  fullPath: string;
  sphereName: string;
  campaignYear?: number;
  campaignDay?: number;
  epoch?: string;
  currentSystemDate: number;
}

// Window API augmentation for Electron
interface IAstrolabeAPI {
  selectSaveDirectory: () => Promise<IpcResponse<string>>;
  listSavesDirectory: (dirPath: string) => Promise<IpcResponse<SaveFileInfo[]>>;
  loadJsonFile: (filePath: string) => Promise<IpcResponse<CrystalSphere>>;
  saveJsonFile: (filePath: string, data: CrystalSphere) => Promise<IpcResponse<void>>;
  exportPngFile: (dataUrl: string, defaultName: string) => Promise<IpcResponse<string>>;
  getDefaultSaveDirectory: () => Promise<IpcResponse<string>>;
  listShapesDirectory: () => Promise<IpcResponse<string[]>>;
  loadShape: (shapeName: string) => Promise<IpcResponse<string>>;
  loadShapeSkeleton: (shapeName: string) => Promise<IpcResponse<any>>;
  saveCustomShape: (data: { shapeName: string; svgContent: string; skeletonData: any }) => Promise<IpcResponse<void>>;
  deleteCustomShape: (shapeName: string) => Promise<IpcResponse<void>>;
  generateImageFromPrompt: (data: { prompt: string; provider: 'gemini' | 'openai'; apiKey: string }) => Promise<IpcResponse<string>>;
  traceAndSkeletonize: (data: { imageBase64: string; traceParams: { turnpolicy?: number; turdsize?: number; alphamax?: number; algorithm?: 'thinning' | 'triangulation' } }) => Promise<IpcResponse<{ svgContent: string; skeletonData: any }>>;
  selectImageFile: () => Promise<IpcResponse<{ base64Data: string; filename: string }>>;
  onBackendError: (callback: (data: { type: string; message: string; stack?: string }) => void) => void;
  onMenuAction: (callback: (action: string) => void) => void;
}

declare global {
  interface Window {
    astrolabeAPI?: IAstrolabeAPI;
  }
}
