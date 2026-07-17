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
      if (!dirPath) {
        return { success: false, error: 'Directory path is empty.', code: 'ERR_DIR_NOT_FOUND' };
      }

      const dirExists = await fs.promises.access(dirPath).then(() => true).catch(() => false);
      if (!dirExists) {
        return { success: false, error: 'Directory does not exist.', code: 'ERR_DIR_NOT_FOUND' };
      }

      const files = await fs.promises.readdir(dirPath);
      const jsonFiles = [];

      const readPromises = files
        .filter(file => file.endsWith('.json'))
        .map(async (file) => {
          const fullPath = path.join(dirPath, file);
          try {
            const raw = await fs.promises.readFile(fullPath, 'utf8');
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
        });

      await Promise.all(readPromises);

      return { success: true, data: jsonFiles };
    } catch (err) {
      return { success: false, error: err.message, code: 'ERR_DIR_READ_FAILED' };
    }
  }

  async loadJsonFile(filePath) {
    try {
      const fileExists = await fs.promises.access(filePath).then(() => true).catch(() => false);
      if (!fileExists) {
        return { success: false, error: 'File does not exist.', code: 'ERR_FILE_NOT_FOUND' };
      }

      const content = await fs.promises.readFile(filePath, 'utf8');
      const data = JSON.parse(content);
      return { success: true, data };
    } catch (err) {
      return { success: false, error: err.message, code: 'ERR_FILE_READ_FAILED' };
    }
  }

  async saveJsonFile(filePath, data) {
    try {
      const formattedData = JSON.stringify(data, null, 2);
      await fs.promises.writeFile(filePath, formattedData, 'utf8');
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

      await fs.promises.writeFile(result.filePath, buffer);
      return { success: true, data: result.filePath };
    } catch (err) {
      return { success: false, error: err.message, code: 'ERR_EXPORT_FAILED' };
    }
  }

  async getDefaultSaveDirectory() {
    try {
      const defaultPath = path.join(app.getPath('userData'), 'saves');
      
      const dirExists = await fs.promises.access(defaultPath).then(() => true).catch(() => false);
      if (!dirExists) {
        await fs.promises.mkdir(defaultPath, { recursive: true });
        
        // Copy bundled default saves if this is the first time creating the directory
        try {
          const bundledSavesPath = path.join(app.getAppPath(), 'saves');
          const bundledExists = await fs.promises.access(bundledSavesPath).then(() => true).catch(() => false);
          if (bundledExists) {
            const files = await fs.promises.readdir(bundledSavesPath);
            const copyPromises = files
              .filter(file => file.endsWith('.json'))
              .map(file => fs.promises.copyFile(
                path.join(bundledSavesPath, file),
                path.join(defaultPath, file)
              ));
            await Promise.all(copyPromises);
          }
        } catch (copyErr) {
          console.error('Failed to copy default saves:', copyErr);
        }
      }
      return { success: true, data: defaultPath };
    } catch (err) {
      return { success: false, error: err.message, code: 'ERR_GET_DEFAULT_SAVE_DIR_FAILED' };
    }
  }

  async listShapesDirectory() {
    try {
      const shapesPath = path.join(app.getAppPath(), 'assets', 'shapes');
      const dirExists = await fs.promises.access(shapesPath).then(() => true).catch(() => false);
      if (!dirExists) {
        return { success: true, data: [] };
      }
      const files = await fs.promises.readdir(shapesPath);
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
      const fileExists = await fs.promises.access(filePath).then(() => true).catch(() => false);
      if (!fileExists) {
        return { success: false, error: 'Shape not found.', code: 'ERR_SHAPE_NOT_FOUND' };
      }
      const content = await fs.promises.readFile(filePath, 'utf8');
      return { success: true, data: content };
    } catch (err) {
      return { success: false, error: err.message, code: 'ERR_SHAPE_READ_FAILED' };
    }
  }
}

module.exports = FileService;
