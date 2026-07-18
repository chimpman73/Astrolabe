const { ipcMain, dialog } = require('electron');
const ShapeGeneratorService = require('./ShapeGeneratorService');

class IpcController {
  #fileService;
  #shapeGeneratorService;

  constructor(fileService, appManager) {
    this.#fileService = fileService;
    this.#shapeGeneratorService = new ShapeGeneratorService(appManager);
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
    
    // Custom Shapes Wizard Handlers
    ipcMain.handle('load-shape-skeleton', (event, shapeName) => this.#fileService.loadShapeSkeleton(shapeName));
    ipcMain.handle('save-custom-shape', (event, { shapeName, svgContent, skeletonData }) => this.#fileService.saveCustomShape(shapeName, svgContent, skeletonData));
    ipcMain.handle('delete-custom-shape', (event, shapeName) => this.#fileService.deleteCustomShape(shapeName));
    ipcMain.handle('generate-image-from-prompt', (event, data) => this.#shapeGeneratorService.generateImageFromPrompt(data));
    ipcMain.handle('trace-and-skeletonize', (event, data) => this.#shapeGeneratorService.traceAndSkeletonize(data));
    
    ipcMain.handle('select-image-file', async () => {
      try {
        const result = await dialog.showOpenDialog({
          title: 'Select Source Image for Tracing',
          filters: [
            { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'bmp'] }
          ],
          properties: ['openFile']
        });
        if (result.canceled || result.filePaths.length === 0) {
          return { success: false, error: 'User canceled file selection.', code: 'ERR_USER_CANCELED' };
        }
        
        const fs = require('fs');
        const buffer = await fs.promises.readFile(result.filePaths[0]);
        const base64Data = buffer.toString('base64');
        const path = require('path');
        const filename = path.basename(result.filePaths[0]);
        
        return { success: true, data: { base64Data, filename } };
      } catch (err) {
        return { success: false, error: err.message, code: 'ERR_FILE_READ_FAILED' };
      }
    });
  }
}

module.exports = IpcController;
