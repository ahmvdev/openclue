export interface IElectronAPI {
  // ウィンドウ操作
  getVersion: () => string;
  maximize: () => void;
  minimize: () => void;
  close: () => void;
  quit: () => void;
  
  // タイトルバーのトグル
  onToggleTitlebar: (callback: (show: boolean) => void) => void;
  
  // ウィンドウサイズ変更
  increaseHeightFromBottom: (delta: number) => void;

  // スクリーンショット機能
  takeScreenshot: () => Promise<Blob>;
  
  // ショートカットキーのイベントリスナー
  onTakeScreenshotShortcut: (callback: () => void) => void;
  onGetSolutionShortcut: (callback: () => void) => void;
  
  // 外部リンクを開く
  openExternal: (url: string) => void;

  // Store API
  store: {
    get: (key: string) => Promise<any>;
    set: (key: string, value: any) => Promise<boolean>;
    delete: (key: string) => Promise<boolean>;
    clear: () => Promise<boolean>;
  };
  
  // ウィンドウ状態を取得
  getWindowState: () => Promise<{
    isVisible: boolean;
    isFocused: boolean;
    bounds: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  } | null>;
}

declare global {
  interface Window {
    electron: IElectronAPI;
  }
}
