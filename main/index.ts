import { app, BrowserWindow, ipcMain, desktopCapturer, globalShortcut, shell, screen, Tray, Menu, nativeImage } from "electron";
import serve from "electron-serve";
import path, { join } from "path";
import fs from "fs";
import activeWin from 'active-win';

import { getURL } from "./lib/getUrl";
import isDev from "./lib/isDev";
import store from "./lib/store";
import userMemoryStore from "./lib/userMemoryStore";

if (!isDev) {
  serve({ directory: join(__dirname, "renderer"), hostname: "openclue" });
}

let win: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;

// ウィンドウ位置を保存/復元
function saveWindowPosition() {
  if (win) {
    const bounds = win.getBounds();
    (store as any).set('windowBounds', bounds);
  }
}

function restoreWindowPosition() {
  const savedBounds = (store as any).get('windowBounds');
  if (savedBounds && win) {
    win.setBounds(savedBounds);
  }
}

// トレイアイコンを作成
function createTray() {
  // より堅牢なパス解決
  let iconPath = isDev 
    ? path.resolve(app.getAppPath(), 'assets', 'icons', 'icon.png')
    : path.resolve(process.resourcesPath, 'app', 'assets', 'icons', 'icon.png');

  let icon: Electron.NativeImage;
  if (fs.existsSync(iconPath)) {
    icon = nativeImage.createFromPath(iconPath);
  } else {
    // フォールバック: デフォルトアイコン
    icon = nativeImage.createEmpty();
  }
  tray = new Tray(icon.resize({ width: 16, height: 16 }));

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Show OpenClue Kai', click: () => { win?.show(); } },
    { label: 'Hide OpenClue Kai', click: () => { win?.hide(); } },
    { type: 'separator' },
    { label: 'Quit', click: () => { isQuitting = true; app.quit(); } }
  ]);

  tray.setToolTip('OpenClue Kai');
  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    if (win?.isVisible()) {
      win.hide();
    } else {
      win?.show();
      win?.focus();
    }
  });
}

function createWindow() {
  // 画面サイズを取得
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
  
  // 初期位置：画面右下
  const windowWidth = 370;
  const windowHeight = 100;
  const x = screenWidth - windowWidth - 20;
  const y = screenHeight - windowHeight - 20;
  
  win = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    x,
    y,
    minWidth: 370,
    minHeight: 100,
    frame: false,
    resizable: true,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: false,
    titleBarStyle: "hidden",
    icon: path.join(__dirname, "..", "assets", "icons", "icon.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: true,
      contextIsolation: true,
      webSecurity: false,
      allowRunningInsecureContent: true,
    },
  });

  // ウィンドウ位置を復元
  restoreWindowPosition();

  // ウィンドウ位置が変更されたら保存
  win.on('moved', () => {
    saveWindowPosition();
  });

  win.on('resized', () => {
    saveWindowPosition();
  });

  win.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      win?.hide();
    }
  });

  win.on("enter-full-screen", () => {
    win?.webContents.send("toggle-titlebar", false);
  });

  win.on("leave-full-screen", () => {
    win?.webContents.send("toggle-titlebar", true);
  });

  const url = getURL("/");
  win.loadURL(url);
  
  // トレイアイコンを作成
  createTray();
}

app.whenReady().then(() => {
  createWindow();

  // グローバルショートカットを登録（改善版）
  
  // Cmd/Ctrl + B: ウィンドウの表示/非表示を切り替え
  globalShortcut.register(process.platform === 'darwin' ? 'Cmd+B' : 'Ctrl+B', () => {
    if (!win) return;
    if (win.isVisible()) {
      win.hide();
    } else {
      win.show();
      win.focus();
    }
  });
  
  // Cmd/Ctrl + Shift + K: ウィンドウの表示/非表示を切り替え（互換性のため）
  globalShortcut.register('Control+Shift+K', () => {
    if (!win) return;
    if (win.isVisible()) {
      win.hide();
    } else {
      win.show();
      win.focus();
    }
  });
  
  // Cmd/Ctrl + H: スクリーンショットを撮る
  globalShortcut.register(process.platform === 'darwin' ? 'Cmd+H' : 'Ctrl+H', () => {
    win?.webContents.send('take-screenshot-shortcut');
  });
  
  // Cmd/Ctrl + Enter: 解決策を取得
  globalShortcut.register(process.platform === 'darwin' ? 'Cmd+Return' : 'Ctrl+Return', () => {
    win?.webContents.send('get-solution-shortcut');
  });
  
  // Cmd/Ctrl + Q: アプリケーションを終了
  globalShortcut.register(process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q', () => {
    isQuitting = true;
    app.quit();
  });
  
  // Cmd/Ctrl + Shift + D: アプリケーションを終了（互換性のため）
  globalShortcut.register('Control+Shift+D', () => {
    isQuitting = true;
    app.quit();
  });
  
  // Cmd/Ctrl + 矢印キー: ウィンドウを移動
  const moveDistance = 20;
  
  globalShortcut.register(process.platform === 'darwin' ? 'Cmd+Up' : 'Ctrl+Up', () => {
    if (win) {
      const bounds = win.getBounds();
      win.setBounds({ ...bounds, y: bounds.y - moveDistance });
    }
  });
  
  globalShortcut.register(process.platform === 'darwin' ? 'Cmd+Down' : 'Ctrl+Down', () => {
    if (win) {
      const bounds = win.getBounds();
      win.setBounds({ ...bounds, y: bounds.y + moveDistance });
    }
  });
  
  globalShortcut.register(process.platform === 'darwin' ? 'Cmd+Left' : 'Ctrl+Left', () => {
    if (win) {
      const bounds = win.getBounds();
      win.setBounds({ ...bounds, x: bounds.x - moveDistance });
    }
  });
  
  globalShortcut.register(process.platform === 'darwin' ? 'Cmd+Right' : 'Ctrl+Right', () => {
    if (win) {
      const bounds = win.getBounds();
      win.setBounds({ ...bounds, x: bounds.x + moveDistance });
    }
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
  if (tray) {
    tray.destroy();
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    isQuitting = true;
    app.quit();
  }
});

// IPCハンドラー
ipcMain.on("app/minimize", () => {
  win?.minimize();
});

ipcMain.on("app/maximize", () => {
  if (!win?.isMaximized()) {
    win?.maximize();
  } else {
    win?.unmaximize();
  }
});

ipcMain.on("app/close", () => {
  win?.hide();
});

ipcMain.on("app/quit", () => {
  isQuitting = true;
  app.quit();
});

ipcMain.on("app/increase-height-bottom", (_event, deltaHeight: number) => {
  if (win) {
    const bounds = win.getBounds();
    win.setBounds(
      {
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height + deltaHeight,
      },
      true
    );
  }
});

// スクリーンショット機能
ipcMain.handle("take-screenshot", async () => {
  try {
    const sources = await desktopCapturer.getSources({ 
      types: ["screen"],
      thumbnailSize: { 
        width: screen.getPrimaryDisplay().workAreaSize.width,
        height: screen.getPrimaryDisplay().workAreaSize.height
      }
    });
    
    if (sources.length > 0) {
      const screen = sources[0];
      const dataUrl = screen.thumbnail.toDataURL();
      return dataUrl;
    }
    
    throw new Error("No screen sources available");
  } catch (error) {
    console.error("Screenshot error:", error);
    throw error;
  }
});

// 外部リンクを開く
ipcMain.handle("open-external", (_event, url: string) => {
  shell.openExternal(url);
});

// Store API handlers
ipcMain.handle("store/get", (_event, key) => {
  return (store as any).get(key);
});

ipcMain.handle("store/set", (_event, key, value) => {
  (store as any).set(key, value);
  return true;
});

ipcMain.handle("store/delete", (_event, key) => {
  (store as any).delete(key);
  return true;
});

ipcMain.handle("store/clear", () => {
  (store as any).clear();
  return true;
});

// ウィンドウ状態を取得
ipcMain.handle("get-window-state", () => {
  if (win) {
    return {
      isVisible: win.isVisible(),
      isFocused: win.isFocused(),
      bounds: win.getBounds()
    };
  }
  return null;
});

// アクティブウィンドウ情報を取得
ipcMain.handle('get-active-window', async () => {
  try {
    const win = await activeWin();
    if (!win) return null;
    return {
      title: win.title,
      app: win.owner.name,
      processId: win.owner.processId,
      url: 'url' in win ? (win as any).url : null,
    };
  } catch (e) {
    return null;
  }
});

// User Memory Store handlers
ipcMain.handle("memory/record-action", (_event, action) => {
  userMemoryStore.recordAction(action);
  return true;
});

ipcMain.handle("memory/save-memory", (_event, memory) => {
  userMemoryStore.saveMemory(memory);
  return true;
});

ipcMain.handle("memory/search-memories", (_event, query, limit) => {
  return userMemoryStore.searchMemories(query, limit);
});

ipcMain.handle("memory/get-suggestions", (_event, context) => {
  return userMemoryStore.getSuggestions(context);
});

ipcMain.handle("memory/export-data", () => {
  return userMemoryStore.exportUserData();
});

ipcMain.handle("memory/import-data", (_event, data) => {
  userMemoryStore.importUserData(data);
  return true;
});
