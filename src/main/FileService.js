const fs = require('fs');
const path = require('path');
const { app, dialog } = require('electron');

class FileService {
  #appManager;

  constructor(appManager) {
    this.#appManager = appManager;
  }

  async selectSaveDirectory() {
    try {
      const mainWindow = this.#appManager.getMainWindow();
      const result = await dialog.showOpenDialog(mainWindow, {
        title: 'Select Crystal Sphere Saves Directory',
        properties: ['openDirectory', 'createDirectory'],
      });

      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, error: 'User canceled directory selection.', code: 'ERR_USER_CANCELED' };
      }

      return { success: true, data: result.filePaths[0] };
    } catch (err) {
      return { success: false, error: err.message, code: 'ERR_UNKNOWN_DIALOG' };
    }
  }

  async listSavesDirectory(dirPath) {
    try {
      if (!dirPath || !fs.existsSync(dirPath)) {
        return { success: false, error: 'Directory does not exist.', code: 'ERR_DIR_NOT_FOUND' };
      }

      const files = fs.readdirSync(dirPath);
      const jsonFiles = [];

      for (const file of files) {
        if (file.endsWith('.json')) {
          const fullPath = path.join(dirPath, file);
          try {
            const raw = fs.readFileSync(fullPath, 'utf8');
            const data = JSON.parse(raw);
            // Simple validation check: ensure it looks like a CrystalSphere configuration
            if (data.sphereName && (Array.isArray(data.objects) || data.version === 2)) {
              jsonFiles.push({
                filename: file,
                fullPath: fullPath,
                sphereName: data.sphereName,
                campaignYear: data.campaignYear,
                campaignDay: data.campaignDay,
                epoch: data.epoch,
                currentSystemDate: data.currentSystemDate || 0,
              });
            }
          } catch (e) {
            // Skip unparseable files
            console.warn(`Failed to parse file: ${file}`, e);
          }
        }
      }

      return { success: true, data: jsonFiles };
    } catch (err) {
      return { success: false, error: err.message, code: 'ERR_DIR_READ_FAILED' };
    }
  }

  async loadJsonFile(filePath) {
    try {
      if (!fs.existsSync(filePath)) {
        return { success: false, error: 'File does not exist.', code: 'ERR_FILE_NOT_FOUND' };
      }

      const content = fs.readFileSync(filePath, 'utf8');
      const data = JSON.parse(content);
      return { success: true, data };
    } catch (err) {
      return { success: false, error: err.message, code: 'ERR_FILE_READ_FAILED' };
    }
  }

  async saveJsonFile(filePath, data) {
    try {
      const formattedData = JSON.stringify(data, null, 2);
      fs.writeFileSync(filePath, formattedData, 'utf8');
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message, code: 'ERR_FILE_WRITE_FAILED' };
    }
  }

  async exportPngFile(dataUrl, defaultName) {
    try {
      const mainWindow = this.#appManager.getMainWindow();
      const result = await dialog.showSaveDialog(mainWindow, {
        title: 'Export Map as PNG',
        defaultPath: defaultName || 'crystal_sphere.png',
        filters: [
          { name: 'Images', extensions: ['png'] }
        ]
      });

      if (result.canceled || !result.filePath) {
        return { success: false, error: 'User canceled export.', code: 'ERR_USER_CANCELED' };
      }

      // Extract base64 representation of PNG data
      const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');

      fs.writeFileSync(result.filePath, buffer);
      return { success: true, data: result.filePath };
    } catch (err) {
      return { success: false, error: err.message, code: 'ERR_EXPORT_FAILED' };
    }
  }

  getDefaultSaveDirectory() {
    try {
      let defaultPath = path.join(app.getPath('userData'), 'saves');
      
      if (!fs.existsSync(defaultPath)) {
        fs.mkdirSync(defaultPath, { recursive: true });
      }
      return { success: true, data: defaultPath };
    } catch (err) {
      return { success: false, error: err.message, code: 'ERR_GET_DEFAULT_SAVE_DIR_FAILED' };
    }
  }

  async listShapesDirectory() {
    try {
      const shapesPath = path.join(app.getAppPath(), 'assets', 'shapes');
      if (!fs.existsSync(shapesPath)) {
        return { success: true, data: [] };
      }
      const files = fs.readdirSync(shapesPath);
      const shapes = files.filter(f => f.endsWith('.svg')).map(f => f.replace('.svg', ''));
      return { success: true, data: shapes };
    } catch (err) {
      return { success: false, error: err.message, code: 'ERR_SHAPES_DIR_READ_FAILED' };
    }
  }

  async loadShape(shapeName) {
    try {
      const shapesPath = path.join(app.getAppPath(), 'assets', 'shapes');
      const filePath = path.join(shapesPath, `${shapeName}.svg`);
      if (!fs.existsSync(filePath)) {
        return { success: false, error: 'Shape not found.', code: 'ERR_SHAPE_NOT_FOUND' };
      }
      const content = fs.readFileSync(filePath, 'utf8');
      return { success: true, data: content };
    } catch (err) {
      return { success: false, error: err.message, code: 'ERR_SHAPE_READ_FAILED' };
    }
  }
}

module.exports = FileService;
