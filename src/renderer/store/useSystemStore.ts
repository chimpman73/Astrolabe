import { create } from 'zustand';
import { 
  CrystalSphere, SaveFileInfo, CelestialObject, ICelestialBase,
  IPhysicalBody, IPhenomenon, IConstellation, IMapOverlay, IGroup 
} from '../../types/astrolabe';
import { ParchmentDecoration } from '../../types/renderer';

interface SystemState {
  saveDirectory: string | null;
  savesList: SaveFileInfo[];
  activeSphere: CrystalSphere | null;
  currentSystemDate: number;
  activeView: 'bookmark' | 'navchart';
  bookmarkBackgroundMode: 'light' | 'dark';
  bookmarkShowShell: boolean;
  bookmarkShowDistance: boolean;
  toastMessage: { type: 'success' | 'error'; text: string } | null;
  decorations: ParchmentDecoration[];
  
  // Actions
  setSaveDirectory: (path: string) => Promise<void>;
  loadSavesList: () => Promise<void>;
  loadSphere: (filePath: string) => Promise<boolean>;
  saveCurrentSphere: () => Promise<boolean>;
  createNewSphere: () => Promise<void>;
  setActiveView: (view: 'bookmark' | 'navchart') => void;
  setBookmarkBackgroundMode: (mode: 'light' | 'dark') => void;
  setBookmarkShowShell: (show: boolean) => void;
  setBookmarkShowDistance: (show: boolean) => void;
  setCurrentSystemDate: (date: number) => void;
  advanceSystemDate: (days: number) => void;
  
  // V2 Actions using ID instead of index
  updateCelestialObject: (id: string, updated: Partial<CelestialObject>) => void;
  removeCelestialObject: (id: string) => void;
  addCelestialObject: (object: CelestialObject) => void;
  // Reorder needs to know which list and where, or just pass a new flattened structure
  // For simplicity, we can provide a method to set the entire array of a category
  setCategoryArray: <K extends keyof CrystalSphere>(category: K, arr: CrystalSphere[K]) => void;
  
  updateActiveSphereMeta: (meta: Partial<Omit<CrystalSphere, 'objects' | 'groups' | 'celestialBodies' | 'phenomena' | 'constellations' | 'mapOverlays'>>) => void;
  setSphere: (sphere: CrystalSphere) => void;
  setToastMessage: (toast: { type: 'success' | 'error'; text: string } | null) => void;
  viewMode: 'PC' | 'DM';
  setViewMode: (mode: 'PC' | 'DM') => void;
  generateDecorations: (maxRadius: number) => void;
  clearDecorations: () => void;
  selectedObjectId: string | null;
  setSelectedObjectId: (id: string | null) => void;
}

// Generate a simple ID
const generateId = () => Math.random().toString(36).substring(2, 9);

function migrateToV2(v1Data: any): CrystalSphere {
  if (v1Data.version === 2) return v1Data; // already migrated
  
  const v2Sphere: CrystalSphere = {
    version: 2,
    sphereName: v1Data.sphereName || 'Untitled System',
    currentCampaignDate: v1Data.currentCampaignDate || new Date().toISOString().split('T')[0],
    currentSystemDate: v1Data.currentSystemDate || 0,
    shellBoundaryType: v1Data.shellBoundaryType || 'double',
    shellCustomScale: v1Data.shellCustomScale,
    orbitalDrawStrength: v1Data.orbitalDrawStrength,
    navChartPlanetSizeOffset: v1Data.navChartPlanetSizeOffset,
    navTitleStrike: v1Data.navTitleStrike,
    groups: [],
    celestialBodies: [],
    phenomena: [],
    constellations: [],
    mapOverlays: []
  };

  const oldObjects = v1Data.objects || [];
  
  // Map old names to new IDs since orbitedObjectName uses names
  const nameToId = new Map<string, string>();
  oldObjects.forEach((obj: any) => {
    const id = generateId();
    nameToId.set(obj.name, id);
    obj.id = id;
  });

  oldObjects.forEach((obj: any) => {
    // Basic fields
    const base: any = {
      id: obj.id,
      name: obj.name,
      type: obj.type,
      description: obj.description || '',
      isHidden: obj.isHidden,
      isDMOnly: obj.isDMOnly,
      groupId: obj.groupName, // Legacy fallback for now, we will link it later if it's a real group
      orbitedObjectName: obj.orbitedObjectName // Keep legacy reference for now
    };

    if (obj.type === 'group') {
      v2Sphere.groups!.push(base as IGroup);
    } 
    else if (obj.type === 'cloud') {
      v2Sphere.phenomena!.push({
        ...base,
        distanceOrbited: obj.distanceOrbited || 0,
        initialAngle: obj.initialAngle || 0,
        orbitalPeriodDays: obj.orbitalPeriodDays,
        orbitEccentricity: obj.orbitEccentricity,
        orbitRotation: obj.orbitRotation,
        isStationary: obj.isStationary,
        orbitDirection: obj.orbitDirection,
        affectsShellBoundary: obj.affectsShellBoundary ?? true,
        arcDegrees: obj.arcDegrees,
        cloudTransparency: obj.cloudTransparency,
        cloudiness: obj.cloudiness,
        cloudObjectShape: obj.cloudObjectShape,
        cloudObjectSizeClass: obj.cloudObjectSizeClass,
        cloudObjectPhysicalSize: obj.cloudObjectPhysicalSize || obj.cloudObjectSize,
        cloudObjectDensity: obj.cloudObjectDensity
      } as IPhenomenon);
    }
    else if (obj.type === 'constellation') {
      v2Sphere.constellations!.push({
        ...base,
        constellationDetail: obj.constellationDetail,
        constellationStarCount: obj.constellationStarCount,
        constellationStarMinSizeClass: obj.constellationStarMinSizeClass,
        constellationStarMaxSizeClass: obj.constellationStarMaxSizeClass,
        constellationStyle: obj.constellationStyle,
        constellationFillAlpha: obj.constellationFillAlpha,
        constellationFlipX: obj.constellationFlipX,
        initialAngle: obj.initialAngle,
        distanceOrbited: obj.distanceOrbited
      } as IConstellation);
    }
    else if (obj.type === 'note' || obj.type === 'legend') {
      v2Sphere.mapOverlays!.push({
        ...base,
        noteDistanceAU: obj.noteDistanceAU || obj.distanceOrbited,
        noteAngle: obj.noteAngle || obj.initialAngle,
        noteRotation: obj.noteRotation,
        noteFontSize: obj.noteFontSize,
        noteFontFamily: obj.noteFontFamily,
        noteMaxWidth: obj.noteMaxWidth,
        noteMaxHeight: obj.noteMaxHeight,
        noteCorners: obj.noteCorners,
        legendType: obj.legendType,
        legendMode: obj.legendMode,
        legendDistanceAU: obj.legendDistanceAU || obj.distanceOrbited,
        legendAngle: obj.legendAngle || obj.initialAngle,
        legendFontSize: obj.legendFontSize,
        legendFontFamily: obj.legendFontFamily,
        legendScale: obj.legendScale
      } as IMapOverlay);
    }
    else {
      // Physical bodies
      v2Sphere.celestialBodies!.push({
        ...base,
        sizeClass: obj.sizeClass || 'D',
        physicalSize: obj.physicalSize || obj.size || 1000,
        sizeUnit: obj.sizeUnit || 'miles',
        distanceOrbited: obj.distanceOrbited || 0,
        initialAngle: obj.initialAngle || 0,
        orbitalPeriodDays: obj.orbitalPeriodDays,
        orbitEccentricity: obj.orbitEccentricity,
        orbitRotation: obj.orbitRotation,
        isStationary: obj.isStationary,
        orbitDirection: obj.orbitDirection,
        worldShape: obj.worldShape,
        customShapeName: obj.customShapeName,
        elementAffinity: obj.elementAffinity,
        affectsShellBoundary: obj.affectsShellBoundary ?? true,
        coronaSize: obj.coronaSize,
        coronaAlpha: obj.coronaAlpha,
        branchLevels: obj.branchLevels,
        branchDensity: obj.branchDensity,
        hasLeaves: obj.hasLeaves,
        branchBend: obj.branchBend
      } as IPhysicalBody);
    }
  });

  // Convert groupName to groupId
  const findGroupIdByName = (name: string) => {
    const grp = v2Sphere.groups!.find(g => g.name === name);
    return grp ? grp.id : undefined;
  };

  const updateGroupId = (arr: ICelestialBase[]) => {
    arr.forEach(obj => {
      if (obj.groupId && !v2Sphere.groups!.find(g => g.id === obj.groupId)) {
        // It's probably a legacy name, convert to ID
        obj.groupId = findGroupIdByName(obj.groupId);
      }
    });
  };

  updateGroupId(v2Sphere.celestialBodies!);
  updateGroupId(v2Sphere.phenomena!);
  updateGroupId(v2Sphere.constellations!);
  updateGroupId(v2Sphere.mapOverlays!);

  return v2Sphere;
}

export const useSystemStore = create<SystemState>((set, get) => ({
  saveDirectory: null,
  savesList: [],
  activeSphere: null,
  currentSystemDate: 0,
  activeView: 'navchart',
  bookmarkBackgroundMode: 'dark',
  bookmarkShowShell: true,
  bookmarkShowDistance: true,
  toastMessage: null,
  viewMode: 'PC',
  decorations: [],
  selectedObjectId: null,

  setSelectedObjectId: (id) => set({ selectedObjectId: id }),
  setViewMode: (mode) => set({ viewMode: mode }),

  generateDecorations: (maxRadius: number) => {
    const numDecorations = Math.floor(Math.random() * 5) + 5;
    const newDecorations: ParchmentDecoration[] = [];
    const types: ('ink' | 'coffee' | 'burn')[] = ['ink', 'ink', 'ink', 'coffee', 'burn'];

    for (let i = 0; i < numDecorations; i++) {
      const angle = Math.random() * Math.PI * 2;
      const minRadius = maxRadius * 0.4;
      const radius = minRadius + (Math.random() * (maxRadius * 1.5 - minRadius));
      newDecorations.push({
        type: types[Math.floor(Math.random() * types.length)],
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
        rotation: Math.random() * Math.PI * 2,
        scale: 0.5 + Math.random() * 1.5,
        opacity: 0.15 + Math.random() * 0.25,
      });
    }
    set({ decorations: newDecorations });
  },

  clearDecorations: () => set({ decorations: [] }),

  setSaveDirectory: async (path: string) => {
    set({ saveDirectory: path });
    localStorage.setItem('astrolabe_save_dir', path);
    await get().loadSavesList();
  },

  loadSavesList: async () => {
    const { saveDirectory } = get();
    if (!saveDirectory) return;

    if (window.astrolabeAPI) {
      try {
        const res = await window.astrolabeAPI.listSavesDirectory(saveDirectory);
        if (res.success && res.data) {
          set({ savesList: res.data });
        } else {
          get().setToastMessage({ type: 'error', text: res.error || 'Failed to list directory' });
        }
      } catch (err: any) {
        get().setToastMessage({ type: 'error', text: err.message || 'Error accessing directory' });
      }
    }
  },

  loadSphere: async (filePath: string) => {
    if (window.astrolabeAPI) {
      try {
        const res = await window.astrolabeAPI.loadJsonFile(filePath);
        if (res.success && res.data) {
          const migratedSphere = migrateToV2(res.data);
          set({
            activeSphere: migratedSphere,
            currentSystemDate: migratedSphere.currentSystemDate || 0,
            selectedObjectId: null
          });
          localStorage.setItem('astrolabe_last_loaded_file', filePath);
          return true;
        } else {
          get().setToastMessage({ type: 'error', text: res.error || 'Failed to load system' });
        }
      } catch (err: any) {
        get().setToastMessage({ type: 'error', text: err.message || 'Error loading file' });
      }
    }
    return false;
  },

  saveCurrentSphere: async () => {
    const { activeSphere, saveDirectory, currentSystemDate } = get();
    if (!activeSphere || !saveDirectory) return false;

    const dataToSave: CrystalSphere = {
      ...activeSphere,
      currentSystemDate: currentSystemDate,
    };

    const fileName = `${dataToSave.sphereName.toLowerCase().replace(/[^a-z0-9]/g, '_')}.json`;
    const filePath = window.astrolabeAPI ? `${saveDirectory}/${fileName}` : fileName;

    if (window.astrolabeAPI) {
      try {
        const res = await window.astrolabeAPI.saveJsonFile(filePath, dataToSave);
        if (res.success) {
          localStorage.setItem('astrolabe_last_loaded_file', filePath);
          await get().loadSavesList();
          return true;
        } else {
          get().setToastMessage({ type: 'error', text: res.error || 'Failed to save system' });
        }
      } catch (err: any) {
        get().setToastMessage({ type: 'error', text: err.message || 'Error saving file' });
      }
    }
    return false;
  },

  createNewSphere: async () => {
    const defaultSphere: CrystalSphere = {
      version: 2,
      sphereName: 'Untitled System',
      currentCampaignDate: new Date().toISOString().split('T')[0],
      currentSystemDate: 0,
      groups: [],
      celestialBodies: [],
      phenomena: [],
      constellations: [],
      mapOverlays: []
    };

    set({
      activeSphere: defaultSphere,
      currentSystemDate: 0,
      selectedObjectId: null
    });
  },

  setActiveView: (view) => set({ activeView: view }),
  setBookmarkBackgroundMode: (mode) => set({ bookmarkBackgroundMode: mode }),
  setBookmarkShowShell: (show) => set({ bookmarkShowShell: show }),
  setBookmarkShowDistance: (show) => set({ bookmarkShowDistance: show }),
  setToastMessage: (toast) => {
    set({ toastMessage: toast });
    if (toast) {
      setTimeout(() => {
        const currentToast = get().toastMessage;
        if (currentToast && currentToast.text === toast.text) {
          set({ toastMessage: null });
        }
      }, 3500);
    }
  },
  
  setCurrentSystemDate: (date) => {
    set({ currentSystemDate: date });
    const { activeSphere } = get();
    if (activeSphere) {
      set({ activeSphere: { ...activeSphere, currentSystemDate: date } });
    }
  },

  advanceSystemDate: (days) => {
    const newDate = get().currentSystemDate + days;
    get().setCurrentSystemDate(newDate);
  },

  updateCelestialObject: (id, updated) => {
    const { activeSphere } = get();
    if (!activeSphere) return;

    const replaceInArray = <T extends ICelestialBase>(arr: T[]): T[] => {
      const idx = arr.findIndex(o => o.id === id);
      if (idx !== -1) {
        const newArr = [...arr];
        newArr[idx] = { ...newArr[idx], ...updated };
        return newArr;
      }
      return arr;
    };

    set({
      activeSphere: {
        ...activeSphere,
        groups: replaceInArray(activeSphere.groups || []),
        celestialBodies: replaceInArray(activeSphere.celestialBodies || []),
        phenomena: replaceInArray(activeSphere.phenomena || []),
        constellations: replaceInArray(activeSphere.constellations || []),
        mapOverlays: replaceInArray(activeSphere.mapOverlays || [])
      }
    });
  },

  addCelestialObject: (object) => {
    const { activeSphere } = get();
    if (!activeSphere) return;
    
    // Ensure it has an ID
    if (!object.id) object.id = generateId();

    const addToArray = <T extends ICelestialBase>(arr: T[], obj: any): T[] => [...arr, obj];

    let newSphere = { ...activeSphere };
    if (object.type === 'group') newSphere.groups = addToArray(newSphere.groups || [], object);
    else if (object.type === 'cloud') newSphere.phenomena = addToArray(newSphere.phenomena || [], object);
    else if (object.type === 'constellation') newSphere.constellations = addToArray(newSphere.constellations || [], object);
    else if (object.type === 'note' || object.type === 'legend') newSphere.mapOverlays = addToArray(newSphere.mapOverlays || [], object);
    else newSphere.celestialBodies = addToArray(newSphere.celestialBodies || [], object);

    set({ activeSphere: newSphere });
  },

  removeCelestialObject: (id) => {
    const { activeSphere } = get();
    if (!activeSphere) return;

    const filterArray = <T extends ICelestialBase>(arr: T[]): T[] => arr.filter(o => o.id !== id);

    set({
      activeSphere: {
        ...activeSphere,
        groups: filterArray(activeSphere.groups || []),
        celestialBodies: filterArray(activeSphere.celestialBodies || []),
        phenomena: filterArray(activeSphere.phenomena || []),
        constellations: filterArray(activeSphere.constellations || []),
        mapOverlays: filterArray(activeSphere.mapOverlays || [])
      },
      selectedObjectId: get().selectedObjectId === id ? null : get().selectedObjectId
    });
  },

  setCategoryArray: (category, arr) => {
    const { activeSphere } = get();
    if (!activeSphere) return;
    set({
      activeSphere: {
        ...activeSphere,
        [category]: arr
      }
    });
  },

  updateActiveSphereMeta: (meta) => {
    const { activeSphere } = get();
    if (!activeSphere) return;
    set({ activeSphere: { ...activeSphere, ...meta } });
  },

  setSphere: (sphere) => {
    set({
      activeSphere: sphere,
      currentSystemDate: sphere.currentSystemDate || 0,
    });
  },
}));
