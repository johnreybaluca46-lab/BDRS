const { app, BrowserWindow } = require('electron');
const path = require('path');
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: "Barangay Document Request System",
    icon: path.join(__dirname, '../public/pwa-512x512.png'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
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

  // Always open devtools in production for debugging the blank screen
  if (!isDev) {
    mainWindow.webContents.openDevTools();
  }
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
