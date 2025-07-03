import Store from "electron-store";
import { v4 as uuidv4 } from "uuid";

// ユーザー行動の履歴エントリ
interface UserActionEntry {
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

// アプリケーション使用統計
interface AppUsageStats {
  appName: string;
  totalUsageTime: number;
  lastUsed: number;
  frequency: number;
  commonActions: string[];
  preferredFeatures: string[];
}

// 長期記憶エントリ
interface MemoryEntry {
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
  associations: string[]; // 関連する他の記憶のID
  metadata?: Record<string, any>;
}

// ユーザープロファイル
interface UserProfile {
  workStyle: {
    preferredWorkingHours: string[];
    focusPatterns: { time: string; duration: number }[];
    breakPatterns: { time: string; duration: number }[];
  };
  expertise: string[];
  interests: string[];
  frequentTasks: string[];
  shortcuts: Record<string, string>;
  preferences: Record<string, any>;
}

// パターン認識
interface BehaviorPattern {
  id: string;
  pattern: string;
  frequency: number;
  lastOccurred: number;
  triggers: string[];
  outcomes: string[];
  confidence: number;
}

// メモリストアのスキーマ
interface UserMemorySchema {
  // ユーザー行動履歴
  actionHistory: UserActionEntry[];

  // アプリケーション使用統計
  appUsageStats: Record<string, AppUsageStats>;

  // 長期記憶
  longTermMemory: MemoryEntry[];

  // ユーザープロファイル
  userProfile: UserProfile;

  // 行動パターン
  behaviorPatterns: BehaviorPattern[];

  // 設定
  memorySettings: {
    maxHistoryEntries: number;
    maxMemoryEntries: number;
    autoLearnEnabled: boolean;
    privacyMode: boolean;
    retentionDays: number;
  };
}

class UserMemoryStore {
  private store: Store<UserMemorySchema>;
  private searchIndex: Map<string, Set<string>> = new Map(); // word -> memory IDs
  private tagIndex: Map<string, Set<string>> = new Map(); // tag -> memory IDs
  private searchCache: Map<
    string,
    { results: MemoryEntry[]; timestamp: number }
  > = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5分

  constructor() {
    this.store = new Store<UserMemorySchema>({
      name: "user-memory",
      defaults: {
        actionHistory: [],
        appUsageStats: {},
        longTermMemory: [],
        userProfile: {
          workStyle: {
            preferredWorkingHours: [],
            focusPatterns: [],
            breakPatterns: [],
          },
          expertise: [],
          interests: [],
          frequentTasks: [],
          shortcuts: {},
          preferences: {},
        },
        behaviorPatterns: [],
        memorySettings: {
          maxHistoryEntries: 10000,
          maxMemoryEntries: 1000,
          autoLearnEnabled: true,
          privacyMode: false,
          retentionDays: 365,
        },
      },
    });

    // 初期インデックス構築
    this.buildSearchIndex();

    // 定期的なクリーンアップ
    this.scheduleCleanup();
  }

  // ユーザーアクションを記録
  recordAction(action: Omit<UserActionEntry, "id" | "timestamp">): void {
    const entry: UserActionEntry = {
      ...action,
      id: this.generateId(),
      timestamp: Date.now(),
    };

    const history = (this.store as any).get("actionHistory");
    history.push(entry);

    // 最大エントリ数を超えたら古いものを削除
    const maxEntries = (this.store as any).get(
      "memorySettings.maxHistoryEntries",
    );
    if (history.length > maxEntries) {
      history.splice(0, history.length - maxEntries);
    }

    (this.store as any).set("actionHistory", history);

    // アプリ使用統計を更新
    if (action.applicationName) {
      this.updateAppStats(action.applicationName);
    }

    // パターン認識の更新
    if ((this.store as any).get("memorySettings.autoLearnEnabled")) {
      this.detectPatterns();
    }
  }

  // 検索インデックスを構築
  private buildSearchIndex(): void {
    this.searchIndex.clear();
    this.tagIndex.clear();

    const memories = (this.store as any).get("longTermMemory") as MemoryEntry[];
    memories.forEach((memory: MemoryEntry) => {
      this.addToSearchIndex(memory);
    });
  }

  // メモリを検索インデックスに追加
  private addToSearchIndex(memory: MemoryEntry): void {
    const text = (memory.title + " " + memory.content).toLowerCase();
    const words = text.split(/\W+/).filter((word) => word.length > 1);

    // 単語インデックス
    words.forEach((word: string) => {
      if (!this.searchIndex.has(word)) {
        this.searchIndex.set(word, new Set());
      }
      this.searchIndex.get(word)!.add(memory.id);
    });

    // タグインデックス
    memory.tags.forEach((tag: string) => {
      const normalizedTag = tag.toLowerCase();
      if (!this.tagIndex.has(normalizedTag)) {
        this.tagIndex.set(normalizedTag, new Set());
      }
      this.tagIndex.get(normalizedTag)!.add(memory.id);
    });
  }

  // インデックスからメモリを削除
  private removeFromSearchIndex(memory: MemoryEntry): void {
    const text = (memory.title + " " + memory.content).toLowerCase();
    const words = text.split(/\W+/).filter((word) => word.length > 1);

    words.forEach((word: string) => {
      const wordSet = this.searchIndex.get(word);
      if (wordSet) {
        wordSet.delete(memory.id);
        if (wordSet.size === 0) {
          this.searchIndex.delete(word);
        }
      }
    });

    memory.tags.forEach((tag: string) => {
      const normalizedTag = tag.toLowerCase();
      const tagSet = this.tagIndex.get(normalizedTag);
      if (tagSet) {
        tagSet.delete(memory.id);
        if (tagSet.size === 0) {
          this.tagIndex.delete(normalizedTag);
        }
      }
    });
  }

  // キャッシュをクリア
  private clearSearchCache(): void {
    this.searchCache.clear();
  }

  // 期限切れキャッシュを削除
  private cleanExpiredCache(): void {
    const now = Date.now();
    for (const [key, value] of this.searchCache.entries()) {
      if (now - value.timestamp > this.CACHE_DURATION) {
        this.searchCache.delete(key);
      }
    }
  }

  // 長期記憶を保存
  saveMemory(
    memory: Omit<
      MemoryEntry,
      "id" | "createdAt" | "updatedAt" | "accessCount" | "lastAccessed"
    >,
  ): void {
    const entry: MemoryEntry = {
      ...memory,
      id: this.generateId(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      accessCount: 0,
      lastAccessed: Date.now(),
    };

    const memories = (this.store as any).get("longTermMemory");
    memories.push(entry);

    // インデックスに追加
    this.addToSearchIndex(entry);

    // 最大エントリ数を超えたら関連性の低いものを削除
    const maxEntries = (this.store as any).get(
      "memorySettings.maxMemoryEntries",
    );
    if (memories.length > maxEntries) {
      memories.sort(
        (a: MemoryEntry, b: MemoryEntry) =>
          a.relevanceScore * a.accessCount - b.relevanceScore * b.accessCount,
      );
      const removed = memories.splice(0, memories.length - maxEntries);
      // 削除されたメモリをインデックスからも削除
      removed.forEach((memory: MemoryEntry) =>
        this.removeFromSearchIndex(memory),
      );
    }

    (this.store as any).set("longTermMemory", memories);
    this.clearSearchCache();
  }

  // 高度な検索フィルタ
  searchMemories(
    query: string,
    limit: number = 10,
    filters?: {
      type?: MemoryEntry["type"][];
      tags?: string[];
      dateRange?: { start: number; end: number };
      minRelevance?: number;
      sortBy?: "relevance" | "date" | "access";
      useSemantic?: boolean;
    },
  ): MemoryEntry[] {
    // キャッシュチェック
    this.cleanExpiredCache();
    const cacheKey = JSON.stringify({ query, limit, filters });
    const cached = this.searchCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.results;
    }

    const memories = (this.store as any).get("longTermMemory") as MemoryEntry[];
    const queryLower = query.toLowerCase().trim();

    let filteredMemories = memories;

    // フィルタ適用
    if (filters) {
      if (filters.type && filters.type.length > 0) {
        filteredMemories = filteredMemories.filter((m) =>
          filters.type!.includes(m.type),
        );
      }

      if (filters.tags && filters.tags.length > 0) {
        filteredMemories = filteredMemories.filter((m) =>
          filters.tags!.some((tag) =>
            m.tags.some((mTag) =>
              mTag.toLowerCase().includes(tag.toLowerCase()),
            ),
          ),
        );
      }

      if (filters.dateRange) {
        filteredMemories = filteredMemories.filter(
          (m) =>
            m.createdAt >= filters.dateRange!.start &&
            m.createdAt <= filters.dateRange!.end,
        );
      }

      if (filters.minRelevance !== undefined) {
        filteredMemories = filteredMemories.filter(
          (m) => m.relevanceScore >= filters.minRelevance!,
        );
      }
    }

    let results: MemoryEntry[] = [];

    if (!queryLower) {
      // クエリが空の場合は全てのフィルタされたメモリを返す
      results = filteredMemories;
    } else if (filters?.useSemantic) {
      // セマンティック検索（TF-IDF）
      results = this.performSemanticSearch(queryLower, filteredMemories);
    } else {
      // インデックスベース高速検索
      results = this.performIndexedSearch(queryLower, filteredMemories);
    }

    // ソート
    const sortBy = filters?.sortBy || "relevance";
    results.sort((a, b) => {
      switch (sortBy) {
        case "date":
          return b.updatedAt - a.updatedAt;
        case "access":
          return b.accessCount - a.accessCount;
        default: // relevance
          let scoreA = a.relevanceScore * (1 + a.accessCount * 0.1);
          let scoreB = b.relevanceScore * (1 + b.accessCount * 0.1);
          const daysSinceAccessA =
            (Date.now() - a.lastAccessed) / (1000 * 60 * 60 * 24);
          const daysSinceAccessB =
            (Date.now() - b.lastAccessed) / (1000 * 60 * 60 * 24);
          scoreA *= Math.exp(-daysSinceAccessA / 30);
          scoreB *= Math.exp(-daysSinceAccessB / 30);
          return scoreB - scoreA;
      }
    });

    const limitedResults = results.slice(0, limit);

    // アクセス統計更新
    limitedResults.forEach((memory) => {
      memory.accessCount++;
      memory.lastAccessed = Date.now();
    });

    // キャッシュに保存
    this.searchCache.set(cacheKey, {
      results: limitedResults,
      timestamp: Date.now(),
    });

    return limitedResults;
  }

  // インデックスベース検索
  private performIndexedSearch(
    query: string,
    memories: MemoryEntry[],
  ): MemoryEntry[] {
    const queryWords = query.split(/\W+/).filter((word) => word.length > 1);
    const candidateIds = new Set<string>();

    // インデックスから候補を取得
    queryWords.forEach((word) => {
      const wordMatches = this.searchIndex.get(word);
      if (wordMatches) {
        wordMatches.forEach((id) => candidateIds.add(id));
      }
    });

    // タグからも検索
    queryWords.forEach((word) => {
      const tagMatches = this.tagIndex.get(word);
      if (tagMatches) {
        tagMatches.forEach((id) => candidateIds.add(id));
      }
    });

    // 候補をフィルタ
    const memoryMap = new Map(memories.map((m) => [m.id, m]));
    const candidates = Array.from(candidateIds)
      .map((id) => memoryMap.get(id))
      .filter(Boolean) as MemoryEntry[];

    // スコア計算
    return candidates
      .map((memory) => {
        let score = 0;
        const titleLower = memory.title.toLowerCase();
        const contentLower = memory.content.toLowerCase();

        queryWords.forEach((word) => {
          if (titleLower.includes(word)) score += 3;
          if (contentLower.includes(word)) score += 2;
          memory.tags.forEach((tag) => {
            if (tag.toLowerCase().includes(word)) score += 1;
          });
        });

        return { memory, score };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((item) => item.memory);
  }

  // セマンティック検索（TF-IDF）
  private performSemanticSearch(
    query: string,
    memories: MemoryEntry[],
  ): MemoryEntry[] {
    const docs = memories.map((m) =>
      (m.title + " " + m.content + " " + m.tags.join(" "))
        .toLowerCase()
        .split(/\W+/),
    );
    const queryWords = query.split(/\W+/).filter((word) => word.length > 1);
    const docCount = docs.length;

    const df: Record<string, number> = {};
    docs.forEach((doc) => {
      [...new Set(doc)].forEach((word) => {
        if (!df[word]) df[word] = 0;
        df[word]++;
      });
    });

    return memories
      .map((memory, i) => {
        let score = 0;
        queryWords.forEach((word) => {
          if (!word) return;
          const tf = docs[i].filter((w) => w === word).length;
          const idf = df[word] ? Math.log(docCount / df[word]) : 0;
          score += tf * idf;
        });
        return { memory, score };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((item) => item.memory);
  }

  // アプリ使用統計を更新
  private updateAppStats(appName: string): void {
    const stats = (this.store as any).get("appUsageStats");

    if (!stats[appName]) {
      stats[appName] = {
        appName,
        totalUsageTime: 0,
        lastUsed: Date.now(),
        frequency: 0,
        commonActions: [],
        preferredFeatures: [],
      };
    }

    stats[appName].frequency++;
    stats[appName].lastUsed = Date.now();

    (this.store as any).set("appUsageStats", stats);
  }

  // パターン認識
  private detectPatterns(): void {
    const history = (this.store as any).get("actionHistory");
    const patterns = (this.store as any).get("behaviorPatterns");

    // 簡単なパターン検出ロジック（実際はもっと複雑にできる）
    // 例：特定の時間帯に特定のアプリを使う傾向
    const recentActions = history.slice(-100);
    const timePatterns: Record<string, string[]> = {};

    recentActions.forEach((action: UserActionEntry) => {
      const hour = new Date(action.timestamp).getHours();
      const timeSlot = `${hour}:00-${hour + 1}:00`;

      if (action.applicationName) {
        if (!timePatterns[timeSlot]) {
          timePatterns[timeSlot] = [];
        }
        timePatterns[timeSlot].push(action.applicationName);
      }
    });

    // パターンを更新
    Object.entries(timePatterns).forEach(
      ([timeSlot, apps]: [string, string[]]) => {
        const mostFrequentApp = this.getMostFrequent(apps);
        if (
          mostFrequentApp &&
          this.getFrequencyRate(apps, mostFrequentApp) > 0.5
        ) {
          const patternId = `time-app-${timeSlot}-${mostFrequentApp}`;
          const existingPattern = patterns.find((p) => p.id === patternId);

          if (existingPattern) {
            existingPattern.frequency++;
            existingPattern.lastOccurred = Date.now();
            existingPattern.confidence = Math.min(
              existingPattern.confidence * 1.1,
              1,
            );
          } else {
            patterns.push({
              id: patternId,
              pattern: `${timeSlot}に${mostFrequentApp}を使用する傾向`,
              frequency: 1,
              lastOccurred: Date.now(),
              triggers: [timeSlot],
              outcomes: [mostFrequentApp],
              confidence: 0.5,
            });
          }
        }
      },
    );

    // --- シーケンスパターン検出の追加 ---
    // 例: 3つのアプリの連続利用パターンを検出
    const sequenceLength = 3;
    const sequenceCounts: Record<string, number> = {};
    for (let i = 0; i <= recentActions.length - sequenceLength; i++) {
      const seq = recentActions
        .slice(i, i + sequenceLength)
        .map((a) => a.applicationName || "")
        .join(">");
      if (seq.includes("")) continue; // 空アプリ名はスキップ
      if (!sequenceCounts[seq]) sequenceCounts[seq] = 0;
      sequenceCounts[seq]++;
    }
    Object.entries(sequenceCounts).forEach(([seq, count]: [string, number]) => {
      if (count > 1) {
        // 2回以上繰り返されたシーケンスのみ
        const patternId = `app-seq-${seq}`;
        const existingPattern = patterns.find((p) => p.id === patternId);
        if (existingPattern) {
          existingPattern.frequency += count;
          existingPattern.lastOccurred = Date.now();
          existingPattern.confidence = Math.min(
            existingPattern.confidence * 1.1,
            1,
          );
        } else {
          patterns.push({
            id: patternId,
            pattern: `アプリ利用シーケンス: ${seq}`,
            frequency: count,
            lastOccurred: Date.now(),
            triggers: seq.split(">"),
            outcomes: [],
            confidence: 0.5,
          });
        }
      }
    });

    (this.store as any).set("behaviorPatterns", patterns);
  }

  // 提案を生成
  getSuggestions(context: {
    currentTime: Date;
    currentApp?: string;
    recentQuery?: string;
  }): string[] {
    const suggestions: string[] = [];
    const patterns = (this.store as any).get("behaviorPatterns");
    const memories = (this.store as any).get("longTermMemory");
    const profile = (this.store as any).get("userProfile");

    // 時間ベースの提案
    const currentHour = context.currentTime.getHours();
    const timeSlot = `${currentHour}:00-${currentHour + 1}:00`;

    const timePatterns = patterns.filter(
      (p) => p.triggers.includes(timeSlot) && p.confidence > 0.7,
    );

    timePatterns.forEach((pattern: BehaviorPattern) => {
      suggestions.push(
        `この時間帯は通常${pattern.outcomes[0]}を使用されています`,
      );
    });

    // 最近のクエリに基づく提案
    if (context.recentQuery) {
      const relatedMemories = this.searchMemories(context.recentQuery, 3);
      relatedMemories.forEach((memory: MemoryEntry) => {
        suggestions.push(`関連情報: ${memory.title}`);
      });
    }

    // プロファイルベースの提案
    if (profile.frequentTasks.length > 0 && Math.random() < 0.3) {
      const task =
        profile.frequentTasks[
          Math.floor(Math.random() * profile.frequentTasks.length)
        ];
      suggestions.push(`よく行うタスク: ${task}`);
    }

    return suggestions.slice(0, 5);
  }

  // 行動パターンを取得
  getBehaviorPatterns(): BehaviorPattern[] {
    return (this.store as any).get("behaviorPatterns") || [];
  }

  // ユーティリティ関数
  private generateId(): string {
    return uuidv4();
  }

  private getMostFrequent<T>(arr: T[]): T | null {
    if (arr.length === 0) return null;

    const counts = new Map<T, number>();
    arr.forEach((item: T) => {
      counts.set(item, (counts.get(item) || 0) + 1);
    });

    let maxCount = 0;
    let mostFrequent: T | null = null;

    counts.forEach((count: number, item: T) => {
      if (count > maxCount) {
        maxCount = count;
        mostFrequent = item;
      }
    });

    return mostFrequent;
  }

  private getFrequencyRate<T>(arr: T[], item: T): number {
    if (arr.length === 0) return 0;
    return arr.filter((i: T) => i === item).length / arr.length;
  }

  // 定期的なクリーンアップ
  private scheduleCleanup(): void {
    setInterval(
      () => {
        const retentionDays = (this.store as any).get(
          "memorySettings.retentionDays",
        );
        const cutoffTime = Date.now() - retentionDays * 24 * 60 * 60 * 1000;

        // 古い履歴を削除
        let history = (this.store as any).get("actionHistory");
        history = history.filter(
          (entry: UserActionEntry) => entry.timestamp > cutoffTime,
        );
        (this.store as any).set("actionHistory", history);

        // 古いパターンを削除
        let patterns = (this.store as any).get("behaviorPatterns");
        patterns = patterns.filter(
          (pattern: BehaviorPattern) => pattern.lastOccurred > cutoffTime,
        );
        (this.store as any).set("behaviorPatterns", patterns);
      },
      24 * 60 * 60 * 1000,
    ); // 1日ごと
  }

  // タグ管理
  getAllTags(): { tag: string; count: number }[] {
    const tagCounts = new Map<string, number>();
    this.tagIndex.forEach((ids, tag) => {
      tagCounts.set(tag, ids.size);
    });

    return Array.from(tagCounts.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);
  }

  // タグの統合
  mergeTags(oldTag: string, newTag: string): void {
    const memories = (this.store as any).get("longTermMemory") as MemoryEntry[];
    let updated = false;

    memories.forEach((memory) => {
      const tagIndex = memory.tags.findIndex(
        (tag) => tag.toLowerCase() === oldTag.toLowerCase(),
      );
      if (tagIndex !== -1) {
        memory.tags[tagIndex] = newTag;
        memory.updatedAt = Date.now();
        updated = true;
      }
    });

    if (updated) {
      (this.store as any).set("longTermMemory", memories);
      this.buildSearchIndex(); // インデックス再構築
      this.clearSearchCache();
    }
  }

  // タグの削除
  removeTag(tagToRemove: string): void {
    const memories = (this.store as any).get("longTermMemory") as MemoryEntry[];
    let updated = false;

    memories.forEach((memory) => {
      const originalLength = memory.tags.length;
      memory.tags = memory.tags.filter(
        (tag) => tag.toLowerCase() !== tagToRemove.toLowerCase(),
      );
      if (memory.tags.length !== originalLength) {
        memory.updatedAt = Date.now();
        updated = true;
      }
    });

    if (updated) {
      (this.store as any).set("longTermMemory", memories);
      this.buildSearchIndex(); // インデックス再構築
      this.clearSearchCache();
    }
  }

  // メモリの更新
  updateMemory(
    id: string,
    updates: Partial<Omit<MemoryEntry, "id" | "createdAt">>,
  ): boolean {
    const memories = (this.store as any).get("longTermMemory") as MemoryEntry[];
    const memoryIndex = memories.findIndex((m) => m.id === id);

    if (memoryIndex === -1) return false;

    const oldMemory = { ...memories[memoryIndex] };
    memories[memoryIndex] = {
      ...memories[memoryIndex],
      ...updates,
      updatedAt: Date.now(),
    };

    // インデックス更新
    this.removeFromSearchIndex(oldMemory);
    this.addToSearchIndex(memories[memoryIndex]);

    (this.store as any).set("longTermMemory", memories);
    this.clearSearchCache();

    return true;
  }

  // メモリの削除
  deleteMemory(id: string): boolean {
    const memories = (this.store as any).get("longTermMemory") as MemoryEntry[];
    const memoryIndex = memories.findIndex((m) => m.id === id);

    if (memoryIndex === -1) return false;

    const removedMemory = memories[memoryIndex];
    memories.splice(memoryIndex, 1);

    // インデックスから削除
    this.removeFromSearchIndex(removedMemory);

    (this.store as any).set("longTermMemory", memories);
    this.clearSearchCache();

    return true;
  }

  // 統計情報
  getMemoryStats(): {
    totalMemories: number;
    memoryTypes: Record<string, number>;
    totalTags: number;
    averageRelevance: number;
    mostAccessedMemory: MemoryEntry | null;
  } {
    const memories = (this.store as any).get("longTermMemory") as MemoryEntry[];
    const typeCount: Record<string, number> = {};
    let totalRelevance = 0;
    let mostAccessed: MemoryEntry | null = null;

    memories.forEach((memory) => {
      typeCount[memory.type] = (typeCount[memory.type] || 0) + 1;
      totalRelevance += memory.relevanceScore;

      if (!mostAccessed || memory.accessCount > mostAccessed.accessCount) {
        mostAccessed = memory;
      }
    });

    return {
      totalMemories: memories.length,
      memoryTypes: typeCount,
      totalTags: this.tagIndex.size,
      averageRelevance:
        memories.length > 0 ? totalRelevance / memories.length : 0,
      mostAccessedMemory: mostAccessed,
    };
  }

  // エクスポート機能
  exportUserData(): UserMemorySchema {
    return (this.store as any).store;
  }

  // インポート機能
  importUserData(data: Partial<UserMemorySchema>): void {
    Object.entries(data).forEach(([key, value]) => {
      (this.store as any).set(key as keyof UserMemorySchema, value);
    });

    // インデックス再構築
    this.buildSearchIndex();
    this.clearSearchCache();
  }
}

export default new UserMemoryStore();
