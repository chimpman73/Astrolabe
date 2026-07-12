import { CelestialObject } from './astrolabe';

export interface RenderContext {
  ctx: CanvasRenderingContext2D;
  x: number;
  y: number;
  obj: CelestialObject;
  size: number;
  bodyFill: string;
  bodyStroke: string;
  drawEquatorialDetail?: boolean;
  zoom?: number;
  
  // Advanced context for clouds/rings
  isBookmarkView?: boolean;
  parentX?: number;
  parentY?: number;
  orbitRadius?: number;
  orbitAngle?: number;
  bookmarkWidth?: number; // width in Bookmark view
  bookmarkR?: number; // distance to center in bookmark view
  bookmarkCenterY?: number; // y coordinate of center in bookmark view
  isExport?: boolean;
  exportScale?: number;
}

export interface MapStyleContext {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  activeZoom: number;
  activePan: { x: number; y: number };
  objects: CelestialObject[];
  visibleObjects: CelestialObject[];
  positions: Record<string, { x: number; y: number; angle: number; period: number }>;
  activeSphere: import('./astrolabe').CrystalSphere | null;
  currentSystemDate: number;
  isPrimary: (obj: CelestialObject) => boolean;
  project: (x: number, y: number) => { x: number; y: number };
  decorations?: ParchmentDecoration[];
  fontsLoaded?: boolean;
  isExport?: boolean;
  selectedObjectId: string | null;
}

export interface ParchmentDecoration {
  type: 'ink' | 'coffee' | 'burn';
  x: number;
  y: number;
  rotation: number;
  scale: number;
  opacity: number;
}

export interface INavigationChartRenderer {
  render(context: MapStyleContext): void;
}

export interface BookmarkStyleConfig {
  isDarkTheme: boolean;
  backgroundColor: string;
  strokeColor: string;
  mutedColor: string;
}

export interface NavigationChartStyleConfig {
  isDarkTheme: boolean;
  // Base Colors
  backgroundColor: string;
  gridColor: string;
  strokeColor: string;
  mutedColor: string;
  goldColor: string;
  
  // Background Textures/Images
  backgroundImageUrl?: string;
  foregroundImageUrl?: string;
  
  // Fonts
  titleFontFamily: string;
  starFontFamily: string;
  defaultFontFamily: string;
  
  // Title / Strike color
  titleStrikeColor?: string;
  titleStrikeThicknessMultiplier: number;
  
  // Orbits
  primaryOrbitAlpha: number;
  secondaryOrbitAlpha: number;
  primaryOrbitRgb: string;
  secondaryOrbitRgb: string; 

  // Shell colors
  shellStrokeColor: string;
  shellInnerStrokeColor: string;
  shellShadowColor?: string;
  
  // Features
  hasDecorations: boolean;
  
  // Directory specific
  directoryDividerColor: string;
  directoryTitleColor: string;
  directorySubTitleColor: string;
  directoryIconColor: string | null;
  directoryTextColor: string;
  
  // Notes / Legends
  noteTextColor: string;
  noteSelectionColor: string;
  legendBorderColor: string;
  legendTextColor: string;
  legendTitleColor: string;
  
  // Asset Paths (Symbols/Icons)
  assets: {
    elements: {
      fire: string;
      water: string;
      earth: string;
      air: string;
      mixed: string;
      none: string;
    };
    objects: {
      star: string;
      planet: string;
      moon: string;
      asteroid: string;
      station: string;
      cloud: string;
      living_world: string;
      custom: string;
    };
    decorations?: {
      ink: string;
      coffee: string;
      burn: string;
    };
  };
}
