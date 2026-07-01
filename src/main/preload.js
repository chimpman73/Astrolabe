const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('astrolabeAPI', {
  selectSaveDirectory: () => ipcRenderer.invoke('select-save-directory'),
  listSavesDirectory: (dirPath) => ipcRenderer.invoke('list-saves-directory', dirPath),
  loadJsonFile: (filePath) => ipcRenderer.invoke('load-json-file', filePath),
  saveJsonFile: (filePath, data) => ipcRenderer.invoke('save-json-file', { filePath, data }),
  exportPngFile: (dataUrl, defaultName) => ipcRenderer.invoke('export-png-file', { dataUrl, defaultName }),
  getDefaultSaveDirectory: () => ipcRenderer.invoke('get-default-save-directory'),
});
