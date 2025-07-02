import Store from 'electron-store';
import { v4 as uuidv4 } from 'uuid';

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
    
    const history = (this.store as any).get('actionHistory');
    history.push(entry);
    
    // 最大エントリ数を超えたら古いものを削除
    const maxEntries = (this.store as any).get('memorySettings.maxHistoryEntries');
    if (history.length > maxEntries) {
      history.splice(0, history.length - maxEntries);
    }
    
    (this.store as any).set('actionHistory', history);
    
    // アプリ使用統計を更新
    if (action.applicationName) {
      this.updateAppStats(action.applicationName);
    }
    
    // パターン認識の更新
    if ((this.store as any).get('memorySettings.autoLearnEnabled')) {
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
    
    const memories = (this.store as any).get('longTermMemory');
    memories.push(entry);
    
    // 最大エントリ数を超えたら関連性の低いものを削除
    const maxEntries = (this.store as any).get('memorySettings.maxMemoryEntries');
    if (memories.length > maxEntries) {
      memories.sort((a: MemoryEntry, b: MemoryEntry) => (a.relevanceScore * a.accessCount) - (b.relevanceScore * b.accessCount));
      memories.splice(0, memories.length - maxEntries);
    }
    
    (this.store as any).set('longTermMemory', memories);
  }
  
  // 関連する記憶を検索（TF-IDFによるセマンティック検索モード追加）
  searchMemories(query: string, limit: number = 10, useSemantic: boolean = false): MemoryEntry[] {
    const memories = (this.store as any).get('longTermMemory') as MemoryEntry[];
    const queryLower = query.toLowerCase();
    
    if (useSemantic) {
      // --- TF-IDFスコア計算 ---
      // 各メモリのテキストを単語配列に分割
      const docs = memories.map((m: MemoryEntry) => (m.title + ' ' + m.content + ' ' + m.tags.join(' ')).toLowerCase().split(/\W+/));
      const queryWords = queryLower.split(/\W+/);
      const docCount = docs.length;
      // 単語ごとのDF（文書頻度）
      const df: Record<string, number> = {};
      docs.forEach((doc: string[]) => {
        [...new Set(doc)].forEach((word: string) => {
          if (!df[word]) df[word] = 0;
          df[word]++;
        });
      });
      // 各メモリのスコア計算
      const scored = memories.map((memory: MemoryEntry, i: number) => {
        let score = 0;
        queryWords.forEach((word: string) => {
          if (!word) return;
          // TF: doc内の単語出現回数
          const tf = docs[i].filter((w: string) => w === word).length;
          // IDF: log(N/df)
          const idf = df[word] ? Math.log(docCount / df[word]) : 0;
          score += tf * idf;
        });
        // relevanceScoreやアクセス補正も加味
        score *= memory.relevanceScore;
        score *= (1 + memory.accessCount * 0.1);
        const daysSinceAccess = (Date.now() - memory.lastAccessed) / (1000 * 60 * 60 * 24);
        score *= Math.exp(-daysSinceAccess / 30);
        return { memory, score };
      });
      return scored
        .sort((a: {score: number}, b: {score: number}) => b.score - a.score)
        .slice(0, limit)
        .map((item: {memory: MemoryEntry}) => {
          item.memory.accessCount++;
          item.memory.lastAccessed = Date.now();
          return item.memory;
        });
    }
    // --- 既存の部分一致スコアリング ---
    const scored = memories.map((memory: MemoryEntry) => {
      let score = 0;
      if (memory.title.toLowerCase().includes(queryLower)) score += 3;
      if (memory.content.toLowerCase().includes(queryLower)) score += 2;
      memory.tags.forEach((tag: string) => {
        if (tag.toLowerCase().includes(queryLower)) score += 1;
      });
      score *= memory.relevanceScore;
      score *= (1 + memory.accessCount * 0.1);
      const daysSinceAccess = (Date.now() - memory.lastAccessed) / (1000 * 60 * 60 * 24);
      score *= Math.exp(-daysSinceAccess / 30);
      return { memory, score };
    });
    return scored
      .sort((a: {score: number}, b: {score: number}) => b.score - a.score)
      .slice(0, limit)
      .map((item: {memory: MemoryEntry}) => {
        item.memory.accessCount++;
        item.memory.lastAccessed = Date.now();
        return item.memory;
      });
  }
  
  // アプリ使用統計を更新
  private updateAppStats(appName: string): void {
    const stats = (this.store as any).get('appUsageStats');
    
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
    
    (this.store as any).set('appUsageStats', stats);
  }
  
  // パターン認識
  private detectPatterns(): void {
    const history = (this.store as any).get('actionHistory');
    const patterns = (this.store as any).get('behaviorPatterns');
    
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
    Object.entries(timePatterns).forEach(([timeSlot, apps]: [string, string[]]) => {
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
    
    // --- シーケンスパターン検出の追加 ---
    // 例: 3つのアプリの連続利用パターンを検出
    const sequenceLength = 3;
    const sequenceCounts: Record<string, number> = {};
    for (let i = 0; i <= recentActions.length - sequenceLength; i++) {
      const seq = recentActions.slice(i, i + sequenceLength).map(a => a.applicationName || '').join('>');
      if (seq.includes('')) continue; // 空アプリ名はスキップ
      if (!sequenceCounts[seq]) sequenceCounts[seq] = 0;
      sequenceCounts[seq]++;
    }
    Object.entries(sequenceCounts).forEach(([seq, count]: [string, number]) => {
      if (count > 1) { // 2回以上繰り返されたシーケンスのみ
        const patternId = `app-seq-${seq}`;
        const existingPattern = patterns.find(p => p.id === patternId);
        if (existingPattern) {
          existingPattern.frequency += count;
          existingPattern.lastOccurred = Date.now();
          existingPattern.confidence = Math.min(existingPattern.confidence * 1.1, 1);
        } else {
          patterns.push({
            id: patternId,
            pattern: `アプリ利用シーケンス: ${seq}`,
            frequency: count,
            lastOccurred: Date.now(),
            triggers: seq.split('>'),
            outcomes: [],
            confidence: 0.5,
          });
        }
      }
    });
    
    (this.store as any).set('behaviorPatterns', patterns);
  }
  
  // 提案を生成
  getSuggestions(context: { currentTime: Date; currentApp?: string; recentQuery?: string }): string[] {
    const suggestions: string[] = [];
    const patterns = (this.store as any).get('behaviorPatterns');
    const memories = (this.store as any).get('longTermMemory');
    const profile = (this.store as any).get('userProfile');
    
    // 時間ベースの提案
    const currentHour = context.currentTime.getHours();
    const timeSlot = `${currentHour}:00-${currentHour + 1}:00`;
    
    const timePatterns = patterns.filter(p => 
      p.triggers.includes(timeSlot) && p.confidence > 0.7
    );
    
    timePatterns.forEach((pattern: BehaviorPattern) => {
      suggestions.push(`この時間帯は通常${pattern.outcomes[0]}を使用されています`);
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
      const task = profile.frequentTasks[Math.floor(Math.random() * profile.frequentTasks.length)];
      suggestions.push(`よく行うタスク: ${task}`);
    }
    
    return suggestions.slice(0, 5);
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
    setInterval(() => {
      const retentionDays = (this.store as any).get('memorySettings.retentionDays');
      const cutoffTime = Date.now() - (retentionDays * 24 * 60 * 60 * 1000);
      
      // 古い履歴を削除
      let history = (this.store as any).get('actionHistory');
      history = history.filter((entry: UserActionEntry) => entry.timestamp > cutoffTime);
      (this.store as any).set('actionHistory', history);
      
      // 古いパターンを削除
      let patterns = (this.store as any).get('behaviorPatterns');
      patterns = patterns.filter((pattern: BehaviorPattern) => pattern.lastOccurred > cutoffTime);
      (this.store as any).set('behaviorPatterns', patterns);
    }, 24 * 60 * 60 * 1000); // 1日ごと
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
  }
}

export default new UserMemoryStore();