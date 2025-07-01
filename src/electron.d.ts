interface ElectronAPI {
  getVersion: () => string;
  maximize: () => void;
  minimize: () => void;
  onToggleTitlebar: (callback: (show: boolean) => void) => void;
  close: () => void;
  increaseHeightFromBottom: (delta: number) => void;
  takeScreenshot: () => Promise<Blob>;
  openExternal: (url: string) => void;
  store: {
    get: (key: string) => Promise<any>;
    set: (key: string, value: any) => Promise<boolean>;
  };
}

declare global {
  interface Window {
    electron?: ElectronAPI;
  }
}