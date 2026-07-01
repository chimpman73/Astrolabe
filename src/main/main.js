const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

// Check if running in development mode
const isDev = process.argv.includes('--dev') || !app.isPackaged;

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 850,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Handler: Select Save Directory
ipcMain.handle('select-save-directory', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Select Crystal Sphere Saves Directory',
      properties: ['openDirectory', 'createDirectory'],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, error: 'User canceled directory selection.' };
    }

    return { success: true, data: result.filePaths[0] };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// IPC Handler: List JSON Save Files
ipcMain.handle('list-saves-directory', async (event, dirPath) => {
  try {
    if (!dirPath || !fs.existsSync(dirPath)) {
      return { success: false, error: 'Directory does not exist.' };
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
          if (data.sphereName && Array.isArray(data.objects)) {
            jsonFiles.push({
              filename: file,
              fullPath: fullPath,
              sphereName: data.sphereName,
              currentCampaignDate: data.currentCampaignDate || '',
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
    return { success: false, error: err.message };
  }
});

// IPC Handler: Load JSON File
ipcMain.handle('load-json-file', async (event, filePath) => {
  try {
    if (!fs.existsSync(filePath)) {
      return { success: false, error: 'File does not exist.' };
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(content);
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// IPC Handler: Save JSON File
ipcMain.handle('save-json-file', async (event, { filePath, data }) => {
  try {
    const formattedData = JSON.stringify(data, null, 2);
    fs.writeFileSync(filePath, formattedData, 'utf8');
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// IPC Handler: Export PNG File
ipcMain.handle('export-png-file', async (event, { dataUrl, defaultName }) => {
  try {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Export Map as PNG',
      defaultPath: defaultName || 'crystal_sphere.png',
      filters: [
        { name: 'Images', extensions: ['png'] }
      ]
    });

    if (result.canceled || !result.filePath) {
      return { success: false, error: 'User canceled export.' };
    }

    // Extract base64 representation of PNG data
    const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    fs.writeFileSync(result.filePath, buffer);
    return { success: true, data: result.filePath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// IPC Handler: Get Default Save Directory
ipcMain.handle('get-default-save-directory', () => {
  try {
    let defaultPath = 'C:\\John\\Code\\Astrolabe\\saves';
    if (!fs.existsSync(defaultPath)) {
      // Safe portable fallback in application root
      defaultPath = path.join(app.getAppPath(), 'saves');
    }
    if (!fs.existsSync(defaultPath)) {
      fs.mkdirSync(defaultPath, { recursive: true });
    }
    return { success: true, data: defaultPath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});
