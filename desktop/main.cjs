const path = require('node:path');
const electron = require('electron');
const { app, BrowserWindow, nativeTheme, shell } = electron;

const APP_NAME = 'BioTrack - Healthcare Platform';
const DEFAULT_START_URL = 'http://127.0.0.1:3001';
const RETRY_DELAY_MS = 2000;

let mainWindow;

function resolveWindowIconPath() {
  const iconCandidates = [
    path.join(__dirname, 'assets', 'icon.png'),
    path.join(__dirname, '..', 'desktop', 'assets', 'icon.png'),
    path.join(__dirname, '..', 'web', 'public', 'apple-icon.png'),
  ];

  for (const candidate of iconCandidates) {
    try {
      if (require('node:fs').existsSync(candidate)) {
        return candidate;
      }
    } catch {
      // Ignore path checks that fail and continue to next fallback.
    }
  }

  return undefined;
}

function getStartUrl() {
  const configured = String(process.env.ELECTRON_START_URL || '').trim();
  return configured || DEFAULT_START_URL;
}

function getWindowBackgroundColor() {
  return nativeTheme.shouldUseDarkColors ? '#252525' : '#ffffff';
}

function createOfflineMarkup(targetUrl) {
  const textColor = nativeTheme.shouldUseDarkColors ? '#f5f5f5' : '#111111';
  const mutedColor = nativeTheme.shouldUseDarkColors ? '#c6c6c6' : '#555555';
  const bgColor = getWindowBackgroundColor();

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${APP_NAME}</title>
    <style>
      :root { color-scheme: ${nativeTheme.shouldUseDarkColors ? 'dark' : 'light'}; }
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        background: ${bgColor};
        color: ${textColor};
        font-family: 'Poppins', 'Inter', system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
      }
      main {
        text-align: center;
        max-width: 560px;
        padding: 1.5rem;
      }
      h1 { font-size: 1.45rem; margin: 0 0 0.75rem; }
      p { color: ${mutedColor}; margin: 0.25rem 0; }
      code {
        display: inline-block;
        margin-top: 0.5rem;
        padding: 0.3rem 0.5rem;
        border-radius: 0.45rem;
        background: ${nativeTheme.shouldUseDarkColors ? '#333333' : '#efefef'};
      }
    </style>
  </head>
  <body>
    <main>
      <h1>Starting BioTrack Desktop...</h1>
      <p>Waiting for the web interface to become available.</p>
      <p>Target URL:</p>
      <code>${targetUrl}</code>
    </main>
  </body>
</html>`;
}

async function loadMainInterface(win) {
  const startUrl = getStartUrl();

  try {
    await win.loadURL(startUrl);
  } catch {
    await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(createOfflineMarkup(startUrl))}`);

    setTimeout(() => {
      if (!win.isDestroyed()) {
        void loadMainInterface(win);
      }
    }, RETRY_DELAY_MS);
  }
}

function createWindow() {
  const iconPath = resolveWindowIconPath();

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1080,
    minHeight: 680,
    title: APP_NAME,
    ...(iconPath ? { icon: iconPath } : {}),
    backgroundColor: getWindowBackgroundColor(),
    frame: true,
    autoHideMenuBar: false,
    titleBarStyle: 'default',
    minimizable: true,
    maximizable: true,
    closable: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: 'deny' };
  });

  // Keep native chrome visible on Windows/Linux.
  if (process.platform !== 'darwin') {
    mainWindow.setMenuBarVisibility(true);
  }

  void loadMainInterface(mainWindow);
}

if (!app || !BrowserWindow || !nativeTheme || !shell) {
  throw new Error('Electron APIs are unavailable. Launch from `npm run desktop`.');
}

app.setName('BioTrack');

app.whenReady().then(() => {
  createWindow();

  nativeTheme.on('updated', () => {
    if (!mainWindow || mainWindow.isDestroyed()) {
      return;
    }

    mainWindow.setBackgroundColor(getWindowBackgroundColor());
  });

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
