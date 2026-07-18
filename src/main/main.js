const AppManager = require('./AppManager');
const FileService = require('./FileService');
const IpcController = require('./IpcController');

const appManager = new AppManager();
appManager.init();

const fileService = new FileService(appManager);
const ipcController = new IpcController(fileService, appManager);
ipcController.init();
