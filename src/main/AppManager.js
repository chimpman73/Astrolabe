const { app, BrowserWindow } = require('electron');
const path = require('path');

class AppManager {
  #mainWindow;
  #isDev;

  constructor() {
    this.#mainWindow = null;
    this.#isDev = process.argv.includes('--dev') || !app.isPackaged;
  }

  init() {
    this.setupGlobalErrorHandlers();

    app.whenReady().then(() => {
      this.createWindow();

      app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) this.createWindow();
      });
    });

    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });
  }

  createWindow() {
    this.#mainWindow = new BrowserWindow({
      width: 1280,
      height: 850,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
      },
    });

    if (this.#isDev) {
      this.#mainWindow.loadURL('http://localhost:5173');
      this.#mainWindow.webContents.openDevTools();
    } else {
      this.#mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'));
    }

    this.#mainWindow.on('closed', () => {
      this.#mainWindow = null;
    });
  }

  getMainWindow() {
    return this.#mainWindow;
  }

  setupGlobalErrorHandlers() {
    const sendErrorToFrontend = (type, error) => {
      if (this.#mainWindow) {
        this.#mainWindow.webContents.send('backend-error', {
          type,
          message: error.message || String(error),
          stack: error.stack
        });
      }
      console.error(`[${type}]`, error);
    };

    process.on('uncaughtException', (error) => {
      sendErrorToFrontend('UncaughtException', error);
    });

    process.on('unhandledRejection', (reason, promise) => {
      sendErrorToFrontend('UnhandledRejection', reason);
    });
  }
}

module.exports = AppManager;
