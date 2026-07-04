import { create } from 'zustand';
import { CrystalSphere, SaveFileInfo, CelestialObject } from '../../types/astrolabe';

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
  updateCelestialObject: (index: number, updated: Partial<CelestialObject>) => void;
  reorderCelestialObjects: (sourceIndex: number, destinationIndex: number) => void;
  addCelestialObject: (object: CelestialObject) => void;
  removeCelestialObject: (index: number) => void;
  updateActiveSphereMeta: (meta: Partial<Omit<CrystalSphere, 'objects'>>) => void;
  setSphere: (sphere: CrystalSphere) => void;
  setToastMessage: (toast: { type: 'success' | 'error'; text: string } | null) => void;
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
          set({
            activeSphere: res.data,
            currentSystemDate: res.data.currentSystemDate || 0,
          });
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

    // Synchronize latest activeSystemDate inside saved data payload
    const dataToSave: CrystalSphere = {
      ...activeSphere,
      currentSystemDate: currentSystemDate,
    };

    const fileName = `${dataToSave.sphereName.toLowerCase().replace(/[^a-z0-9]/g, '_')}.json`;
    const filePath = window.astrolabeAPI
      ? `${saveDirectory}/${fileName}`
      : fileName; // Fallback path

    if (window.astrolabeAPI) {
      try {
        const res = await window.astrolabeAPI.saveJsonFile(filePath, dataToSave);
        if (res.success) {
          // Refresh saves directory to show updated state
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
      sphereName: 'Untitled System',
      currentCampaignDate: new Date().toISOString().split('T')[0],
      currentSystemDate: 0,
      objects: [],
    };

    set({
      activeSphere: defaultSphere,
      currentSystemDate: 0,
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
        // Only clear if it hasn't been overwritten by another toast
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
      set({
        activeSphere: { ...activeSphere, currentSystemDate: date },
      });
    }
  },

  advanceSystemDate: (days) => {
    const newDate = get().currentSystemDate + days;
    get().setCurrentSystemDate(newDate);
  },

  updateCelestialObject: (index, updated) => {
    const { activeSphere } = get();
    if (!activeSphere) return;

    const objects = [...activeSphere.objects];
    objects[index] = { ...objects[index], ...updated };

    set({
      activeSphere: { ...activeSphere, objects },
    });
  },

  reorderCelestialObjects: (sourceIndex, destinationIndex) => {
    const { activeSphere } = get();
    if (!activeSphere) return;

    const objects = [...activeSphere.objects];
    const [movedItem] = objects.splice(sourceIndex, 1);
    objects.splice(destinationIndex, 0, movedItem);

    set({
      activeSphere: { ...activeSphere, objects },
    });
  },

  addCelestialObject: (object) => {
    const { activeSphere } = get();
    if (!activeSphere) return;

    set({
      activeSphere: {
        ...activeSphere,
        objects: [...activeSphere.objects, object],
      },
    });
  },

  removeCelestialObject: (index) => {
    const { activeSphere } = get();
    if (!activeSphere) return;

    const objects = activeSphere.objects.filter((_, i) => i !== index);
    set({
      activeSphere: { ...activeSphere, objects },
    });
  },

  updateActiveSphereMeta: (meta) => {
    const { activeSphere } = get();
    if (!activeSphere) return;

    set({
      activeSphere: {
        ...activeSphere,
        ...meta,
      },
    });
  },

  setSphere: (sphere) => {
    set({
      activeSphere: sphere,
      currentSystemDate: sphere.currentSystemDate || 0,
    });
  },
}));
