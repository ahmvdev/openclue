import { app, BrowserWindow, ipcMain, desktopCapturer, globalShortcut } from "electron";
import serve from "electron-serve";
import path, { join } from "path";

import { getURL } from "./lib/getUrl";
import isDev from "./lib/isDev";

if (!isDev) {
  serve({ directory: join(__dirname, "renderer"), hostname: "example" });
}

let win: BrowserWindow;

function createWindow() {
  win = new BrowserWindow({
    width: 370,
    height: 100,
    minWidth: 370,
    minHeight: 100,
    frame: false,
    resizable: false,
    transparent: true,
    titleBarStyle: "hidden",
    icon: path.join(__dirname, "renderer", "icon.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: true,
      contextIsolation: true,
      webSecurity: false,
      allowRunningInsecureContent: true,
    },
  });

  win.on("enter-full-screen", () => {
    win.webContents.send("toggle-titlebar", false);
  });

  win.on("leave-full-screen", () => {
    win.webContents.send("toggle-titlebar", true);
  });

  const url = getURL("/");
  win.loadURL(url);
}

app.whenReady().then(() => {
  createWindow();

  globalShortcut.register("Control+Shift+K", () => {
    if (!win) return;
    if (win.isVisible()) {
      win.hide();
    } else {
      win.show();
      win.focus();
    }
  });
 globalShortcut.register("Control+Shift+D", () => {
    app.quit();
  });
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

ipcMain.on("app/minimize", () => {
  win.minimize();
});

ipcMain.on("app/maximize", () => {
  if (!win.isMaximized()) {
    win.maximize();
  } else {
    win.unmaximize();
  }
});

ipcMain.on("app/close", () => {
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

ipcMain.handle("take-screenshot", async () => {
  const sources = await desktopCapturer.getSources({ types: ["screen"] });
  const screen = sources[0];
  const dataUrl = screen.thumbnail.toDataURL();
  return dataUrl;
});
