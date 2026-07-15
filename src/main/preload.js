const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('astrolabeAPI', {
  selectSaveDirectory: () => ipcRenderer.invoke('select-save-directory'),
  listSavesDirectory: (dirPath) => ipcRenderer.invoke('list-saves-directory', dirPath),
  loadJsonFile: (filePath) => ipcRenderer.invoke('load-json-file', filePath),
  saveJsonFile: (filePath, data) => ipcRenderer.invoke('save-json-file', { filePath, data }),
  exportPngFile: (dataUrl, defaultName) => ipcRenderer.invoke('export-png-file', { dataUrl, defaultName }),
  getDefaultSaveDirectory: () => ipcRenderer.invoke('get-default-save-directory'),
  listShapesDirectory: () => ipcRenderer.invoke('list-shapes-directory'),
  loadShape: (shapeName) => ipcRenderer.invoke('load-shape', shapeName),
  onBackendError: (callback) => {
    ipcRenderer.on('backend-error', (event, data) => callback(data));
  },
  onMenuAction: (callback) => {
    ipcRenderer.on('menu-action', (event, action) => callback(action));
  }
});
