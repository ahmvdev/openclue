import Tesseract from "tesseract.js";

// OCR結果の詳細情報
export interface OCRResult {
  text: string;
  confidence: number;
  blocks: OCRBlock[];
  rawData: any;
  processingTime: number;
  language: string;
  metadata: {
    imageSize: { width: number; height: number };
    textDensity: number;
    averageConfidence: number;
    detectedLanguages: string[];
  };
}

export interface OCRBlock {
  text: string;
  confidence: number;
  bbox: { x: number; y: number; width: number; height: number };
  type: "paragraph" | "line" | "word" | "symbol";
}

// 画像前処理オプション
interface PreprocessOptions {
  enhanceContrast: boolean;
  denoise: boolean;
  deskew: boolean;
  scaleUp: boolean;
  threshold: boolean;
  invertColors: boolean;
}

class EnhancedOCRClient {
  private workers: Map<string, Tesseract.Worker> = new Map();
  private initialized = false;
  private supportedLanguages = ["jpn", "eng", "chi_sim", "kor"];

  constructor() {
    this.initializeWorkers();
  }

  private async initializeWorkers(): Promise<void> {
    if (this.initialized) return;

    try {
      // 主要言語のワーカーを並列初期化
      const initPromises = this.supportedLanguages.map(async (lang) => {
        const worker = await Tesseract.createWorker(lang, 1, {
          logger: () => {}, // ログを無効化
          errorHandler: (err) => console.warn(`OCR Worker ${lang} error:`, err),
        });

        // パフォーマンス最適化設定
        await worker.setParameters({
          tessedit_pageseg_mode: Tesseract.PSM.AUTO,
          preserve_interword_spaces: "1",
          tessedit_char_whitelist: "",
          tessedit_char_blacklist: "",
        });

        this.workers.set(lang, worker);
      });

      await Promise.all(initPromises);
      this.initialized = true;
      console.log("Enhanced OCR workers initialized");
    } catch (error) {
      console.error("Failed to initialize OCR workers:", error);
    }
  }

  // 画像を前処理してOCR精度を向上
  private async preprocessImage(
    image: Blob | string,
    options: Partial<PreprocessOptions> = {},
  ): Promise<{ processedImage: string; metadata: any }> {
    const defaultOptions: PreprocessOptions = {
      enhanceContrast: true,
      denoise: true,
      deskew: false,
      scaleUp: true,
      threshold: true,
      invertColors: false,
    };

    const opts = { ...defaultOptions, ...options };

    try {
      // Canvas を使用して画像処理
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d")!;

      // 画像をロード
      const img = new Image();
      const imageData =
        typeof image === "string" ? image : URL.createObjectURL(image);

      return new Promise((resolve, reject) => {
        img.onload = () => {
          const originalWidth = img.width;
          const originalHeight = img.height;

          // スケールアップで小さなテキストを読みやすくする
          const scale =
            opts.scaleUp && Math.min(originalWidth, originalHeight) < 500
              ? 2
              : 1;
          canvas.width = originalWidth * scale;
          canvas.height = originalHeight * scale;

          // 高品質スケーリング設定
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";

          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          // 画像データを取得
          const imageDataObj = ctx.getImageData(
            0,
            0,
            canvas.width,
            canvas.height,
          );
          const data = imageDataObj.data;

          // コントラスト強化
          if (opts.enhanceContrast) {
            this.enhanceContrast(data);
          }

          // ノイズ除去
          if (opts.denoise) {
            this.denoise(data, canvas.width, canvas.height);
          }

          // 二値化
          if (opts.threshold) {
            this.applyThreshold(data);
          }

          // 色反転（暗い背景に明るいテキストの場合）
          if (opts.invertColors) {
            this.invertColors(data);
          }

          // 処理済み画像をCanvasに戻す
          ctx.putImageData(imageDataObj, 0, 0);

          const processedImage = canvas.toDataURL("image/png", 1.0);
          const metadata = {
            originalSize: { width: originalWidth, height: originalHeight },
            processedSize: { width: canvas.width, height: canvas.height },
            scale,
            options: opts,
          };

          // リソースクリーンアップ
          if (typeof image !== "string") {
            URL.revokeObjectURL(imageData);
          }

          resolve({ processedImage, metadata });
        };

        img.onerror = reject;
        img.src = imageData;
      });
    } catch (error) {
      console.error("Image preprocessing failed:", error);
      // フォールバック: 元画像を返す
      const fallbackImage =
        typeof image === "string" ? image : URL.createObjectURL(image);
      return { processedImage: fallbackImage, metadata: {} };
    }
  }

  // コントラスト強化
  private enhanceContrast(data: Uint8ClampedArray): void {
    const factor = 1.5; // コントラスト係数
    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.min(255, Math.max(0, (data[i] - 128) * factor + 128)); // R
      data[i + 1] = Math.min(
        255,
        Math.max(0, (data[i + 1] - 128) * factor + 128),
      ); // G
      data[i + 2] = Math.min(
        255,
        Math.max(0, (data[i + 2] - 128) * factor + 128),
      ); // B
    }
  }

  // ノイズ除去（シンプルなメディアンフィルタ）
  private denoise(
    data: Uint8ClampedArray,
    width: number,
    height: number,
  ): void {
    const processed = new Uint8ClampedArray(data);

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4;

        // 3x3 ネイバーフッドの中央値を計算
        const neighbors: number[] = [];
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nIdx = ((y + dy) * width + (x + dx)) * 4;
            const gray = (data[nIdx] + data[nIdx + 1] + data[nIdx + 2]) / 3;
            neighbors.push(gray);
          }
        }

        neighbors.sort((a, b) => a - b);
        const median = neighbors[4]; // 中央値

        processed[idx] = median; // R
        processed[idx + 1] = median; // G
        processed[idx + 2] = median; // B
      }
    }

    data.set(processed);
  }

  // 適応的閾値処理
  private applyThreshold(data: Uint8ClampedArray): void {
    // グレースケール変換と閾値計算
    const grayValues: number[] = [];
    for (let i = 0; i < data.length; i += 4) {
      const gray = (data[i] + data[i + 1] + data[i + 2]) / 3;
      grayValues.push(gray);
    }

    // Otsu の閾値法
    const threshold = this.calculateOtsuThreshold(grayValues);

    // 二値化適用
    for (let i = 0; i < data.length; i += 4) {
      const gray = (data[i] + data[i + 1] + data[i + 2]) / 3;
      const binary = gray > threshold ? 255 : 0;
      data[i] = binary; // R
      data[i + 1] = binary; // G
      data[i + 2] = binary; // B
    }
  }

  // Otsu の閾値計算
  private calculateOtsuThreshold(grayValues: number[]): number {
    const histogram = new Array(256).fill(0);
    grayValues.forEach((val) => histogram[Math.floor(val)]++);

    const total = grayValues.length;
    let sum = 0;
    for (let i = 0; i < 256; i++) sum += i * histogram[i];

    let sumB = 0;
    let wB = 0;
    let maximum = 0;
    let level = 0;

    for (let i = 0; i < 256; i++) {
      wB += histogram[i];
      if (wB === 0) continue;

      const wF = total - wB;
      if (wF === 0) break;

      sumB += i * histogram[i];
      const mB = sumB / wB;
      const mF = (sum - sumB) / wF;
      const between = wB * wF * Math.pow(mB - mF, 2);

      if (between > maximum) {
        level = i;
        maximum = between;
      }
    }

    return level;
  }

  // 色反転
  private invertColors(data: Uint8ClampedArray): void {
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 255 - data[i]; // R
      data[i + 1] = 255 - data[i + 1]; // G
      data[i + 2] = 255 - data[i + 2]; // B
    }
  }

  // 言語検出
  private async detectLanguage(image: string): Promise<string[]> {
    try {
      // 複数言語で並列テスト
      const testPromises = this.supportedLanguages.map(async (lang) => {
        const worker = this.workers.get(lang);
        if (!worker) return { lang, confidence: 0 };

        try {
          const result = await worker.recognize(image, lang, {
            logger: () => {},
          });
          return { lang, confidence: result.data.confidence };
        } catch {
          return { lang, confidence: 0 };
        }
      });

      const results = await Promise.all(testPromises);
      return results
        .filter((r) => r.confidence > 50)
        .sort((a, b) => b.confidence - a.confidence)
        .map((r) => r.lang);
    } catch {
      return ["jpn", "eng"]; // デフォルト
    }
  }

  // メイン OCR 処理
  public async extractText(
    image: Blob | string,
    options: {
      languages?: string[];
      preprocessing?: Partial<PreprocessOptions>;
      includeMetadata?: boolean;
    } = {},
  ): Promise<OCRResult> {
    const startTime = Date.now();

    await this.initializeWorkers();

    try {
      // 前処理
      const { processedImage, metadata: preprocessMetadata } =
        await this.preprocessImage(image, options.preprocessing);

      // 言語検出
      const detectedLanguages =
        options.languages || (await this.detectLanguage(processedImage));
      const primaryLang = detectedLanguages[0] || "jpn";
      const langCombination = detectedLanguages.slice(0, 2).join("+");

      // OCR実行
      const worker = this.workers.get(primaryLang) || this.workers.get("jpn")!;
      const result = await worker.recognize(processedImage, langCombination, {
        logger: () => {},
      });

      // 結果を構造化
      const blocks: OCRBlock[] = [];

      // パラグラフレベルの解析
      if (result.data.paragraphs) {
        result.data.paragraphs.forEach((para: any) => {
          blocks.push({
            text: para.text,
            confidence: para.confidence,
            bbox: para.bbox,
            type: "paragraph",
          });

          // 行レベル
          if (para.lines) {
            para.lines.forEach((line: any) => {
              blocks.push({
                text: line.text,
                confidence: line.confidence,
                bbox: line.bbox,
                type: "line",
              });
            });
          }
        });
      }

      const processingTime = Date.now() - startTime;
      const text = result.data.text.trim();

      // メタデータ計算
      const averageConfidence =
        blocks.reduce((sum, block) => sum + block.confidence, 0) /
          blocks.length || 0;
      const textDensity =
        text.length /
        (preprocessMetadata.processedSize?.width *
          preprocessMetadata.processedSize?.height || 1);

      return {
        text,
        confidence: result.data.confidence,
        blocks,
        rawData: options.includeMetadata ? result.data : null,
        processingTime,
        language: langCombination,
        metadata: {
          imageSize: preprocessMetadata.processedSize || {
            width: 0,
            height: 0,
          },
          textDensity,
          averageConfidence,
          detectedLanguages,
        },
      };
    } catch (error) {
      console.error("Enhanced OCR failed:", error);

      // フォールバック: シンプルな OCR
      return {
        text: "",
        confidence: 0,
        blocks: [],
        rawData: null,
        processingTime: Date.now() - startTime,
        language: "unknown",
        metadata: {
          imageSize: { width: 0, height: 0 },
          textDensity: 0,
          averageConfidence: 0,
          detectedLanguages: [],
        },
      };
    }
  }

  // 特定領域のOCR
  public async extractTextFromRegion(
    image: Blob | string,
    region: { x: number; y: number; width: number; height: number },
    options: Parameters<typeof this.extractText>[1] = {},
  ): Promise<OCRResult> {
    try {
      // 領域を切り出し
      const croppedImage = await this.cropImage(image, region);
      return await this.extractText(croppedImage, options);
    } catch (error) {
      console.error("Region OCR failed:", error);
      return await this.extractText(image, options);
    }
  }

  // 画像切り出し
  private async cropImage(
    image: Blob | string,
    region: { x: number; y: number; width: number; height: number },
  ): Promise<string> {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;
    const img = new Image();

    const imageUrl =
      typeof image === "string" ? image : URL.createObjectURL(image);

    return new Promise((resolve, reject) => {
      img.onload = () => {
        canvas.width = region.width;
        canvas.height = region.height;

        ctx.drawImage(
          img,
          region.x,
          region.y,
          region.width,
          region.height,
          0,
          0,
          region.width,
          region.height,
        );

        const croppedImageUrl = canvas.toDataURL("image/png");

        if (typeof image !== "string") {
          URL.revokeObjectURL(imageUrl);
        }

        resolve(croppedImageUrl);
      };

      img.onerror = reject;
      img.src = imageUrl;
    });
  }

  // リソースクリーンアップ
  public async cleanup(): Promise<void> {
    for (const [lang, worker] of this.workers) {
      try {
        await worker.terminate();
      } catch (error) {
        console.warn(`Failed to terminate OCR worker for ${lang}:`, error);
      }
    }
    this.workers.clear();
    this.initialized = false;
  }
}

// シングルトンインスタンス
export const enhancedOCR = new EnhancedOCRClient();

// 便利関数
export async function extractTextWithEnhancements(
  image: Blob | string,
  options: {
    enhance?: boolean;
    region?: { x: number; y: number; width: number; height: number };
    languages?: string[];
  } = {},
): Promise<OCRResult> {
  const ocrOptions = {
    languages: options.languages,
    preprocessing: options.enhance
      ? {
          enhanceContrast: true,
          denoise: true,
          threshold: true,
          scaleUp: true,
        }
      : {},
    includeMetadata: true,
  };

  if (options.region) {
    return enhancedOCR.extractTextFromRegion(image, options.region, ocrOptions);
  }

  return enhancedOCR.extractText(image, ocrOptions);
}
