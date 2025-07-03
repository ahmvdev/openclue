// ユーザー行動の履歴エントリ
export interface UserActionEntry {
  id: string;
  timestamp: number;
  actionType:
    | "screenshot"
    | "advice_request"
    | "app_switch"
    | "file_access"
    | "query";
  applicationName?: string;
  windowTitle?: string;
  context?: string;
  query?: string;
  response?: string;
  tags?: string[];
  metadata?: Record<string, any>;
}

// 長期記憶エントリ
export interface MemoryEntry {
  id: string;
  createdAt: number;
  updatedAt: number;
  type: "note" | "project" | "preference" | "pattern" | "knowledge";
  title: string;
  content: string;
  tags: string[];
  relevanceScore: number;
  accessCount: number;
  lastAccessed: number;
  associations: string[];
  metadata?: Record<string, any>;
}

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

  // アクティブウィンドウ情報を取得
  getActiveWindow: () => Promise<{
    title: string;
    app: string;
    processId: number;
    url?: string | null;
  } | null>;

  // User Memory API
  memory: {
    recordAction: (
      action: Omit<UserActionEntry, "id" | "timestamp">,
    ) => Promise<boolean>;
    saveMemory: (
      memory: Omit<
        MemoryEntry,
        "id" | "createdAt" | "updatedAt" | "accessCount" | "lastAccessed"
      >,
    ) => Promise<boolean>;
    searchMemories: (
      query: string,
      limit?: number,
      filters?: {
        type?: MemoryEntry["type"][];
        tags?: string[];
        dateRange?: { start: number; end: number };
        minRelevance?: number;
        sortBy?: "relevance" | "date" | "access";
        useSemantic?: boolean;
      },
    ) => Promise<MemoryEntry[]>;
    getSuggestions: (context: {
      currentTime: Date;
      currentApp?: string;
      recentQuery?: string;
    }) => Promise<string[]>;
    exportData: () => Promise<any>;
    importData: (data: any) => Promise<boolean>;
    getAllTags: () => Promise<{ tag: string; count: number }[]>;
    mergeTags: (oldTag: string, newTag: string) => Promise<boolean>;
    removeTag: (tag: string) => Promise<boolean>;
    updateMemory: (
      id: string,
      updates: Partial<Omit<MemoryEntry, "id" | "createdAt">>,
    ) => Promise<boolean>;
    deleteMemory: (id: string) => Promise<boolean>;
    getMemoryStats: () => Promise<{
      totalMemories: number;
      memoryTypes: Record<string, number>;
      totalTags: number;
      averageRelevance: number;
      mostAccessedMemory: MemoryEntry | null;
    }>;
  };
}

declare global {
  interface Window {
    electron: IElectronAPI;
  }
}
