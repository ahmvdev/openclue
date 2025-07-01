import { contextBridge, ipcRenderer, shell } from 'electron';

export const api = {
  // ウィンドウ操作
  getVersion: () => ipcRenderer.sendSync('app/version'),
  maximize: () => ipcRenderer.send('app/maximize'),
  minimize: () => ipcRenderer.send('app/minimize'),
  close: () => ipcRenderer.send('app/close'),
  quit: () => ipcRenderer.send('app/quit'),
  
  // タイトルバーのトグル
  onToggleTitlebar: (callback: (show: boolean) => void) =>
    ipcRenderer.on('toggle-titlebar', (_event, show) => callback(show)),
  
  // ウィンドウサイズ変更
  increaseHeightFromBottom: (delta: number) =>
    ipcRenderer.send('app/increase-height-bottom', delta),

  // スクリーンショット機能
  takeScreenshot: async (): Promise<Blob> => {
    const dataUrl = await ipcRenderer.invoke("take-screenshot");
    const blob = await fetch(dataUrl).then((res) => res.blob());
    return blob;
  },
  
  // ショートカットキーのイベントリスナー
  onTakeScreenshotShortcut: (callback: () => void) =>
    ipcRenderer.on('take-screenshot-shortcut', () => callback()),
  
  onGetSolutionShortcut: (callback: () => void) =>
    ipcRenderer.on('get-solution-shortcut', () => callback()),
  
  // 外部リンクを開く
  openExternal: (url: string) => ipcRenderer.invoke('open-external', url),

  // Store API
  store: {
    get: (key: string) => ipcRenderer.invoke('store/get', key),
    set: (key: string, value: any) => ipcRenderer.invoke('store/set', key, value),
    delete: (key: string) => ipcRenderer.invoke('store/delete', key),
    clear: () => ipcRenderer.invoke('store/clear'),
  },
  
  // ウィンドウ状態を取得
  getWindowState: () => ipcRenderer.invoke('get-window-state'),

  // アクティブウィンドウ情報を取得
  getActiveWindow: async (): Promise<{ title: string; app: string; processId: number; url?: string | null } | null> => {
    return await ipcRenderer.invoke('get-active-window');
  },
};

contextBridge.exposeInMainWorld('electron', api);
