const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
const { autoUpdater } = require('electron-updater');

// Disable auto-download so we can ask the user first
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = false;

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: "Barangay Document Request System",
    icon: path.join(__dirname, '../src/assets/app icon/Barangay Buluan BDRS.png'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false
    },
  });

  // Hide the default menu bar
  mainWindow.setMenuBarVisibility(false);

  if (isDev) {
    // In dev mode, wait for Vite dev server (usually localhost:5173)
    const port = process.env.PORT || 5173;
    mainWindow.loadURL(`http://localhost:${port}`);
    mainWindow.webContents.openDevTools();
  } else {
    // In production, load the local built files instead of the Vercel URL
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html')).catch(err => {
      console.log('FAILED TO LOAD FILE:', path.join(__dirname, '../dist/index.html'), err);
    });
  }

  mainWindow.webContents.on('did-fail-load', (e, errorCode, errorDescription) => {
    console.log('DID-FAIL-LOAD:', errorCode, errorDescription);
  });
  
  mainWindow.webContents.on('crashed', (e) => {
    console.log('RENDERER CRASHED');
  });

  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log('[Renderer]', level, message, sourceId, line);
  });

  // Always open devtools in production for debugging the blank screen
  if (!isDev) {
    mainWindow.webContents.openDevTools();
  }

  // --- AUTO UPDATER IPC EVENTS ---
  ipcMain.on('check-for-updates', () => {
    if (!isDev) {
      autoUpdater.checkForUpdates().catch(err => {
        mainWindow.webContents.send('update-error', err.message);
      });
    }
  });

  ipcMain.on('download-update', () => {
    autoUpdater.downloadUpdate().catch(err => {
      mainWindow.webContents.send('update-error', err.message);
    });
  });

  ipcMain.on('install-update', () => {
    autoUpdater.quitAndInstall();
  });

  autoUpdater.on('update-available', (info) => {
    mainWindow.webContents.send('update-available', info);
  });

  autoUpdater.on('update-not-available', (info) => {
    mainWindow.webContents.send('update-not-available', info);
  });

  autoUpdater.on('download-progress', (progressObj) => {
    mainWindow.webContents.send('update-download-progress', progressObj);
  });

  autoUpdater.on('update-downloaded', (info) => {
    mainWindow.webContents.send('update-downloaded', info);
  });

  autoUpdater.on('error', (err) => {
    mainWindow.webContents.send('update-error', err.message);
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
