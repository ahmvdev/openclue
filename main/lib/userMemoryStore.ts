import Store from 'electron-store';

// ユーザー行動の履歴エントリ
interface UserActionEntry {
  id: string;
  timestamp: number;
  actionType: 'screenshot' | 'advice_request' | 'app_switch' | 'file_access' | 'query';
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
  type: 'note' | 'project' | 'preference' | 'pattern' | 'knowledge';
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
  
  constructor() {
    this.store = new Store<UserMemorySchema>({
      name: 'user-memory',
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
    
    // 定期的なクリーンアップ
    this.scheduleCleanup();
  }
  
  // ユーザーアクションを記録
  recordAction(action: Omit<UserActionEntry, 'id' | 'timestamp'>): void {
    const entry: UserActionEntry = {
      ...action,
      id: this.generateId(),
      timestamp: Date.now(),
    };
    
    const history = this.store.get('actionHistory');
    history.push(entry);
    
    // 最大エントリ数を超えたら古いものを削除
    const maxEntries = this.store.get('memorySettings.maxHistoryEntries');
    if (history.length > maxEntries) {
      history.splice(0, history.length - maxEntries);
    }
    
    this.store.set('actionHistory', history);
    
    // アプリ使用統計を更新
    if (action.applicationName) {
      this.updateAppStats(action.applicationName);
    }
    
    // パターン認識の更新
    if (this.store.get('memorySettings.autoLearnEnabled')) {
      this.detectPatterns();
    }
  }
  
  // 長期記憶を保存
  saveMemory(memory: Omit<MemoryEntry, 'id' | 'createdAt' | 'updatedAt' | 'accessCount' | 'lastAccessed'>): void {
    const entry: MemoryEntry = {
      ...memory,
      id: this.generateId(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      accessCount: 0,
      lastAccessed: Date.now(),
    };
    
    const memories = this.store.get('longTermMemory');
    memories.push(entry);
    
    // 最大エントリ数を超えたら関連性の低いものを削除
    const maxEntries = this.store.get('memorySettings.maxMemoryEntries');
    if (memories.length > maxEntries) {
      memories.sort((a, b) => (a.relevanceScore * a.accessCount) - (b.relevanceScore * b.accessCount));
      memories.splice(0, memories.length - maxEntries);
    }
    
    this.store.set('longTermMemory', memories);
  }
  
  // 関連する記憶を検索
  searchMemories(query: string, limit: number = 10): MemoryEntry[] {
    const memories = this.store.get('longTermMemory');
    const queryLower = query.toLowerCase();
    
    // スコアリング
    const scored = memories.map(memory => {
      let score = 0;
      
      // タイトルマッチ
      if (memory.title.toLowerCase().includes(queryLower)) {
        score += 3;
      }
      
      // コンテンツマッチ
      if (memory.content.toLowerCase().includes(queryLower)) {
        score += 2;
      }
      
      // タグマッチ
      memory.tags.forEach(tag => {
        if (tag.toLowerCase().includes(queryLower)) {
          score += 1;
        }
      });
      
      // 関連性スコアと最近のアクセスを考慮
      score *= memory.relevanceScore;
      score *= (1 + memory.accessCount * 0.1);
      
      const daysSinceAccess = (Date.now() - memory.lastAccessed) / (1000 * 60 * 60 * 24);
      score *= Math.exp(-daysSinceAccess / 30); // 30日で減衰
      
      return { memory, score };
    });
    
    // スコア順にソートして上位を返す
    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(item => {
        // アクセスカウントを更新
        item.memory.accessCount++;
        item.memory.lastAccessed = Date.now();
        return item.memory;
      });
  }
  
  // アプリ使用統計を更新
  private updateAppStats(appName: string): void {
    const stats = this.store.get('appUsageStats');
    
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
    
    this.store.set('appUsageStats', stats);
  }
  
  // パターン認識
  private detectPatterns(): void {
    const history = this.store.get('actionHistory');
    const patterns = this.store.get('behaviorPatterns');
    
    // 簡単なパターン検出ロジック（実際はもっと複雑にできる）
    // 例：特定の時間帯に特定のアプリを使う傾向
    const recentActions = history.slice(-100);
    const timePatterns: Record<string, string[]> = {};
    
    recentActions.forEach(action => {
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
    Object.entries(timePatterns).forEach(([timeSlot, apps]) => {
      const mostFrequentApp = this.getMostFrequent(apps);
      if (mostFrequentApp && this.getFrequencyRate(apps, mostFrequentApp) > 0.5) {
        const patternId = `time-app-${timeSlot}-${mostFrequentApp}`;
        const existingPattern = patterns.find(p => p.id === patternId);
        
        if (existingPattern) {
          existingPattern.frequency++;
          existingPattern.lastOccurred = Date.now();
          existingPattern.confidence = Math.min(existingPattern.confidence * 1.1, 1);
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
    });
    
    this.store.set('behaviorPatterns', patterns);
  }
  
  // 提案を生成
  getSuggestions(context: { currentTime: Date; currentApp?: string; recentQuery?: string }): string[] {
    const suggestions: string[] = [];
    const patterns = this.store.get('behaviorPatterns');
    const memories = this.store.get('longTermMemory');
    const profile = this.store.get('userProfile');
    
    // 時間ベースの提案
    const currentHour = context.currentTime.getHours();
    const timeSlot = `${currentHour}:00-${currentHour + 1}:00`;
    
    const timePatterns = patterns.filter(p => 
      p.triggers.includes(timeSlot) && p.confidence > 0.7
    );
    
    timePatterns.forEach(pattern => {
      suggestions.push(`この時間帯は通常${pattern.outcomes[0]}を使用されています`);
    });
    
    // 最近のクエリに基づく提案
    if (context.recentQuery) {
      const relatedMemories = this.searchMemories(context.recentQuery, 3);
      relatedMemories.forEach(memory => {
        suggestions.push(`関連情報: ${memory.title}`);
      });
    }
    
    // プロファイルベースの提案
    if (profile.frequentTasks.length > 0 && Math.random() < 0.3) {
      const task = profile.frequentTasks[Math.floor(Math.random() * profile.frequentTasks.length)];
      suggestions.push(`よく行うタスク: ${task}`);
    }
    
    return suggestions.slice(0, 5);
  }
  
  // ユーティリティ関数
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  private getMostFrequent<T>(arr: T[]): T | null {
    if (arr.length === 0) return null;
    
    const counts = new Map<T, number>();
    arr.forEach(item => {
      counts.set(item, (counts.get(item) || 0) + 1);
    });
    
    let maxCount = 0;
    let mostFrequent: T | null = null;
    
    counts.forEach((count, item) => {
      if (count > maxCount) {
        maxCount = count;
        mostFrequent = item;
      }
    });
    
    return mostFrequent;
  }
  
  private getFrequencyRate<T>(arr: T[], item: T): number {
    if (arr.length === 0) return 0;
    return arr.filter(i => i === item).length / arr.length;
  }
  
  // 定期的なクリーンアップ
  private scheduleCleanup(): void {
    setInterval(() => {
      const retentionDays = this.store.get('memorySettings.retentionDays');
      const cutoffTime = Date.now() - (retentionDays * 24 * 60 * 60 * 1000);
      
      // 古い履歴を削除
      let history = this.store.get('actionHistory');
      history = history.filter(entry => entry.timestamp > cutoffTime);
      this.store.set('actionHistory', history);
      
      // 古いパターンを削除
      let patterns = this.store.get('behaviorPatterns');
      patterns = patterns.filter(pattern => pattern.lastOccurred > cutoffTime);
      this.store.set('behaviorPatterns', patterns);
    }, 24 * 60 * 60 * 1000); // 1日ごと
  }
  
  // エクスポート機能
  exportUserData(): UserMemorySchema {
    return this.store.store;
  }
  
  // インポート機能
  importUserData(data: Partial<UserMemorySchema>): void {
    Object.entries(data).forEach(([key, value]) => {
      this.store.set(key as keyof UserMemorySchema, value);
    });
  }
}

export default new UserMemoryStore();