// main.ts
import {
  app, BrowserWindow, ipcMain, dialog, globalShortcut,
  Tray, Menu, nativeImage, Event
} from 'electron';
import { screen } from 'electron';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;   // notch
let edgeWindow: BrowserWindow | null = null;   // top-edge activator
let tray: Tray | null = null;

const isWin = process.platform === 'win32';
const isMac = process.platform === 'darwin';
const isDev = process.env.NODE_ENV === 'development';

// ---- helpers (call only after app.isReady()) ----
const workArea = () => screen.getPrimaryDisplay().workArea;

const topCenterFor = (width: number, height: number) => {
  const wa = workArea();
  return { x: Math.round(wa.x + (wa.width - width) / 2), y: wa.y, width, height };
};

const placeMainAtTopCenter = () => {
  if (!mainWindow) return;
  const b = mainWindow.getBounds();
  mainWindow.setBounds(topCenterFor(b.width, b.height));
};

const placeEdgeActivator = () => {
  if (!edgeWindow || !mainWindow) return;
  const notchWidth = mainWindow.getBounds().width;
  const width = Math.max(380, notchWidth + 60);
  const bounds = topCenterFor(width, 2);
  edgeWindow.setBounds({ ...bounds, y: bounds.y - 1 });
};

// ---- show/hide with quick slide animation ----
let animating = false;

const revealNotch = async () => {
  if (!mainWindow || animating) return;
  const wa = workArea();
  const b = mainWindow.getBounds();
  // start just above the top edge
  const startY = wa.y - b.height + 2;
  const endY = wa.y;
  mainWindow.setBounds({ x: b.x, y: startY, width: b.width, height: b.height });
  mainWindow.showInactive();

  try { (mainWindow as any).setBackgroundMaterial?.('acrylic'); } catch {}

  animating = true;
  const steps = 12; const dt = 12;
  for (let i = 1; i <= steps; i++) {
    await new Promise(r => setTimeout(r, dt));
    const y = Math.round(startY + (endY - startY) * (i / steps));
    if (!mainWindow) break;
    mainWindow.setBounds({ x: b.x, y, width: b.width, height: b.height });
  }
  animating = false;
};

const hideNotch = async () => {
  if (!mainWindow || animating || !mainWindow.isVisible()) return;
  const wa = workArea();
  const b = mainWindow.getBounds();
  const startY = b.y;
  const endY = wa.y - b.height + 2;

  animating = true;
  const steps = 8; const dt = 12;
  for (let i = 1; i <= steps; i++) {
    await new Promise(r => setTimeout(r, dt));
    const y = Math.round(startY + (endY - startY) * (i / steps));
    if (!mainWindow) break;
    mainWindow.setBounds({ x: b.x, y, width: b.width, height: b.height });
  }
  animating = false;
  mainWindow?.hide();
};

// Is cursor over notch rect (with margin)?
const cursorOverNotch = (margin = 6) => {
  if (!mainWindow) return false;
  const c = screen.getCursorScreenPoint();
  const b = mainWindow.getBounds();
  return (
    c.x >= b.x - margin && c.x <= b.x + b.width + margin &&
    c.y >= b.y - margin && c.y <= b.y + b.height + margin
  );
};

// ---- windows ----
function createMainWindow() {
  if (isWin) app.setAppUserModelId('com.example.notch');

  mainWindow = new BrowserWindow({
    width: 520, height: 140, minWidth: 480, maxWidth: 640, minHeight: 120, maxHeight: 168,
    frame: false, transparent: true, resizable: false, alwaysOnTop: true,
    skipTaskbar: true, hasShadow: false, focusable: true, backgroundColor: '#00000000',
    titleBarStyle: isMac ? 'hidden' : 'default',
    webPreferences: { nodeIntegration: false, contextIsolation: true, preload: path.join(__dirname, 'preload.js') },
    show: false,
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, 'renderer/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    if (!mainWindow) return;
    placeMainAtTopCenter();          // position it, but DO NOT show
  });

  // Don’t leave it stuck if someone minimizes/closes
  mainWindow.on('minimize', () => mainWindow?.hide());
  mainWindow.on('close', (e: Event) => {
    if (!isMac) { e.preventDefault(); mainWindow?.hide(); }
  });

  // Re-snap if user drags it near top
  mainWindow.on('move', () => {
    if (!mainWindow) return;
    const wa = workArea();
    const b = mainWindow.getBounds();
    if (b.y <= wa.y + 40) placeMainAtTopCenter();
  });
}

function createEdgeWindow() {
  edgeWindow = new BrowserWindow({
    ...topCenterFor(400, 2),
    frame: false, transparent: true, resizable: false, movable: false,
    focusable: false, hasShadow: false, alwaysOnTop: true, skipTaskbar: true,
    backgroundColor: '#00000000', webPreferences: { offscreen: false }, show: true,
  });
  edgeWindow.setIgnoreMouseEvents(true, { forward: true });
  edgeWindow.loadURL('data:text/html,<meta http-equiv="Content-Security-Policy" content="default-src \'none\'">');

  // Hover watcher: reveal when cursor is inside edge strip
  setInterval(() => {
    if (!mainWindow || !edgeWindow) return;
    const c = screen.getCursorScreenPoint();
    const b = edgeWindow.getBounds();
    const inside = c.x >= b.x && c.x <= b.x + b.width && c.y >= b.y && c.y <= b.y + b.height;
    if (inside && !mainWindow.isVisible() && !animating) {
      placeMainAtTopCenter();
      revealNotch();
    }
  }, 30);

  // Visibility watcher: hide when the cursor leaves the notch
  setInterval(() => {
    if (!mainWindow || animating) return;
    if (mainWindow.isVisible() && !cursorOverNotch(8)) {
      hideNotch();
    }
  }, 120);
}

// ---- tray + shortcuts ----
function createTray() {
  if (tray) return;
  const icon = nativeImage.createFromPath(path.join(__dirname, 'icon.png'));
  tray = new Tray(icon);
  tray.setToolTip('Notch');
  const toggle = () => {
    if (!mainWindow) return;
    if (mainWindow.isVisible()) hideNotch();
    else { placeMainAtTopCenter(); revealNotch(); }
  };
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Show/Hide', click: toggle }, { type: 'separator' }, { label: 'Quit', click: () => app.quit() },
  ]));
  tray.on('click', toggle);
}

function registerShortcuts() {
  globalShortcut.register('CommandOrControl+Shift+A', () => {
    if (!mainWindow) return;
    if (mainWindow.isVisible()) hideNotch();
    else { placeMainAtTopCenter(); revealNotch(); }
  });
}

// ---- IPC (unchanged) ----
ipcMain.handle('show-file-dialog', async () => {
  if (!mainWindow) return { canceled: true, filePaths: [] };
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Documents', extensions: ['pdf', 'csv'] },
      { name: 'PDF Files', extensions: ['pdf'] },
      { name: 'CSV Files', extensions: ['csv'] },
    ],
  });
  return result;
});
ipcMain.handle('show-window', () => { placeMainAtTopCenter(); revealNotch(); });
ipcMain.handle('hide-window', () => hideNotch());
ipcMain.handle('minimize-window', () => mainWindow?.minimize());
ipcMain.handle('close-window', () => { if (!isMac) hideNotch(); else mainWindow?.close(); });

// ---- lifecycle ----
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => { placeMainAtTopCenter(); revealNotch(); });

  app.whenReady().then(() => {
    createMainWindow();
    createEdgeWindow();
    createTray();
    registerShortcuts();

    // keep activator and notch positioned on display changes
    screen.on('display-metrics-changed', () => { placeMainAtTopCenter(); placeEdgeActivator(); });
    screen.on('display-added',           () => { placeMainAtTopCenter(); placeEdgeActivator(); });
    screen.on('display-removed',         () => { placeMainAtTopCenter(); placeEdgeActivator(); });

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow(); createEdgeWindow();
      } else {
        placeMainAtTopCenter(); revealNotch();
      }
    });
  });
}

app.on('window-all-closed', () => { if (isMac) app.quit(); });
app.on('will-quit', () => { globalShortcut.unregisterAll(); });
