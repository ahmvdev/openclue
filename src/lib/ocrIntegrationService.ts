import {
  enhancedOCR,
  extractTextWithEnhancements,
  OCRResult,
} from "./enhancedOcrClient";
import { callGeminiAPI } from "./geminiClient";

// OCR結果の分析と構造化
export interface OCRAnalysis {
  extractedText: string;
  textStructure: {
    paragraphs: string[];
    lines: string[];
    keywords: string[];
    numbers: string[];
    urls: string[];
    emails: string[];
  };
  contentType: "document" | "ui" | "code" | "table" | "mixed" | "unknown";
  language: string;
  confidence: number;
  regions: {
    header: string | null;
    body: string | null;
    footer: string | null;
    sidebar: string | null;
  };
  metadata: {
    textDensity: number;
    averageLineLength: number;
    totalWords: number;
    readabilityScore: number;
  };
}

// LLMコンテキスト拡張用の情報
export interface LLMContextEnhancement {
  ocrText: string;
  structuredContent: {
    mainContent: string;
    metadata: string;
    extractedData: string;
  };
  contentInsights: {
    documentType: string;
    keyTopics: string[];
    actionableItems: string[];
    technicalTerms: string[];
  };
  contextualPrompts: {
    primary: string;
    fallback: string;
    technical: string;
  };
}

class OCRIntegrationService {
  private textAnalysisCache = new Map<string, OCRAnalysis>();
  private readonly CACHE_SIZE = 100;

  // メインOCR処理とLLMコンテキスト生成
  public async processImageForLLM(
    image: Blob | string,
    options: {
      enhanceForAccuracy?: boolean;
      includeStructuralAnalysis?: boolean;
      generateContextualPrompts?: boolean;
      targetLanguages?: string[];
    } = {},
  ): Promise<LLMContextEnhancement> {
    const {
      enhanceForAccuracy = true,
      includeStructuralAnalysis = true,
      generateContextualPrompts = true,
      targetLanguages = ["jpn", "eng"],
    } = options;

    try {
      // 高精度OCR実行
      const ocrResult = await extractTextWithEnhancements(image, {
        enhance: enhanceForAccuracy,
        languages: targetLanguages,
      });

      // OCR結果を分析
      const analysis = await this.analyzeOCRResult(ocrResult);

      // LLMコンテキスト拡張情報を生成
      const enhancement = await this.generateLLMContext(analysis, {
        includeStructuralAnalysis,
        generateContextualPrompts,
      });

      return enhancement;
    } catch (error) {
      console.error("OCR integration failed:", error);

      // フォールバック: 基本的なOCR
      return this.createFallbackContext(image);
    }
  }

  // OCR結果の詳細分析
  private async analyzeOCRResult(result: OCRResult): Promise<OCRAnalysis> {
    const cacheKey = this.generateCacheKey(result.text);

    if (this.textAnalysisCache.has(cacheKey)) {
      return this.textAnalysisCache.get(cacheKey)!;
    }

    const text = result.text;
    const lines = text.split("\n").filter((line) => line.trim());
    const paragraphs = text.split("\n\n").filter((p) => p.trim());

    // テキスト構造解析
    const textStructure = {
      paragraphs,
      lines,
      keywords: this.extractKeywords(text),
      numbers: this.extractNumbers(text),
      urls: this.extractUrls(text),
      emails: this.extractEmails(text),
    };

    // コンテンツタイプ判定
    const contentType = this.determineContentType(text, result.blocks);

    // 領域分析
    const regions = this.analyzeTextRegions(result.blocks);

    // メタデータ計算
    const words = text.split(/\s+/).filter((w) => w.length > 0);
    const metadata = {
      textDensity: result.metadata.textDensity,
      averageLineLength:
        lines.reduce((sum, line) => sum + line.length, 0) / lines.length || 0,
      totalWords: words.length,
      readabilityScore: this.calculateReadabilityScore(text),
    };

    const analysis: OCRAnalysis = {
      extractedText: text,
      textStructure,
      contentType,
      language: result.language,
      confidence: result.confidence,
      regions,
      metadata,
    };

    // キャッシュに保存
    this.cacheAnalysis(cacheKey, analysis);

    return analysis;
  }

  // LLMコンテキスト拡張情報の生成
  private async generateLLMContext(
    analysis: OCRAnalysis,
    options: {
      includeStructuralAnalysis: boolean;
      generateContextualPrompts: boolean;
    },
  ): Promise<LLMContextEnhancement> {
    const { extractedText, textStructure, contentType, regions, metadata } =
      analysis;

    // 構造化コンテンツ生成
    const structuredContent = {
      mainContent: this.extractMainContent(extractedText, regions),
      metadata: this.formatMetadata(metadata, contentType),
      extractedData: this.formatExtractedData(textStructure),
    };

    // コンテンツ洞察生成
    const contentInsights = {
      documentType: this.getDocumentTypeDescription(contentType),
      keyTopics: this.extractKeyTopics(extractedText),
      actionableItems: this.extractActionableItems(extractedText),
      technicalTerms: this.extractTechnicalTerms(extractedText),
    };

    // コンテキスト促進プロンプト生成
    const contextualPrompts = options.generateContextualPrompts
      ? this.generateContextualPrompts(analysis)
      : { primary: "", fallback: "", technical: "" };

    return {
      ocrText: extractedText,
      structuredContent,
      contentInsights,
      contextualPrompts,
    };
  }

  // キーワード抽出
  private extractKeywords(text: string): string[] {
    const words = text
      .toLowerCase()
      .replace(/[^\w\s\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 2);

    const wordCount = new Map<string, number>();
    words.forEach((word) => {
      wordCount.set(word, (wordCount.get(word) || 0) + 1);
    });

    return Array.from(wordCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);
  }

  // 数値抽出
  private extractNumbers(text: string): string[] {
    const numberRegex = /\d+(?:[.,]\d+)*[%]?/g;
    return Array.from(new Set(text.match(numberRegex) || []));
  }

  // URL抽出
  private extractUrls(text: string): string[] {
    const urlRegex = /https?:\/\/[^\s]+/g;
    return Array.from(new Set(text.match(urlRegex) || []));
  }

  // メール抽出
  private extractEmails(text: string): string[] {
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    return Array.from(new Set(text.match(emailRegex) || []));
  }

  // コンテンツタイプ判定
  private determineContentType(
    text: string,
    blocks: any[],
  ): OCRAnalysis["contentType"] {
    const lowerText = text.toLowerCase();

    // コード判定
    if (this.isCodeContent(text)) return "code";

    // テーブル判定
    if (this.isTableContent(text, blocks)) return "table";

    // UI判定
    if (this.isUIContent(text)) return "ui";

    // ドキュメント判定
    if (this.isDocumentContent(text)) return "document";

    // 混合コンテンツ
    if (text.length > 200) return "mixed";

    return "unknown";
  }

  private isCodeContent(text: string): boolean {
    const codeIndicators = [
      /function\s+\w+\s*\(/,
      /class\s+\w+/,
      /import\s+.*from/,
      /\{\s*[\w\s,]+\s*\}/,
      /\/\*.*\*\//,
      /\/\/.*$/m,
      /\w+\s*=\s*\w+/,
    ];

    return codeIndicators.some((regex) => regex.test(text));
  }

  private isTableContent(text: string, blocks: any[]): boolean {
    const lines = text.split("\n");
    const hasTabularStructure = lines.some(
      (line) =>
        (line.match(/\t/g) || []).length > 2 ||
        (line.match(/\|/g) || []).length > 2 ||
        (line.match(/\s{3,}/g) || []).length > 2,
    );

    return hasTabularStructure;
  }

  private isUIContent(text: string): boolean {
    const uiTerms = [
      "ボタン",
      "button",
      "クリック",
      "click",
      "メニュー",
      "menu",
      "ダイアログ",
      "dialog",
      "ウィンドウ",
      "window",
      "タブ",
      "tab",
      "フォーム",
      "form",
      "入力",
      "input",
      "送信",
      "submit",
    ];

    return uiTerms.some((term) => text.toLowerCase().includes(term));
  }

  private isDocumentContent(text: string): boolean {
    const sentences = text
      .split(/[.。!！?？]/)
      .filter((s) => s.trim().length > 10);
    return sentences.length > 3 && text.length > 100;
  }

  // テキスト領域分析
  private analyzeTextRegions(blocks: any[]): OCRAnalysis["regions"] {
    // 簡易的な領域分析（実際の実装では座標ベースで行う）
    const allText = blocks.map((b) => b.text).join("\n");
    const lines = allText.split("\n").filter((l) => l.trim());

    return {
      header: lines.length > 0 ? lines[0] : null,
      body: lines.length > 2 ? lines.slice(1, -1).join("\n") : allText,
      footer: lines.length > 1 ? lines[lines.length - 1] : null,
      sidebar: null,
    };
  }

  // 読みやすさスコア計算
  private calculateReadabilityScore(text: string): number {
    const sentences = text
      .split(/[.。!！?？]/)
      .filter((s) => s.trim().length > 0);
    const words = text.split(/\s+/).filter((w) => w.length > 0);

    if (sentences.length === 0 || words.length === 0) return 0;

    const avgWordsPerSentence = words.length / sentences.length;
    const avgCharsPerWord =
      words.reduce((sum, word) => sum + word.length, 0) / words.length;

    // 簡易的な読みやすさスコア（0-100）
    return Math.max(
      0,
      Math.min(100, 100 - avgWordsPerSentence * 2 - avgCharsPerWord),
    );
  }

  // メインコンテンツ抽出
  private extractMainContent(
    text: string,
    regions: OCRAnalysis["regions"],
  ): string {
    return regions.body || text.slice(0, 1000);
  }

  // メタデータフォーマット
  private formatMetadata(
    metadata: OCRAnalysis["metadata"],
    contentType: string,
  ): string {
    return [
      `コンテンツタイプ: ${contentType}`,
      `総単語数: ${metadata.totalWords}`,
      `平均行長: ${Math.round(metadata.averageLineLength)}文字`,
      `読みやすさ: ${Math.round(metadata.readabilityScore)}/100`,
    ].join(", ");
  }

  // 抽出データフォーマット
  private formatExtractedData(structure: OCRAnalysis["textStructure"]): string {
    const parts = [];

    if (structure.keywords.length > 0) {
      parts.push(`キーワード: ${structure.keywords.slice(0, 5).join(", ")}`);
    }

    if (structure.numbers.length > 0) {
      parts.push(`数値: ${structure.numbers.slice(0, 3).join(", ")}`);
    }

    if (structure.urls.length > 0) {
      parts.push(`URL: ${structure.urls.length}個`);
    }

    return parts.join(" | ");
  }

  // ドキュメントタイプ説明
  private getDocumentTypeDescription(
    contentType: OCRAnalysis["contentType"],
  ): string {
    const descriptions = {
      document: "テキスト文書",
      ui: "ユーザーインターフェース",
      code: "プログラムコード",
      table: "テーブル・表形式データ",
      mixed: "混合コンテンツ",
      unknown: "不明",
    };

    return descriptions[contentType];
  }

  // キートピック抽出
  private extractKeyTopics(text: string): string[] {
    // 簡易的なトピック抽出（実際にはより高度なNLP手法を使用）
    const topics = [];

    if (text.includes("エラー") || text.includes("error"))
      topics.push("エラー対応");
    if (text.includes("設定") || text.includes("config"))
      topics.push("設定管理");
    if (text.includes("データ") || text.includes("data"))
      topics.push("データ処理");
    if (text.includes("API") || text.includes("api")) topics.push("API連携");
    if (text.includes("セキュリティ") || text.includes("security"))
      topics.push("セキュリティ");

    return topics;
  }

  // アクション可能項目抽出
  private extractActionableItems(text: string): string[] {
    const actionRegex = /(?:^|\n)\s*[-*•]\s*(.+?)(?=\n|$)/g;
    const actions = [];
    let match;

    while ((match = actionRegex.exec(text)) !== null) {
      actions.push(match[1].trim());
    }

    return actions.slice(0, 5);
  }

  // 技術用語抽出
  private extractTechnicalTerms(text: string): string[] {
    const techTerms = [
      "API",
      "JSON",
      "XML",
      "HTTP",
      "HTTPS",
      "SQL",
      "NoSQL",
      "JavaScript",
      "Python",
      "Java",
      "C++",
      "React",
      "Vue",
      "データベース",
      "サーバー",
      "クライアント",
      "フレームワーク",
    ];

    return techTerms.filter((term) =>
      text.toLowerCase().includes(term.toLowerCase()),
    );
  }

  // コンテキスト促進プロンプト生成
  private generateContextualPrompts(
    analysis: OCRAnalysis,
  ): LLMContextEnhancement["contextualPrompts"] {
    const { contentType, extractedText } = analysis;

    const basePrompt = `以下のOCRテキストの内容について`;

    const prompts = {
      primary: `${basePrompt}、主な内容を要約し、重要なポイントを教えてください。\n\n[OCRテキスト]\n${extractedText.slice(0, 500)}`,

      fallback: `${basePrompt}、何について書かれているか簡潔に説明してください。`,

      technical:
        contentType === "code"
          ? `以下のコードについて、機能と改善点を分析してください。\n\n[コード]\n${extractedText.slice(0, 800)}`
          : `${basePrompt}、技術的な観点から分析してください。`,
    };

    return prompts;
  }

  // フォールバックコンテキスト
  private async createFallbackContext(
    image: Blob | string,
  ): Promise<LLMContextEnhancement> {
    try {
      // 基本OCR（既存のocrClient.ts）を使用
      const { extractOcrText } = await import("./ocrClient");
      const text = await extractOcrText(image);

      return {
        ocrText: text,
        structuredContent: {
          mainContent: text,
          metadata: "フォールバック処理",
          extractedData: "",
        },
        contentInsights: {
          documentType: "不明",
          keyTopics: [],
          actionableItems: [],
          technicalTerms: [],
        },
        contextualPrompts: {
          primary: `以下のテキストについて説明してください：\n${text}`,
          fallback: "OCR処理に失敗しました。画像の内容を教えてください。",
          technical: "技術的な分析ができませんでした。",
        },
      };
    } catch {
      return {
        ocrText: "",
        structuredContent: { mainContent: "", metadata: "", extractedData: "" },
        contentInsights: {
          documentType: "",
          keyTopics: [],
          actionableItems: [],
          technicalTerms: [],
        },
        contextualPrompts: { primary: "", fallback: "", technical: "" },
      };
    }
  }

  // ユーティリティメソッド
  private generateCacheKey(text: string): string {
    return btoa(text.slice(0, 100)).slice(0, 16);
  }

  private cacheAnalysis(key: string, analysis: OCRAnalysis): void {
    if (this.textAnalysisCache.size >= this.CACHE_SIZE) {
      const firstKey = this.textAnalysisCache.keys().next().value;
      this.textAnalysisCache.delete(firstKey);
    }
    this.textAnalysisCache.set(key, analysis);
  }

  // リソースクリーンアップ
  public async cleanup(): Promise<void> {
    this.textAnalysisCache.clear();
    await enhancedOCR.cleanup();
  }
}

// シングルトンインスタンス
export const ocrIntegrationService = new OCRIntegrationService();

// 便利関数
export async function enhanceLLMContextWithOCR(
  image: Blob | string,
  basePrompt: string,
  options: {
    includeOCRAnalysis?: boolean;
    useEnhancedPrompts?: boolean;
    maxOCRTextLength?: number;
  } = {},
): Promise<string> {
  const {
    includeOCRAnalysis = true,
    useEnhancedPrompts = true,
    maxOCRTextLength = 1000,
  } = options;

  try {
    const enhancement = await ocrIntegrationService.processImageForLLM(image, {
      enhanceForAccuracy: true,
      includeStructuralAnalysis: includeOCRAnalysis,
      generateContextualPrompts: useEnhancedPrompts,
    });

    const ocrText = enhancement.ocrText.slice(0, maxOCRTextLength);

    if (!ocrText.trim()) {
      return basePrompt;
    }

    const enhancedPrompt = [
      basePrompt,
      "",
      "[画面OCRテキスト]",
      ocrText,
      "",
      includeOCRAnalysis
        ? `[コンテンツ分析] ${enhancement.structuredContent.metadata}`
        : "",
      enhancement.structuredContent.extractedData
        ? `[抽出データ] ${enhancement.structuredContent.extractedData}`
        : "",
    ]
      .filter(Boolean)
      .join("\n");

    return enhancedPrompt;
  } catch (error) {
    console.error("Failed to enhance LLM context with OCR:", error);
    return basePrompt;
  }
}
