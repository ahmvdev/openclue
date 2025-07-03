import userMemoryStore from "./userMemoryStore";
import { memoryOrganizationService } from "./memoryOrganizationService";

// ユーザーの長期目標と行動分析
export interface UserGoal {
  id: string;
  title: string;
  description: string;
  category:
    | "career"
    | "learning"
    | "health"
    | "productivity"
    | "personal"
    | "creative";
  priority: "high" | "medium" | "low";
  targetDate?: number;
  progress: number; // 0-1
  milestones: GoalMilestone[];
  createdAt: number;
  updatedAt: number;
  status: "active" | "completed" | "paused" | "cancelled";
  relatedMemories: string[];
  successMetrics: string[];
}

export interface GoalMilestone {
  id: string;
  title: string;
  description: string;
  targetDate?: number;
  completed: boolean;
  completedAt?: number;
}

export interface BehaviorPattern {
  id: string;
  pattern: string;
  frequency: number;
  lastOccurred: number;
  triggers: string[];
  outcomes: string[];
  confidence: number;
  predictiveValue: number;
  timeOfDay?: number;
  dayOfWeek?: number;
  contextualFactors: string[];
}

export interface LearningProfile {
  preferredLearningStyle: "visual" | "auditory" | "kinesthetic" | "reading";
  comprehensionSpeed: "fast" | "medium" | "slow";
  retentionRate: number;
  strongSubjects: string[];
  improvementAreas: string[];
  learningHabits: {
    optimalTimeSlots: number[];
    averageSessionDuration: number;
    breakFrequency: number;
    reviewSchedule: string[];
  };
  cognitiveLoad: {
    current: number;
    capacity: number;
    fatigueSigns: string[];
  };
}

export interface AdvancedSuggestion {
  id: string;
  type:
    | "goal_progress"
    | "learning_optimization"
    | "productivity_boost"
    | "health_reminder"
    | "creative_inspiration"
    | "pattern_insight";
  priority: "urgent" | "high" | "medium" | "low";
  title: string;
  description: string;
  rationale: string;
  actionItems: string[];
  estimatedImpact: number; // 0-1
  confidence: number; // 0-1
  expiresAt?: number;
  relatedGoals: string[];
  relatedPatterns: string[];
  personalizedContext: {
    userStyle: string;
    historicalData: string;
    predictiveInsight: string;
  };
  createdAt: number;
}

export interface ContextualEnvironment {
  timeOfDay: number;
  dayOfWeek: number;
  currentApp?: string;
  recentActivity: string[];
  cognitiveState:
    | "focused"
    | "distracted"
    | "creative"
    | "analytical"
    | "tired";
  workload: "light" | "medium" | "heavy";
  mood?: "positive" | "neutral" | "negative";
  environmentalFactors: string[];
}

class AdvancedSuggestionService {
  private goals: Map<string, UserGoal> = new Map();
  private behaviorPatterns: Map<string, BehaviorPattern> = new Map();
  private learningProfile: LearningProfile | null = null;
  private suggestionHistory: AdvancedSuggestion[] = [];

  // メイン提案生成
  public async generateAdvancedSuggestions(
    context: ContextualEnvironment,
    limit: number = 5,
  ): Promise<AdvancedSuggestion[]> {
    await this.updateUserProfiles();

    const suggestions: AdvancedSuggestion[] = [];

    // 1. 目標進捗関連の提案
    const goalSuggestions = await this.generateGoalProgressSuggestions(context);
    suggestions.push(...goalSuggestions);

    // 2. 学習最適化提案
    const learningSuggestions =
      await this.generateLearningOptimizationSuggestions(context);
    suggestions.push(...learningSuggestions);

    // 3. 生産性向上提案
    const productivitySuggestions =
      await this.generateProductivitySuggestions(context);
    suggestions.push(...productivitySuggestions);

    // 4. パターンベース提案
    const patternSuggestions =
      await this.generatePatternBasedSuggestions(context);
    suggestions.push(...patternSuggestions);

    // 5. 健康・ウェルビーイング提案
    const healthSuggestions = await this.generateHealthSuggestions(context);
    suggestions.push(...healthSuggestions);

    // 6. 創造性促進提案
    const creativeSuggestions = await this.generateCreativeSuggestions(context);
    suggestions.push(...creativeSuggestions);

    // 提案をスコアリングして上位を返す
    return this.rankAndFilterSuggestions(suggestions, context, limit);
  }

  // 目標進捗提案
  private async generateGoalProgressSuggestions(
    context: ContextualEnvironment,
  ): Promise<AdvancedSuggestion[]> {
    const suggestions: AdvancedSuggestion[] = [];
    const activeGoals = Array.from(this.goals.values()).filter(
      (g) => g.status === "active",
    );

    for (const goal of activeGoals) {
      // 期限が近い目標
      if (
        goal.targetDate &&
        goal.targetDate - Date.now() < 7 * 24 * 60 * 60 * 1000
      ) {
        suggestions.push({
          id: this.generateId(),
          type: "goal_progress",
          priority: "high",
          title: `目標期限間近: ${goal.title}`,
          description: `「${goal.title}」の期限まで1週間を切りました。進捗を確認し、必��なアクションを取りましょう。`,
          rationale: `現在の進捗: ${Math.round(goal.progress * 100)}%。期限までに達成するためのスプリントが必要です。`,
          actionItems: this.generateGoalActionItems(goal, context),
          estimatedImpact: 0.9,
          confidence: 0.8,
          expiresAt: goal.targetDate,
          relatedGoals: [goal.id],
          relatedPatterns: [],
          personalizedContext: await this.generatePersonalizedContext(
            goal,
            context,
          ),
          createdAt: Date.now(),
        });
      }

      // 停滞している目標
      const daysSinceUpdate =
        (Date.now() - goal.updatedAt) / (24 * 60 * 60 * 1000);
      if (daysSinceUpdate > 7 && goal.progress < 0.8) {
        suggestions.push({
          id: this.generateId(),
          type: "goal_progress",
          priority: "medium",
          title: `目標の見直し: ${goal.title}`,
          description: `「${goal.title}」の進捗が停滞しています。アプローチを見直してみませんか？`,
          rationale: `${Math.round(daysSinceUpdate)}日間更新がありません。新しい戦略が必要かもしれません。`,
          actionItems: [
            "現在の障害を特定する",
            "目標を小さなステップに分解する",
            "新しいアプローチを試す",
            "進捗を記録する習慣を作る",
          ],
          estimatedImpact: 0.7,
          confidence: 0.6,
          relatedGoals: [goal.id],
          relatedPatterns: [],
          personalizedContext: await this.generatePersonalizedContext(
            goal,
            context,
          ),
          createdAt: Date.now(),
        });
      }
    }

    return suggestions;
  }

  // 学習最適化提案
  private async generateLearningOptimizationSuggestions(
    context: ContextualEnvironment,
  ): Promise<AdvancedSuggestion[]> {
    const suggestions: AdvancedSuggestion[] = [];

    if (!this.learningProfile) return suggestions;

    const profile = this.learningProfile;
    const currentHour = context.timeOfDay;

    // 最適学習時間の提案
    if (profile.learningHabits.optimalTimeSlots.includes(currentHour)) {
      suggestions.push({
        id: this.generateId(),
        type: "learning_optimization",
        priority: "high",
        title: "学習の黄金時間です",
        description: `現在は、あなたの集中力が最も高い時間帯です。重要な学習タスクに取り組むことをお勧めします。`,
        rationale: `過去のデータから、${currentHour}時台はあなたの学習効率が最も高いことが分かっています。`,
        actionItems: [
          "重要な概念の学習を開始する",
          "難しい問題に挑戦する",
          "新しいスキルの習得を始める",
          "復習セッションを実行する",
        ],
        estimatedImpact: 0.8,
        confidence: 0.9,
        relatedGoals: [],
        relatedPatterns: [],
        personalizedContext: {
          userStyle: `学習スタイル: ${profile.preferredLearningStyle}`,
          historicalData: `平均集中時間: ${profile.learningHabits.averageSessionDuration}分`,
          predictiveInsight:
            "今から始めれば、通常の1.5倍の効率で学習できる可能性があります",
        },
        createdAt: Date.now(),
      });
    }

    // 認知負荷管理
    if (profile.cognitiveLoad.current / profile.cognitiveLoad.capacity > 0.8) {
      suggestions.push({
        id: this.generateId(),
        type: "learning_optimization",
        priority: "urgent",
        title: "認知負荷の軽減が必要",
        description: `現在の認知負荷が高すぎます。効果的な学習のために休憩を取ることをお勧めします。`,
        rationale: `認知負荷: ${Math.round((profile.cognitiveLoad.current / profile.cognitiveLoad.capacity) * 100)}%。疲労サインが検出されています。`,
        actionItems: [
          "5-10分の休憩を取る",
          "軽い運動をする",
          "深呼吸エクササイズ",
          "水分補給をする",
        ],
        estimatedImpact: 0.9,
        confidence: 0.8,
        relatedGoals: [],
        relatedPatterns: [],
        personalizedContext: {
          userStyle: "疲労回復重視",
          historicalData: `疲労サイン: ${profile.cognitiveLoad.fatigueSigns.join(", ")}`,
          predictiveInsight:
            "適切な休憩により、次のセッションで20%の効率向上が期待できます",
        },
        createdAt: Date.now(),
      });
    }

    return suggestions;
  }

  // 生産性向上提案
  private async generateProductivitySuggestions(
    context: ContextualEnvironment,
  ): Promise<AdvancedSuggestion[]> {
    const suggestions: AdvancedSuggestion[] = [];

    // 時間帯別最適化
    const productivePatterns = Array.from(this.behaviorPatterns.values())
      .filter((p) =>
        p.outcomes.some((o) => o.includes("完了") || o.includes("成功")),
      )
      .filter((p) => p.timeOfDay === context.timeOfDay);

    if (productivePatterns.length > 0) {
      const bestPattern = productivePatterns.sort(
        (a, b) => b.predictiveValue - a.predictiveValue,
      )[0];

      suggestions.push({
        id: this.generateId(),
        type: "productivity_boost",
        priority: "high",
        title: "高生産性パターンの活用",
        description: `過去のデータから、この時間帯に「${bestPattern.pattern}」を行うと高い成果が得られることが分かっています。`,
        rationale: `成功率: ${Math.round(bestPattern.predictiveValue * 100)}%、頻度: ${bestPattern.frequency}回`,
        actionItems: [
          bestPattern.pattern + "を実行する",
          "集中環境を整える",
          "他の作業を一時停止する",
          "成果を記録する",
        ],
        estimatedImpact: bestPattern.predictiveValue,
        confidence: bestPattern.confidence,
        relatedGoals: [],
        relatedPatterns: [bestPattern.id],
        personalizedContext: {
          userStyle: "成功パターン活用",
          historicalData: `過去${bestPattern.frequency}回の実行で高い成果`,
          predictiveInsight: `${Math.round(bestPattern.predictiveValue * 100)}%の確率で期待以上の成果が得られます`,
        },
        createdAt: Date.now(),
      });
    }

    // 作業負荷調整
    if (context.workload === "heavy") {
      suggestions.push({
        id: this.generateId(),
        type: "productivity_boost",
        priority: "high",
        title: "作業負荷の最適化",
        description: `現在の作業負荷が重すぎます。効率的なタスク管理で負荷を軽減しましょう。`,
        rationale: "高負荷状態では品質が低下し、燃え尽きのリスクが高まります。",
        actionItems: [
          "タスクを優先度順に並べ替える",
          "緊急でないタスクを延期する",
          "作業を小さなチャンクに分割する",
          "適切な休憩を挟む",
        ],
        estimatedImpact: 0.8,
        confidence: 0.7,
        relatedGoals: [],
        relatedPatterns: [],
        personalizedContext: {
          userStyle: "負荷分散型",
          historicalData: "過去の高負荷時の成果データ",
          predictiveInsight:
            "適切な負荷調整により、品質を維持しながら効率を30%向上できます",
        },
        createdAt: Date.now(),
      });
    }

    return suggestions;
  }

  // パターンベース提案
  private async generatePatternBasedSuggestions(
    context: ContextualEnvironment,
  ): Promise<AdvancedSuggestion[]> {
    const suggestions: AdvancedSuggestion[] = [];

    // 時間的パターンの活用
    const timePatterns = Array.from(this.behaviorPatterns.values()).filter(
      (p) => p.timeOfDay === context.timeOfDay && p.confidence > 0.7,
    );

    for (const pattern of timePatterns.slice(0, 2)) {
      suggestions.push({
        id: this.generateId(),
        type: "pattern_insight",
        priority: "medium",
        title: `パターン活用の機会: ${pattern.pattern}`,
        description: `この時間帯に「${pattern.pattern}」を行う傾向があります。今日も実行してみませんか？`,
        rationale: `過去${pattern.frequency}回、この時間帯に実行されており、${pattern.outcomes.join(", ")}という結果が得られています。`,
        actionItems: [
          pattern.pattern + "を開始する",
          "環境を整える",
          "必要なリソースを準備する",
          "結果を記録する",
        ],
        estimatedImpact: pattern.predictiveValue * 0.8,
        confidence: pattern.confidence,
        relatedGoals: [],
        relatedPatterns: [pattern.id],
        personalizedContext: {
          userStyle: "パターン重視",
          historicalData: `成功率: ${Math.round(pattern.predictiveValue * 100)}%`,
          predictiveInsight: `通常の行動パターンに従うことで、ストレスを軽減しながら成果を得られます`,
        },
        createdAt: Date.now(),
      });
    }

    return suggestions;
  }

  // 健康・ウェルビーイング提案
  private async generateHealthSuggestions(
    context: ContextualEnvironment,
  ): Promise<AdvancedSuggestion[]> {
    const suggestions: AdvancedSuggestion[] = [];

    // 長時間作業の検出
    const recentActivity = context.recentActivity;
    const prolongedWork = recentActivity.filter(
      (activity) =>
        activity.includes("作業") ||
        activity.includes("プログラミング") ||
        activity.includes("文書"),
    ).length;

    if (prolongedWork > 3) {
      suggestions.push({
        id: this.generateId(),
        type: "health_reminder",
        priority: "medium",
        title: "健康的な休憩のお時間です",
        description: `長時間の作業が続いています。体と心の健康のために休憩を取りましょう。`,
        rationale: `${prolongedWork}時間の連続作業が検出されました。定期的な休憩は生産性向上に必須です。`,
        actionItems: [
          "立ち上がって軽く歩く",
          "目を休めるエクササイズ",
          "首と肩のストレッチ",
          "水分補給をする",
        ],
        estimatedImpact: 0.6,
        confidence: 0.9,
        relatedGoals: [],
        relatedPatterns: [],
        personalizedContext: {
          userStyle: "健康重視",
          historicalData: `平均作業時間: ${prolongedWork}時間`,
          predictiveInsight:
            "適切な休憩により、次の作業セッションで25%の効率向上が期待できます",
        },
        createdAt: Date.now(),
      });
    }

    return suggestions;
  }

  // 創造性促進提案
  private async generateCreativeSuggestions(
    context: ContextualEnvironment,
  ): Promise<AdvancedSuggestion[]> {
    const suggestions: AdvancedSuggestion[] = [];

    if (context.cognitiveState === "creative") {
      suggestions.push({
        id: this.generateId(),
        type: "creative_inspiration",
        priority: "medium",
        title: "創造的な時間を活用しましょう",
        description: `現在、創造的な思考に適した状態です。新しいアイデアや解決策を探索してみませんか？`,
        rationale:
          "創造的な思考状態は貴重な機会です。この状態を活用して革新的な成果を生み出しましょう。",
        actionItems: [
          "ブレインストーミングセッション",
          "新しい視点からの問題分析",
          "アイデアのスケッチ・マッピング",
          "異分野からのインスピレーション収集",
        ],
        estimatedImpact: 0.7,
        confidence: 0.6,
        relatedGoals: [],
        relatedPatterns: [],
        personalizedContext: {
          userStyle: "創造性重視",
          historicalData: "過去の創造的セッションの成果",
          predictiveInsight:
            "創造的状態を活用することで、通常の3倍のアイデア生成が可能です",
        },
        createdAt: Date.now(),
      });
    }

    return suggestions;
  }

  // 提案のランキングとフィルタリング
  private rankAndFilterSuggestions(
    suggestions: AdvancedSuggestion[],
    context: ContextualEnvironment,
    limit: number,
  ): AdvancedSuggestion[] {
    // スコア計算
    const scoredSuggestions = suggestions.map((suggestion) => {
      let score = 0;

      // 基本スコア
      score += suggestion.estimatedImpact * 0.4;
      score += suggestion.confidence * 0.3;

      // 優先度ボーナス
      const priorityBonus = {
        urgent: 0.3,
        high: 0.2,
        medium: 0.1,
        low: 0.0,
      };
      score += priorityBonus[suggestion.priority];

      // コンテキスト適合性
      score += this.calculateContextRelevance(suggestion, context) * 0.1;

      // 新鮮さ（既存の提案と重複しないか）
      const freshness = this.calculateFreshness(suggestion);
      score += freshness * 0.1;

      return { suggestion, score };
    });

    // ソートして上位を返す
    return scoredSuggestions
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((item) => item.suggestion);
  }

  // コンテキスト関連性計算
  private calculateContextRelevance(
    suggestion: AdvancedSuggestion,
    context: ContextualEnvironment,
  ): number {
    let relevance = 0;

    // 時間帯の適合性
    if (
      suggestion.type === "learning_optimization" &&
      this.learningProfile?.learningHabits.optimalTimeSlots.includes(
        context.timeOfDay,
      )
    ) {
      relevance += 0.3;
    }

    // 認知状態の適合性
    if (
      suggestion.type === "creative_inspiration" &&
      context.cognitiveState === "creative"
    ) {
      relevance += 0.4;
    }

    if (
      suggestion.type === "productivity_boost" &&
      context.cognitiveState === "focused"
    ) {
      relevance += 0.3;
    }

    // 作業負荷の適合性
    if (suggestion.type === "health_reminder" && context.workload === "heavy") {
      relevance += 0.2;
    }

    return Math.min(relevance, 1);
  }

  // 新鮮さ計算
  private calculateFreshness(suggestion: AdvancedSuggestion): number {
    const recentSimilar = this.suggestionHistory.filter(
      (s) =>
        s.type === suggestion.type &&
        Date.now() - s.createdAt < 24 * 60 * 60 * 1000,
    ).length;

    return Math.max(0, 1 - recentSimilar * 0.2);
  }

  // ユーザープロファイル更新
  private async updateUserProfiles(): Promise<void> {
    await this.updateGoals();
    await this.updateBehaviorPatterns();
    await this.updateLearningProfile();
  }

  // 目標更新
  private async updateGoals(): Promise<void> {
    // 記憶から目標関連情報を抽出して更新
    const goalMemories = await userMemoryStore.searchMemories(
      "目標 OR goal OR 計画",
      50,
    );

    for (const memory of goalMemories) {
      const extractedGoals = this.extractGoalsFromMemory(memory);
      for (const goal of extractedGoals) {
        this.goals.set(goal.id, goal);
      }
    }
  }

  // 行動パターン更新
  private async updateBehaviorPatterns(): Promise<void> {
    const patterns = userMemoryStore.getBehaviorPatterns?.() || [];

    for (const pattern of patterns) {
      const enhancedPattern = await this.enhanceBehaviorPattern(pattern);
      this.behaviorPatterns.set(pattern.id, enhancedPattern);
    }
  }

  // 学習プロファイル更新
  private async updateLearningProfile(): Promise<void> {
    const learningMemories = await userMemoryStore.searchMemories(
      "学習 OR 勉強 OR learning",
      30,
    );
    this.learningProfile = this.analyzeLearningProfile(learningMemories);
  }

  // 記憶から目標抽出
  private extractGoalsFromMemory(memory: any): UserGoal[] {
    // 自然言語処理で目標を抽出（簡易版）
    const goals: UserGoal[] = [];
    const content = memory.content.toLowerCase();

    if (
      content.includes("目標") ||
      content.includes("goal") ||
      content.includes("したい")
    ) {
      goals.push({
        id: this.generateId(),
        title: memory.title,
        description: memory.content.substring(0, 200),
        category: this.inferGoalCategory(memory),
        priority: "medium",
        progress: 0,
        milestones: [],
        createdAt: memory.createdAt || Date.now(),
        updatedAt: Date.now(),
        status: "active",
        relatedMemories: [memory.id],
        successMetrics: [],
      });
    }

    return goals;
  }

  // 目標カテゴリ推定
  private inferGoalCategory(memory: any): UserGoal["category"] {
    const content = memory.content.toLowerCase();

    if (
      content.includes("仕事") ||
      content.includes("キャリア") ||
      content.includes("career")
    )
      return "career";
    if (
      content.includes("学習") ||
      content.includes("勉強") ||
      content.includes("learning")
    )
      return "learning";
    if (
      content.includes("健康") ||
      content.includes("運動") ||
      content.includes("health")
    )
      return "health";
    if (
      content.includes("効率") ||
      content.includes("生産性") ||
      content.includes("productivity")
    )
      return "productivity";
    if (
      content.includes("創作") ||
      content.includes("創造") ||
      content.includes("creative")
    )
      return "creative";

    return "personal";
  }

  // 行動パターン強化
  private async enhanceBehaviorPattern(pattern: any): Promise<BehaviorPattern> {
    return {
      ...pattern,
      predictiveValue: this.calculatePredictiveValue(pattern),
      contextualFactors: this.extractContextualFactors(pattern),
    };
  }

  // 予測値計算
  private calculatePredictiveValue(pattern: any): number {
    const successRate =
      pattern.outcomes.filter(
        (o: string) =>
          o.includes("成功") || o.includes("完了") || o.includes("達成"),
      ).length / pattern.outcomes.length;

    const frequencyScore = Math.min(pattern.frequency / 10, 1);
    const confidenceScore = pattern.confidence;

    return successRate * 0.5 + frequencyScore * 0.3 + confidenceScore * 0.2;
  }

  // コンテキスト要因抽出
  private extractContextualFactors(pattern: any): string[] {
    const factors: string[] = [];

    if (pattern.timeOfDay !== undefined) {
      factors.push(`時間帯: ${pattern.timeOfDay}時`);
    }

    if (pattern.triggers.length > 0) {
      factors.push(`トリガー: ${pattern.triggers.join(", ")}`);
    }

    return factors;
  }

  // 学習プロファイル分析
  private analyzeLearningProfile(memories: any[]): LearningProfile {
    // 学習記憶から傾向を分析
    const learningTimes = memories
      .map((m) => new Date(m.createdAt).getHours())
      .filter((hour) => hour !== undefined);

    const optimalTimeSlots = this.findOptimalTimeSlots(learningTimes);

    return {
      preferredLearningStyle: "visual", // デフォルト値
      comprehensionSpeed: "medium",
      retentionRate: 0.7,
      strongSubjects: this.extractStrongSubjects(memories),
      improvementAreas: this.extractImprovementAreas(memories),
      learningHabits: {
        optimalTimeSlots,
        averageSessionDuration: 45,
        breakFrequency: 15,
        reviewSchedule: ["daily", "weekly"],
      },
      cognitiveLoad: {
        current: 0.5,
        capacity: 1.0,
        fatigueSigns: ["集中力低下", "眼精疲労", "イライラ"],
      },
    };
  }

  // 最適時間帯検出
  private findOptimalTimeSlots(learningTimes: number[]): number[] {
    const hourCounts = new Map<number, number>();

    learningTimes.forEach((hour) => {
      hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
    });

    return Array.from(hourCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([hour]) => hour);
  }

  // 得意分野抽出
  private extractStrongSubjects(memories: any[]): string[] {
    const subjects = new Map<string, number>();

    memories.forEach((memory) => {
      memory.tags.forEach((tag: string) => {
        subjects.set(tag, (subjects.get(tag) || 0) + 1);
      });
    });

    return Array.from(subjects.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([subject]) => subject);
  }

  // 改善領域抽出
  private extractImprovementAreas(memories: any[]): string[] {
    // 低頻度や低評価のタグから改善領域を推定
    return ["時間管理", "集中力向上"]; // 簡易版
  }

  // 目標アクション生成
  private generateGoalActionItems(
    goal: UserGoal,
    context: ContextualEnvironment,
  ): string[] {
    const actions = [
      "現在の進捗を確認する",
      "次のマイルストーンを設定する",
      "障害を特定して対策を立てる",
      "必要なリソースを準備する",
    ];

    // コンテキストに応じてカスタマイズ
    if (context.cognitiveState === "focused") {
      actions.unshift("重要なタスクを今すぐ開始する");
    }

    return actions;
  }

  // パーソナライズドコンテキスト生成
  private async generatePersonalizedContext(
    goal: UserGoal,
    context: ContextualEnvironment,
  ): Promise<AdvancedSuggestion["personalizedContext"]> {
    return {
      userStyle: `目標志向型・${goal.category}重視`,
      historicalData: `進捗率: ${Math.round(goal.progress * 100)}%、関連記憶: ${goal.relatedMemories.length}件`,
      predictiveInsight:
        "適切なアクションにより、今月中に20%の進捗向上が期待できます",
    };
  }

  // 提案履歴に追加
  public addToHistory(suggestion: AdvancedSuggestion): void {
    this.suggestionHistory.push(suggestion);

    // 履歴の上限管理
    if (this.suggestionHistory.length > 100) {
      this.suggestionHistory = this.suggestionHistory.slice(-100);
    }
  }

  // ユーティリティ
  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }
}

export const advancedSuggestionService = new AdvancedSuggestionService();
