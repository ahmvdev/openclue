import { useState, useEffect, useCallback, useRef } from "react";
import { UserActionEntry, MemoryEntry } from "../electron";
import {
  memoryOrganizationService,
  MemoryOrganizationInsights,
} from "../lib/memoryOrganizationService";
import {
  advancedSuggestionService,
  AdvancedSuggestion,
  ContextualEnvironment,
} from "../lib/advancedSuggestionService";

interface UseUserMemoryOptions {
  autoRecord?: boolean;
  recordInterval?: number;
  searchDebounceMs?: number;
}

interface SearchFilters {
  type?: MemoryEntry["type"][];
  tags?: string[];
  dateRange?: { start: number; end: number };
  minRelevance?: number;
  sortBy?: "relevance" | "date" | "access";
  useSemantic?: boolean;
}

export const useUserMemory = (options: UseUserMemoryOptions = {}) => {
  const {
    autoRecord = true,
    recordInterval = 60000,
    searchDebounceMs = 300,
  } = options;

  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [advancedSuggestions, setAdvancedSuggestions] = useState<
    AdvancedSuggestion[]
  >([]);
  const [recentMemories, setRecentMemories] = useState<MemoryEntry[]>([]);
  const [isRecording, setIsRecording] = useState(true); // 常にオン
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [allTags, setAllTags] = useState<{ tag: string; count: number }[]>([]);
  const [memoryStats, setMemoryStats] = useState<any>(null);
  const [organizationInsights, setOrganizationInsights] =
    useState<MemoryOrganizationInsights | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isOrganizing, setIsOrganizing] = useState(false);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // アクションを記録
  const recordAction = useCallback(
    async (
      actionType: UserActionEntry["actionType"],
      data: Partial<Omit<UserActionEntry, "id" | "timestamp" | "actionType">>,
    ) => {
      if (!isRecording) return;

      try {
        await window.electron.memory.recordAction({
          actionType,
          ...data,
        });
      } catch (error) {
        console.error("Failed to record action:", error);
      }
    },
    [isRecording],
  );

  // 長期記憶を保存
  const saveMemory = useCallback(
    async (
      type: MemoryEntry["type"],
      title: string,
      content: string,
      tags: string[] = [],
      relevanceScore: number = 0.5,
      associations: string[] = [],
      metadata?: Record<string, any>,
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
        console.error("Failed to save memory:", error);
        return false;
      }
    },
    [],
  );

  // 記憶を検索（デバウンス付き）
  const searchMemories = useCallback(
    async (
      query: string,
      limit: number = 10,
      filters?: SearchFilters,
    ): Promise<MemoryEntry[]> => {
      return new Promise((resolve) => {
        if (searchTimeoutRef.current) {
          clearTimeout(searchTimeoutRef.current);
        }

        setIsSearching(true);

        searchTimeoutRef.current = setTimeout(async () => {
          try {
            const results = await window.electron.memory.searchMemories(
              query,
              limit,
              filters,
            );

            // 検索履歴に追加（空でない場合）
            if (query.trim() && !searchHistory.includes(query)) {
              const newHistory = [query, ...searchHistory.slice(0, 9)]; // 最大10件
              setSearchHistory(newHistory);
            }

            resolve(results);
          } catch (error) {
            console.error("Failed to search memories:", error);
            resolve([]);
          } finally {
            setIsSearching(false);
          }
        }, searchDebounceMs);
      });
    },
    [searchHistory, searchDebounceMs],
  );

  // 即座に検索（デバウンスなし）
  const searchMemoriesImmediate = useCallback(
    async (query: string, limit: number = 10, filters?: SearchFilters) => {
      try {
        setIsSearching(true);
        const results = await window.electron.memory.searchMemories(
          query,
          limit,
          filters,
        );
        return results;
      } catch (error) {
        console.error("Failed to search memories:", error);
        return [];
      } finally {
        setIsSearching(false);
      }
    },
    [],
  );

  // タグ管理
  const getAllTags = useCallback(async () => {
    try {
      const tags = await window.electron.memory.getAllTags();
      setAllTags(tags);
      return tags;
    } catch (error) {
      console.error("Failed to get tags:", error);
      return [];
    }
  }, []);

  const mergeTags = useCallback(async (oldTag: string, newTag: string) => {
    try {
      await window.electron.memory.mergeTags(oldTag, newTag);
      await getAllTags();
      await refreshRecentMemories();
      return true;
    } catch (error) {
      console.error("Failed to merge tags:", error);
      return false;
    }
  }, []);

  const removeTag = useCallback(async (tag: string) => {
    try {
      await window.electron.memory.removeTag(tag);
      await getAllTags();
      await refreshRecentMemories();
      return true;
    } catch (error) {
      console.error("Failed to remove tag:", error);
      return false;
    }
  }, []);

  // メモリ管理
  const updateMemory = useCallback(
    async (id: string, updates: Partial<MemoryEntry>) => {
      try {
        const success = await window.electron.memory.updateMemory(id, updates);
        if (success) {
          await refreshRecentMemories();
        }
        return success;
      } catch (error) {
        console.error("Failed to update memory:", error);
        return false;
      }
    },
    [],
  );

  const deleteMemory = useCallback(async (id: string) => {
    try {
      const success = await window.electron.memory.deleteMemory(id);
      if (success) {
        await refreshRecentMemories();
        await getAllTags();
      }
      return success;
    } catch (error) {
      console.error("Failed to delete memory:", error);
      return false;
    }
  }, []);

  // 統計情報
  const getMemoryStats = useCallback(async () => {
    try {
      const stats = await window.electron.memory.getMemoryStats();
      setMemoryStats(stats);
      return stats;
    } catch (error) {
      console.error("Failed to get memory stats:", error);
      return null;
    }
  }, []);

  // 記憶の自動整理
  const organizeMemories = useCallback(async () => {
    try {
      setIsOrganizing(true);
      const insights = await memoryOrganizationService.organizeMemories();
      setOrganizationInsights(insights);
      return insights;
    } catch (error) {
      console.error("Failed to organize memories:", error);
      return null;
    } finally {
      setIsOrganizing(false);
    }
  }, []);

  // 自動整理実行
  const performAutoOrganization = useCallback(async () => {
    try {
      setIsOrganizing(true);
      const result = await memoryOrganizationService.performAutoOrganization();

      // 整理後にデータを更新
      await refreshRecentMemories();
      await getAllTags();
      await getMemoryStats();

      return result;
    } catch (error) {
      console.error("Failed to perform auto organization:", error);
      return { merged: 0, archived: 0, clustered: 0, retagged: 0 };
    } finally {
      setIsOrganizing(false);
    }
  }, [refreshRecentMemories, getAllTags, getMemoryStats]);

  // 記憶品質スコア取得
  const getMemoryQualityScore = useCallback(() => {
    return organizationInsights?.qualityScore || 0;
  }, [organizationInsights]);

  // 最近の記憶を更新
  const refreshRecentMemories = useCallback(async () => {
    try {
      const memories = await window.electron.memory.searchMemories("", 5);
      setRecentMemories(memories);
    } catch (error) {
      console.error("Failed to refresh recent memories:", error);
    }
  }, []);

  // 提案を更新
  const updateSuggestions = useCallback(
    async (currentApp?: string, recentQuery?: string) => {
      try {
        const context = {
          currentTime: new Date(),
          currentApp,
          recentQuery,
        };

        const newSuggestions =
          await window.electron.memory.getSuggestions(context);
        setSuggestions(newSuggestions);
      } catch (error) {
        console.error("Failed to get suggestions:", error);
      }
    },
    [],
  );

  // 高度な提案生成
  const generateAdvancedSuggestions = useCallback(
    async (contextOverride?: Partial<ContextualEnvironment>) => {
      try {
        const activeWindow = await window.electron.getActiveWindow();

        const context: ContextualEnvironment = {
          timeOfDay: new Date().getHours(),
          dayOfWeek: new Date().getDay(),
          currentApp: activeWindow?.app,
          recentActivity: searchHistory.slice(-5),
          cognitiveState: inferCognitiveState(),
          workload: inferWorkload(),
          environmentalFactors: [],
          ...contextOverride,
        };

        const newAdvancedSuggestions =
          await advancedSuggestionService.generateAdvancedSuggestions(
            context,
            8,
          );
        setAdvancedSuggestions(newAdvancedSuggestions);

        return newAdvancedSuggestions;
      } catch (error) {
        console.error("Failed to generate advanced suggestions:", error);
        return [];
      }
    },
    [searchHistory],
  );

  // 認知状態の推測
  const inferCognitiveState =
    useCallback((): ContextualEnvironment["cognitiveState"] => {
      const hour = new Date().getHours();

      if (hour >= 9 && hour <= 11) return "focused";
      if (hour >= 14 && hour <= 16) return "creative";
      if (hour >= 16 && hour <= 18) return "analytical";
      if (hour >= 20 || hour <= 7) return "tired";

      return "focused";
    }, []);

  // 作業負荷の推測
  const inferWorkload = useCallback((): ContextualEnvironment["workload"] => {
    const recentActivity = searchHistory.slice(-10);
    const activityCount = recentActivity.length;

    if (activityCount > 7) return "heavy";
    if (activityCount > 3) return "medium";
    return "light";
  }, [searchHistory]);

  // スクリーンショット撮影時にアクションを記録
  const recordScreenshot = useCallback(
    async (context?: string, metadata?: Record<string, any>) => {
      const activeWindow = await window.electron.getActiveWindow();
      await recordAction("screenshot", {
        applicationName: activeWindow?.app,
        windowTitle: activeWindow?.title,
        context,
        metadata,
      });
    },
    [recordAction],
  );

  // アドバイスリクエスト時にアクションを記録
  const recordAdviceRequest = useCallback(
    async (query: string, response: string, context?: string) => {
      const activeWindow = await window.electron.getActiveWindow();
      await recordAction("advice_request", {
        applicationName: activeWindow?.app,
        windowTitle: activeWindow?.title,
        query,
        response,
        context,
      });

      // 提案を更新
      await updateSuggestions(activeWindow?.app, query);
    },
    [recordAction, updateSuggestions],
  );

  // アプリ切り替え時にアクションを記録
  const recordAppSwitch = useCallback(
    async (appName: string, windowTitle: string) => {
      await recordAction("app_switch", {
        applicationName: appName,
        windowTitle,
      });

      // 提案を更新
      await updateSuggestions(appName);
    },
    [recordAction, updateSuggestions],
  );

  // クエリ時にアクションを記録
  const recordQuery = useCallback(
    async (query: string, response?: string, tags?: string[]) => {
      const activeWindow = await window.electron.getActiveWindow();
      await recordAction("query", {
        applicationName: activeWindow?.app,
        windowTitle: activeWindow?.title,
        query,
        response,
        tags,
      });

      // 提案を更��
      await updateSuggestions(activeWindow?.app, query);
    },
    [recordAction, updateSuggestions],
  );

  // データをエクスポート
  const exportUserData = useCallback(async () => {
    try {
      const data = await window.electron.memory.exportData();
      return data;
    } catch (error) {
      console.error("Failed to export user data:", error);
      return null;
    }
  }, []);

  // データをインポート
  const importUserData = useCallback(
    async (data: any) => {
      try {
        await window.electron.memory.importData(data);
        await refreshRecentMemories();
        return true;
      } catch (error) {
        console.error("Failed to import user data:", error);
        return false;
      }
    },
    [refreshRecentMemories],
  );

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

  // 初期化時にデータを読み込む
  useEffect(() => {
    const initializeData = async () => {
      await refreshRecentMemories();
      await getAllTags();
      await getMemoryStats();
      await updateSuggestions();
      await generateAdvancedSuggestions();
    };

    initializeData();
  }, []);

  // 定期的な高度提案更新
  useEffect(() => {
    const interval = setInterval(
      async () => {
        await generateAdvancedSuggestions();
      },
      15 * 60 * 1000,
    ); // 15分ごと

    return () => clearInterval(interval);
  }, [generateAdvancedSuggestions]);

  // 定期的な自動整理（1日1回）
  useEffect(() => {
    const checkAndOrganize = async () => {
      const lastOrganized = localStorage.getItem("lastMemoryOrganization");
      const now = Date.now();
      const oneDayMs = 24 * 60 * 60 * 1000;

      if (!lastOrganized || now - parseInt(lastOrganized) > oneDayMs) {
        await performAutoOrganization();
        localStorage.setItem("lastMemoryOrganization", now.toString());
      }
    };

    // 起動時と1時間ごとにチェック
    checkAndOrganize();
    const interval = setInterval(checkAndOrganize, 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, [performAutoOrganization]);

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  return {
    // 状態
    suggestions,
    advancedSuggestions,
    recentMemories,
    isRecording,
    searchHistory,
    allTags,
    memoryStats,
    organizationInsights,
    isSearching,
    isOrganizing,

    // アクション記録
    recordAction,
    recordScreenshot,
    recordAdviceRequest,
    recordAppSwitch,
    recordQuery,

    // 記憶管理
    saveMemory,
    searchMemories,
    searchMemoriesImmediate,
    refreshRecentMemories,
    updateMemory,
    deleteMemory,

    // タグ管理
    getAllTags,
    mergeTags,
    removeTag,

    // 統計・分析
    getMemoryStats,
    getMemoryQualityScore,

    // 高度な機能
    generateAdvancedSuggestions,
    organizeMemories,
    performAutoOrganization,

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
