const { ipcMain } = require('electron');

class IpcController {
  #fileService;

  constructor(fileService) {
    this.#fileService = fileService;
  }

  init() {
    ipcMain.handle('select-save-directory', () => this.#fileService.selectSaveDirectory());
    ipcMain.handle('list-saves-directory', (event, dirPath) => this.#fileService.listSavesDirectory(dirPath));
    ipcMain.handle('load-json-file', (event, filePath) => this.#fileService.loadJsonFile(filePath));
    ipcMain.handle('save-json-file', (event, { filePath, data }) => this.#fileService.saveJsonFile(filePath, data));
    ipcMain.handle('export-png-file', (event, { dataUrl, defaultName }) => this.#fileService.exportPngFile(dataUrl, defaultName));
    ipcMain.handle('get-default-save-directory', () => this.#fileService.getDefaultSaveDirectory());
    ipcMain.handle('list-shapes-directory', () => this.#fileService.listShapesDirectory());
    ipcMain.handle('load-shape', (event, shapeName) => this.#fileService.loadShape(shapeName));
  }
}

module.exports = IpcController;
