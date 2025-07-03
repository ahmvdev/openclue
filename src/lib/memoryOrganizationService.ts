import userMemoryStore from "./userMemoryStore";

// 記憶統合・整理のための高度なサービス
export interface MemoryCluster {
  id: string;
  theme: string;
  memories: string[]; // memory IDs
  confidence: number;
  createdAt: number;
  updatedAt: number;
  keywords: string[];
  summary: string;
}

export interface DuplicateMemoryPair {
  memory1: string;
  memory2: string;
  similarity: number;
  suggestedAction: "merge" | "keep_both" | "archive_older";
  mergedContent?: string;
}

export interface MemoryOrganizationInsights {
  duplicates: DuplicateMemoryPair[];
  clusters: MemoryCluster[];
  archiveCandidates: string[];
  orphanedMemories: string[];
  tagHierarchy: TagHierarchy;
  qualityScore: number;
}

export interface TagHierarchy {
  [parentTag: string]: {
    children: string[];
    frequency: number;
    relatedConcepts: string[];
  };
}

class MemoryOrganizationService {
  private readonly SIMILARITY_THRESHOLD = 0.75;
  private readonly CLUSTER_MIN_SIZE = 2;
  private readonly ARCHIVE_AGE_DAYS = 90;

  // メインの記憶整理実行
  public async organizeMemories(): Promise<MemoryOrganizationInsights> {
    const memories = await this.getAllMemories();

    // 1. 重複検出
    const duplicates = await this.findDuplicateMemories(memories);

    // 2. クラスタリング
    const clusters = await this.clusterMemories(memories);

    // 3. アーカイブ候補検出
    const archiveCandidates = this.identifyArchiveCandidates(memories);

    // 4. 孤立記憶検出
    const orphanedMemories = this.findOrphanedMemories(memories, clusters);

    // 5. タグ階層構築
    const tagHierarchy = await this.buildTagHierarchy(memories);

    // 6. 品質スコア計算
    const qualityScore = this.calculateOrganizationQuality(
      memories,
      duplicates,
      clusters,
    );

    return {
      duplicates,
      clusters,
      archiveCandidates,
      orphanedMemories,
      tagHierarchy,
      qualityScore,
    };
  }

  // 自動整理実行（安全な操作のみ）
  public async performAutoOrganization(): Promise<{
    merged: number;
    archived: number;
    clustered: number;
    retagged: number;
  }> {
    const insights = await this.organizeMemories();
    let merged = 0,
      archived = 0,
      clustered = 0,
      retagged = 0;

    // 1. 高信頼度の重複を自動マージ
    for (const duplicate of insights.duplicates) {
      if (duplicate.similarity > 0.9 && duplicate.suggestedAction === "merge") {
        await this.mergeDuplicateMemories(duplicate);
        merged++;
      }
    }

    // 2. 古い低価値記憶をアーカイブ
    for (const memoryId of insights.archiveCandidates.slice(0, 10)) {
      // 安全のため最大10件
      await this.archiveMemory(memoryId);
      archived++;
    }

    // 3. 強力なクラスターを作成
    for (const cluster of insights.clusters) {
      if (cluster.confidence > 0.8) {
        await this.createMemoryCluster(cluster);
        clustered++;
      }
    }

    // 4. タグの自動整理
    const retagCount = await this.optimizeTags(insights.tagHierarchy);
    retagged = retagCount;

    return { merged, archived, clustered, retagged };
  }

  // 重複記憶検出
  private async findDuplicateMemories(
    memories: any[],
  ): Promise<DuplicateMemoryPair[]> {
    const duplicates: DuplicateMemoryPair[] = [];

    for (let i = 0; i < memories.length; i++) {
      for (let j = i + 1; j < memories.length; j++) {
        const similarity = this.calculateTextSimilarity(
          memories[i].content,
          memories[j].content,
        );

        if (similarity > this.SIMILARITY_THRESHOLD) {
          const suggestedAction = this.determineMergeAction(
            memories[i],
            memories[j],
            similarity,
          );
          const mergedContent =
            suggestedAction === "merge"
              ? this.generateMergedContent(memories[i], memories[j])
              : undefined;

          duplicates.push({
            memory1: memories[i].id,
            memory2: memories[j].id,
            similarity,
            suggestedAction,
            mergedContent,
          });
        }
      }
    }

    return duplicates.sort((a, b) => b.similarity - a.similarity);
  }

  // 記憶クラスタリング
  private async clusterMemories(memories: any[]): Promise<MemoryCluster[]> {
    const clusters: MemoryCluster[] = [];
    const processed = new Set<string>();

    for (const memory of memories) {
      if (processed.has(memory.id)) continue;

      const relatedMemories = await this.findRelatedMemories(memory, memories);

      if (relatedMemories.length >= this.CLUSTER_MIN_SIZE) {
        const cluster = await this.createClusterFromMemories([
          memory,
          ...relatedMemories,
        ]);
        clusters.push(cluster);

        // 処理済みとしてマーク
        [memory, ...relatedMemories].forEach((m) => processed.add(m.id));
      }
    }

    return clusters;
  }

  // 関連記憶検索
  private async findRelatedMemories(
    baseMemory: any,
    allMemories: any[],
  ): Promise<any[]> {
    const related: any[] = [];

    for (const memory of allMemories) {
      if (memory.id === baseMemory.id) continue;

      const relatedness = this.calculateRelatedness(baseMemory, memory);

      if (relatedness > 0.6) {
        related.push(memory);
      }
    }

    return related
      .sort(
        (a, b) =>
          this.calculateRelatedness(baseMemory, b) -
          this.calculateRelatedness(baseMemory, a),
      )
      .slice(0, 8); // 最大8件の関連記憶
  }

  // 関連度計算
  private calculateRelatedness(memory1: any, memory2: any): number {
    let score = 0;

    // タグの重複
    const commonTags = memory1.tags.filter((tag: string) =>
      memory2.tags.some((t: string) => t.toLowerCase() === tag.toLowerCase()),
    );
    score += commonTags.length * 0.3;

    // コンテンツの類似性
    const contentSimilarity = this.calculateTextSimilarity(
      memory1.content,
      memory2.content,
    );
    score += contentSimilarity * 0.4;

    // タイトルの類似性
    const titleSimilarity = this.calculateTextSimilarity(
      memory1.title,
      memory2.title,
    );
    score += titleSimilarity * 0.2;

    // 時間的近接性
    const timeDiff = Math.abs(memory1.createdAt - memory2.createdAt);
    const timeScore = Math.exp(-timeDiff / (7 * 24 * 60 * 60 * 1000)); // 1週間で半減
    score += timeScore * 0.1;

    return Math.min(score, 1);
  }

  // テキスト類似性計算（改良版）
  private calculateTextSimilarity(text1: string, text2: string): number {
    const words1 = this.tokenize(text1.toLowerCase());
    const words2 = this.tokenize(text2.toLowerCase());

    if (words1.length === 0 || words2.length === 0) return 0;

    // Jaccard類似度
    const set1 = new Set(words1);
    const set2 = new Set(words2);
    const intersection = new Set([...set1].filter((x) => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    const jaccard = intersection.size / union.size;

    // コサイン類似度（TF-IDF風）
    const allWords = [...union];
    const vector1 = allWords.map(
      (word) => words1.filter((w) => w === word).length / words1.length,
    );
    const vector2 = allWords.map(
      (word) => words2.filter((w) => w === word).length / words2.length,
    );

    const dotProduct = vector1.reduce(
      (sum, val, i) => sum + val * vector2[i],
      0,
    );
    const magnitude1 = Math.sqrt(
      vector1.reduce((sum, val) => sum + val * val, 0),
    );
    const magnitude2 = Math.sqrt(
      vector2.reduce((sum, val) => sum + val * val, 0),
    );

    const cosine =
      magnitude1 && magnitude2 ? dotProduct / (magnitude1 * magnitude2) : 0;

    // レーベンシュタイン距離（正規化）
    const levenshtein = this.calculateLevenshteinDistance(text1, text2);
    const maxLength = Math.max(text1.length, text2.length);
    const normalizedLevenshtein =
      maxLength > 0 ? 1 - levenshtein / maxLength : 1;

    // 重み付き平均
    return jaccard * 0.4 + cosine * 0.4 + normalizedLevenshtein * 0.2;
  }

  // トークン化
  private tokenize(text: string): string[] {
    return text
      .replace(/[^\w\s\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 1);
  }

  // レーベンシュタイン距離
  private calculateLevenshteinDistance(str1: string, str2: string): number {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1,
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  // アーカイブ候補の特定
  private identifyArchiveCandidates(memories: any[]): string[] {
    const now = Date.now();
    const archiveThreshold = now - this.ARCHIVE_AGE_DAYS * 24 * 60 * 60 * 1000;

    return memories
      .filter((memory) => {
        // 古い記憶で低アクセス
        const isOld = memory.createdAt < archiveThreshold;
        const lowAccess = memory.accessCount < 2;
        const lowRelevance = memory.relevanceScore < 0.3;

        return isOld && (lowAccess || lowRelevance);
      })
      .sort((a, b) => a.accessCount - b.accessCount) // アクセス数昇順
      .map((memory) => memory.id);
  }

  // 孤立記憶の検出
  private findOrphanedMemories(
    memories: any[],
    clusters: MemoryCluster[],
  ): string[] {
    const clusteredIds = new Set(
      clusters.flatMap((cluster) => cluster.memories),
    );

    return memories
      .filter((memory) => {
        const isOrphaned = !clusteredIds.has(memory.id);
        const hasMinimalTags = memory.tags.length < 2;
        const hasMinimalConnections = memory.associations.length < 1;

        return isOrphaned && (hasMinimalTags || hasMinimalConnections);
      })
      .map((memory) => memory.id);
  }

  // タグ階層構築
  private async buildTagHierarchy(memories: any[]): Promise<TagHierarchy> {
    const tagCooccurrence = new Map<string, Map<string, number>>();
    const tagFrequency = new Map<string, number>();

    // タグの共起分析
    for (const memory of memories) {
      for (const tag of memory.tags) {
        const normalizedTag = tag.toLowerCase();
        tagFrequency.set(
          normalizedTag,
          (tagFrequency.get(normalizedTag) || 0) + 1,
        );

        if (!tagCooccurrence.has(normalizedTag)) {
          tagCooccurrence.set(normalizedTag, new Map());
        }

        for (const otherTag of memory.tags) {
          if (tag !== otherTag) {
            const normalizedOtherTag = otherTag.toLowerCase();
            const cooccurMap = tagCooccurrence.get(normalizedTag)!;
            cooccurMap.set(
              normalizedOtherTag,
              (cooccurMap.get(normalizedOtherTag) || 0) + 1,
            );
          }
        }
      }
    }

    // 階層構築
    const hierarchy: TagHierarchy = {};

    for (const [tag, frequency] of tagFrequency) {
      if (frequency >= 3) {
        // 頻度の高いタグのみ
        const cooccurMap = tagCooccurrence.get(tag) || new Map();
        const relatedTags = Array.from(cooccurMap.entries())
          .filter(([_, count]) => count >= 2)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5)
          .map(([relatedTag]) => relatedTag);

        hierarchy[tag] = {
          children: this.identifyChildTags(tag, relatedTags, tagFrequency),
          frequency,
          relatedConcepts: relatedTags,
        };
      }
    }

    return hierarchy;
  }

  // 子タグの特定
  private identifyChildTags(
    parentTag: string,
    relatedTags: string[],
    tagFrequency: Map<string, number>,
  ): string[] {
    return relatedTags
      .filter((tag) => {
        const parentFreq = tagFrequency.get(parentTag) || 0;
        const childFreq = tagFrequency.get(tag) || 0;

        // 親タグより頻度が低く、含有関係がある
        return (
          childFreq < parentFreq &&
          (tag.includes(parentTag) ||
            parentTag.includes(tag) ||
            this.isSemanticChild(parentTag, tag))
        );
      })
      .slice(0, 3);
  }

  // 意味的な親子関係判定
  private isSemanticChild(parent: string, child: string): boolean {
    const parentChildPairs = [
      ["プログラミング", "javascript"],
      ["プログラミング", "python"],
      ["開発", "フロントエンド"],
      ["開発", "バックエンド"],
      ["設計", "ui"],
      ["設計", "database"],
      ["問題解決", "デバッグ"],
      ["学習", "勉強"],
    ];

    return parentChildPairs.some(
      ([p, c]) => parent.includes(p) && child.includes(c),
    );
  }

  // 統合アクション決定
  private determineMergeAction(
    memory1: any,
    memory2: any,
    similarity: number,
  ): DuplicateMemoryPair["suggestedAction"] {
    // 完全重複
    if (similarity > 0.95) return "merge";

    // 一方が他方を完全に含む
    if (
      memory1.content.includes(memory2.content) ||
      memory2.content.includes(memory1.content)
    ) {
      return "merge";
    }

    // 時系列的に新しい方が詳細
    const timeDiff = memory2.createdAt - memory1.createdAt;
    if (timeDiff > 0 && memory2.content.length > memory1.content.length * 1.5) {
      return "archive_older";
    }

    // 高い類似性だが異なる観点
    if (similarity > 0.8) return "keep_both";

    return "merge";
  }

  // 統合コンテンツ生成
  private generateMergedContent(memory1: any, memory2: any): string {
    const sections = [];

    // タイトル統合
    const mergedTitle =
      memory1.title.length > memory2.title.length
        ? memory1.title
        : memory2.title;

    // コンテンツ統合
    sections.push(`# ${mergedTitle}`);
    sections.push("");
    sections.push("## 統合された情報");

    // より詳細な方をメインに
    const mainContent =
      memory1.content.length > memory2.content.length ? memory1 : memory2;
    const subContent = mainContent === memory1 ? memory2 : memory1;

    sections.push(mainContent.content);

    if (
      subContent.content &&
      !mainContent.content.includes(subContent.content)
    ) {
      sections.push("");
      sections.push("## 追加情報");
      sections.push(subContent.content);
    }

    // メタデータ
    sections.push("");
    sections.push("---");
    sections.push(`統合日時: ${new Date().toLocaleString()}`);
    sections.push(`元記憶: ${memory1.title}, ${memory2.title}`);

    return sections.join("\n");
  }

  // クラスター作成
  private async createClusterFromMemories(
    memories: any[],
  ): Promise<MemoryCluster> {
    const keywords = this.extractCommonKeywords(memories);
    const theme = this.generateClusterTheme(memories, keywords);
    const summary = this.generateClusterSummary(memories);

    return {
      id: this.generateId(),
      theme,
      memories: memories.map((m) => m.id),
      confidence: this.calculateClusterConfidence(memories),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      keywords,
      summary,
    };
  }

  // 共通キーワード抽出
  private extractCommonKeywords(memories: any[]): string[] {
    const wordCount = new Map<string, number>();

    for (const memory of memories) {
      const words = this.tokenize(
        (memory.title + " " + memory.content).toLowerCase(),
      );
      for (const word of words) {
        if (word.length > 2) {
          wordCount.set(word, (wordCount.get(word) || 0) + 1);
        }
      }
    }

    return Array.from(wordCount.entries())
      .filter(([_, count]) => count >= Math.max(2, memories.length * 0.5))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([word]) => word);
  }

  // クラスターテーマ生成
  private generateClusterTheme(memories: any[], keywords: string[]): string {
    const types = memories.map((m) => m.type);
    const dominantType = this.getMostFrequent(types);

    if (keywords.length > 0) {
      return `${keywords.slice(0, 2).join("・")}関連の${dominantType}`;
    }

    return `${dominantType}クラスター`;
  }

  // クラスター要約生成
  private generateClusterSummary(memories: any[]): string {
    const totalMemories = memories.length;
    const types = memories.map((m) => m.type);
    const typeDistribution = types.reduce(
      (acc, type) => {
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const avgRelevance =
      memories.reduce((sum, m) => sum + m.relevanceScore, 0) / totalMemories;
    const totalAccess = memories.reduce((sum, m) => sum + m.accessCount, 0);

    return `${totalMemories}個の記憶を含むクラスター。平均関連度: ${(avgRelevance * 100).toFixed(1)}%、総アクセス数: ${totalAccess}回。`;
  }

  // クラスター信頼度計算
  private calculateClusterConfidence(memories: any[]): number {
    if (memories.length < 2) return 0;

    let totalSimilarity = 0;
    let pairCount = 0;

    for (let i = 0; i < memories.length; i++) {
      for (let j = i + 1; j < memories.length; j++) {
        totalSimilarity += this.calculateRelatedness(memories[i], memories[j]);
        pairCount++;
      }
    }

    return pairCount > 0 ? totalSimilarity / pairCount : 0;
  }

  // 品質スコア計算
  private calculateOrganizationQuality(
    memories: any[],
    duplicates: DuplicateMemoryPair[],
    clusters: MemoryCluster[],
  ): number {
    const totalMemories = memories.length;
    if (totalMemories === 0) return 1;

    // 重複率（低いほど良い）
    const duplicateRate = duplicates.length / totalMemories;
    const duplicateScore = Math.max(0, 1 - duplicateRate * 2);

    // クラスター化率（高いほど良い）
    const clusteredMemories = clusters.reduce(
      (sum, cluster) => sum + cluster.memories.length,
      0,
    );
    const clusterScore = clusteredMemories / totalMemories;

    // タグ付け率（高いほど良い）
    const taggedMemories = memories.filter((m) => m.tags.length > 0).length;
    const tagScore = taggedMemories / totalMemories;

    // 関連付け率（高いほど良い）
    const linkedMemories = memories.filter(
      (m) => m.associations.length > 0,
    ).length;
    const linkScore = linkedMemories / totalMemories;

    return (
      duplicateScore * 0.3 +
      clusterScore * 0.3 +
      tagScore * 0.2 +
      linkScore * 0.2
    );
  }

  // ユーティリティメソッド
  private async getAllMemories(): Promise<any[]> {
    return userMemoryStore.searchMemories("", 10000);
  }

  private async mergeDuplicateMemories(
    duplicate: DuplicateMemoryPair,
  ): Promise<void> {
    if (!duplicate.mergedContent) return;

    // 新しい統合記憶を作成
    // 実装は userMemoryStore の機能拡張が必要
  }

  private async archiveMemory(memoryId: string): Promise<void> {
    // アーカイブ機能の実装
    // 実装は userMemoryStore の機能拡張が必要
  }

  private async createMemoryCluster(cluster: MemoryCluster): Promise<void> {
    // クラスター保存機能の実装
    // 実装は userMemoryStore の機能拡張が必要
  }

  private async optimizeTags(hierarchy: TagHierarchy): Promise<number> {
    let optimized = 0;

    // タグの正規化と統一
    for (const [parentTag, info] of Object.entries(hierarchy)) {
      if (info.children.length > 0) {
        // 子タグを親タグに統一するロジック
        optimized += info.children.length;
      }
    }

    return optimized;
  }

  private getMostFrequent<T>(arr: T[]): T {
    const counts = new Map<T, number>();
    arr.forEach((item) => counts.set(item, (counts.get(item) || 0) + 1));

    let maxCount = 0;
    let mostFrequent = arr[0];

    counts.forEach((count, item) => {
      if (count > maxCount) {
        maxCount = count;
        mostFrequent = item;
      }
    });

    return mostFrequent;
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }
}

export const memoryOrganizationService = new MemoryOrganizationService();
