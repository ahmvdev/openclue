import { contextBridge, ipcRenderer } from "electron";

export const api = {
  getVersion: () => ipcRenderer.sendSync("app/version"),
  maximize: () => ipcRenderer.send("app/maximize"),
  minimize: () => ipcRenderer.send("app/minimize"),
  onToggleTitlebar: (callback: (show: boolean) => void) =>
    ipcRenderer.on("toggle-titlebar", (_event, show) => callback(show)),
  close: () => ipcRenderer.send("app/close"),

  increaseHeightFromBottom: (delta: number) =>
    ipcRenderer.send("app/increase-height-bottom", delta),
};

contextBridge.exposeInMainWorld("electron", api);
