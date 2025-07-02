import { useState, useEffect, useCallback, useRef } from 'react';
import { UserActionEntry, MemoryEntry } from '../electron';

interface UseUserMemoryOptions {
  autoRecord?: boolean;
  recordInterval?: number;
}

export const useUserMemory = (options: UseUserMemoryOptions = {}) => {
  const { autoRecord = true, recordInterval = 60000 } = options; // デフォルト1分
  
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [recentMemories, setRecentMemories] = useState<MemoryEntry[]>([]);
  const [isRecording, setIsRecording] = useState(autoRecord);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // アクションを記録
  const recordAction = useCallback(async (
    actionType: UserActionEntry['actionType'],
    data: Partial<Omit<UserActionEntry, 'id' | 'timestamp' | 'actionType'>>
  ) => {
    if (!isRecording) return;
    
    try {
      await window.electron.memory.recordAction({
        actionType,
        ...data,
      });
    } catch (error) {
      console.error('Failed to record action:', error);
    }
  }, [isRecording]);

  // 長期記憶を保存
  const saveMemory = useCallback(async (
    type: MemoryEntry['type'],
    title: string,
    content: string,
    tags: string[] = [],
    relevanceScore: number = 0.5,
    associations: string[] = [],
    metadata?: Record<string, any>
  ) => {
    try {
      await window.electron.memory.saveMemory({
        type,
        title,
        content,
        tags,
        relevanceScore,
        associations,
        metadata,
      });
      
      // 最近の記憶を更新
      await refreshRecentMemories();
      
      return true;
    } catch (error) {
      console.error('Failed to save memory:', error);
      return false;
    }
  }, []);

  // 記憶を検索
  const searchMemories = useCallback(async (query: string, limit: number = 10) => {
    try {
      const results = await window.electron.memory.searchMemories(query, limit);
      return results;
    } catch (error) {
      console.error('Failed to search memories:', error);
      return [];
    }
  }, []);

  // 最近の記憶を更新
  const refreshRecentMemories = useCallback(async () => {
    try {
      const memories = await window.electron.memory.searchMemories('', 5);
      setRecentMemories(memories);
    } catch (error) {
      console.error('Failed to refresh recent memories:', error);
    }
  }, []);

  // 提案を更新
  const updateSuggestions = useCallback(async (currentApp?: string, recentQuery?: string) => {
    try {
      const context = {
        currentTime: new Date(),
        currentApp,
        recentQuery,
      };
      
      const newSuggestions = await window.electron.memory.getSuggestions(context);
      setSuggestions(newSuggestions);
    } catch (error) {
      console.error('Failed to get suggestions:', error);
    }
  }, []);

  // スクリーンショット撮影時にアクションを記録
  const recordScreenshot = useCallback(async (context?: string, metadata?: Record<string, any>) => {
    const activeWindow = await window.electron.getActiveWindow();
    await recordAction('screenshot', {
      applicationName: activeWindow?.app,
      windowTitle: activeWindow?.title,
      context,
      metadata,
    });
  }, [recordAction]);

  // アドバイスリクエスト時にアクションを記録
  const recordAdviceRequest = useCallback(async (query: string, response: string, context?: string) => {
    const activeWindow = await window.electron.getActiveWindow();
    await recordAction('advice_request', {
      applicationName: activeWindow?.app,
      windowTitle: activeWindow?.title,
      query,
      response,
      context,
    });
    
    // 提案を更新
    await updateSuggestions(activeWindow?.app, query);
  }, [recordAction, updateSuggestions]);

  // アプリ切り替え時にアクションを記録
  const recordAppSwitch = useCallback(async (appName: string, windowTitle: string) => {
    await recordAction('app_switch', {
      applicationName: appName,
      windowTitle,
    });
    
    // 提案を更新
    await updateSuggestions(appName);
  }, [recordAction, updateSuggestions]);

  // クエリ時にアクションを記録
  const recordQuery = useCallback(async (query: string, response?: string, tags?: string[]) => {
    const activeWindow = await window.electron.getActiveWindow();
    await recordAction('query', {
      applicationName: activeWindow?.app,
      windowTitle: activeWindow?.title,
      query,
      response,
      tags,
    });
    
    // 提案を更新
    await updateSuggestions(activeWindow?.app, query);
  }, [recordAction, updateSuggestions]);

  // データをエクスポート
  const exportUserData = useCallback(async () => {
    try {
      const data = await window.electron.memory.exportData();
      return data;
    } catch (error) {
      console.error('Failed to export user data:', error);
      return null;
    }
  }, []);

  // データをインポート
  const importUserData = useCallback(async (data: any) => {
    try {
      await window.electron.memory.importData(data);
      await refreshRecentMemories();
      return true;
    } catch (error) {
      console.error('Failed to import user data:', error);
      return false;
    }
  }, [refreshRecentMemories]);

  // 定期的にアクティブウィンドウを記録
  useEffect(() => {
    if (autoRecord && isRecording) {
      const recordActiveWindow = async () => {
        const activeWindow = await window.electron.getActiveWindow();
        if (activeWindow) {
          await recordAppSwitch(activeWindow.app, activeWindow.title);
        }
      };

      intervalRef.current = setInterval(recordActiveWindow, recordInterval);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [autoRecord, isRecording, recordInterval, recordAppSwitch]);

  // 初期化時に最近の記憶を読み込む
  useEffect(() => {
    refreshRecentMemories();
    updateSuggestions();
  }, [refreshRecentMemories, updateSuggestions]);

  return {
    // 状態
    suggestions,
    recentMemories,
    isRecording,
    
    // アクション記録
    recordAction,
    recordScreenshot,
    recordAdviceRequest,
    recordAppSwitch,
    recordQuery,
    
    // 記憶管理
    saveMemory,
    searchMemories,
    refreshRecentMemories,
    
    // 提案
    updateSuggestions,
    
    // データ管理
    exportUserData,
    importUserData,
    
    // 記録制御
    startRecording: () => setIsRecording(true),
    stopRecording: () => setIsRecording(false),
  };
};