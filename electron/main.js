import { app, BrowserWindow, shell, ipcMain, dialog, Menu, MenuItem } from 'electron';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isDev = process.env.NODE_ENV === 'development';

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 800,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  if (isDev) {
    win.loadURL('http://localhost:5173');
  } else {
    win.loadFile(path.join(app.getAppPath(), 'dist/index.html'));
  }

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Spell-check suggestions on right-click
  win.webContents.on('context-menu', (_event, params) => {
    const menu = new Menu();

    if (params.misspelledWord) {
      if (params.dictionarySuggestions.length > 0) {
        for (const suggestion of params.dictionarySuggestions) {
          menu.append(new MenuItem({
            label: suggestion,
            click: () => win.webContents.replaceMisspelling(suggestion),
          }));
        }
      } else {
        menu.append(new MenuItem({ label: 'No suggestions', enabled: false }));
      }
      menu.append(new MenuItem({ type: 'separator' }));
      menu.append(new MenuItem({
        label: 'Add to dictionary',
        click: () => win.webContents.session.addWordToSpellCheckerDictionary(params.misspelledWord),
      }));
      menu.append(new MenuItem({ type: 'separator' }));
    }

    if (params.isEditable || params.selectionText) {
      if (params.isEditable) {
        menu.append(new MenuItem({ role: 'cut' }));
      }
      menu.append(new MenuItem({ role: 'copy' }));
      if (params.isEditable) {
        menu.append(new MenuItem({ role: 'paste' }));
      }
    }

    if (menu.items.length > 0) {
      menu.popup({ window: win });
    }
  });
}

// ── Storage paths ─────────────────────────────────────────
const STORAGE_BACKUP_PATH = path.join(app.getPath('userData'), 'sefer-storage-backup.json');
const ICLOUD_DIR          = path.join(os.homedir(), 'Library', 'Mobile Documents', 'com~apple~CloudDocs', 'Sefer');
const ICLOUD_BACKUP_PATH  = path.join(ICLOUD_DIR, 'sefer-backup.json');

function safeMtime(filePath) {
  try { return fs.statSync(filePath).mtimeMs; } catch { return null; }
}

function safeRead(filePath) {
  try { return fs.readFileSync(filePath, 'utf8'); } catch { return null; }
}

function atomicWrite(filePath, json) {
  const tmp = filePath + '.tmp';
  fs.writeFileSync(tmp, json);
  fs.renameSync(tmp, filePath);
}

// ── IPC: storage ──────────────────────────────────────────
ipcMain.handle('storage-read', () => {
  const localMtime  = safeMtime(STORAGE_BACKUP_PATH);
  const icloudMtime = safeMtime(ICLOUD_BACKUP_PATH);

  if (!localMtime && !icloudMtime) return null;

  // Use whichever file was written most recently
  const useIcloud = icloudMtime && (!localMtime || icloudMtime > localMtime);
  return safeRead(useIcloud ? ICLOUD_BACKUP_PATH : STORAGE_BACKUP_PATH);
});

ipcMain.handle('storage-write', (_, json) => {
  let synced = false;

  // Always write local first
  try { atomicWrite(STORAGE_BACKUP_PATH, json); } catch { /* non-fatal */ }

  // Best-effort write to iCloud Drive
  try {
    if (!fs.existsSync(ICLOUD_DIR)) fs.mkdirSync(ICLOUD_DIR, { recursive: true });
    atomicWrite(ICLOUD_BACKUP_PATH, json);
    synced = true;
  } catch { /* iCloud unavailable — silent */ }

  return { success: true, synced };
});

ipcMain.handle('sync-status', () => {
  const icloudRoot = path.join(os.homedir(), 'Library', 'Mobile Documents', 'com~apple~CloudDocs');
  const icloudAvailable = (() => { try { return fs.existsSync(icloudRoot); } catch { return false; } })();
  const icloudSynced    = (() => { try { return fs.existsSync(ICLOUD_BACKUP_PATH); } catch { return false; } })();
  const icloudMtime     = safeMtime(ICLOUD_BACKUP_PATH);
  const localMtime      = safeMtime(STORAGE_BACKUP_PATH);
  const lastSyncTime    = icloudMtime || localMtime || null;
  return { icloudAvailable, icloudSynced, lastSyncTime };
});

// ── IPC: cross-references ─────────────────────────────────
ipcMain.handle('cross-refs-read', () => {
  const jsonPath = path.join(app.getAppPath(), 'dist', 'crossrefs_full.json');
  return safeRead(jsonPath);
});

// ── IPC: export ───────────────────────────────────────────
ipcMain.handle('save-docx', async (event, buffer, defaultName) => {
  const { filePath, canceled } = await dialog.showSaveDialog({
    title: 'Export Notes',
    defaultPath: path.join(app.getPath('desktop'), defaultName),
    filters: [{ name: 'Word Document', extensions: ['docx'] }],
  });
  if (canceled || !filePath) return { success: false };
  try {
    fs.writeFileSync(filePath, Buffer.from(buffer));
    return { success: true, filePath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

app.commandLine.appendSwitch('disable-features', 'EncryptionService,CookieEncryption');
app.commandLine.appendSwitch('password-store', 'basic');
app.commandLine.appendSwitch('use-mock-keychain');

// Prevent a second instance from opening — focus the existing window instead
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const [win] = BrowserWindow.getAllWindows();
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });

  app.whenReady().then(createWindow);

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
}
