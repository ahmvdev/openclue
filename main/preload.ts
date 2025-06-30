import { contextBridge, ipcRenderer, desktopCapturer, shell } from 'electron';

export const api = {
  getVersion: () => ipcRenderer.sendSync('app/version'),
  maximize: () => ipcRenderer.send('app/maximize'),
  minimize: () => ipcRenderer.send('app/minimize'),
  onToggleTitlebar: (callback: (show: boolean) => void) =>
    ipcRenderer.on('toggle-titlebar', (_event, show) => callback(show)),
  close: () => ipcRenderer.send('app/close'),
  increaseHeightFromBottom: (delta: number) =>
    ipcRenderer.send('app/increase-height-bottom', delta),

  takeScreenshot: async (): Promise<Blob> => {
    const dataUrl = await ipcRenderer.invoke("take-screenshot");
    const blob = await fetch(dataUrl).then((res) => res.blob());
    return blob;
  },
  openExternal: (url: string) => shell.openExternal(url),

};

contextBridge.exposeInMainWorld('electron', api);
