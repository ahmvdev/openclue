import Tesseract from 'tesseract.js';

let worker: Tesseract.Worker | null = null;

async function initializeOCR() {
  if (!worker) {
    worker = await Tesseract.createWorker('jpn+eng');
  }
  return worker;
}

// ダミー: 画像前処理（実装は後で）
async function preprocessImage(image: Blob | string): Promise<Blob | string> {
  return image;
}

// ダミー: Gemini Vision APIフォールバック（実装は後で）
async function extractTextWithGemini(image: Blob | string): Promise<string> {
  return '';
}

/**
 * 画像（BlobまたはBase64）から日本語OCRテキストを抽出
 * @param image 画像のBlobまたはBase64文字列
 * @returns 認識テキスト（失敗時はGemini Vision APIで再試行）
 */
export async function extractOcrText(image: Blob | string): Promise<string> {
  try {
    if (!worker) {
      await initializeOCR();
    }
    let imageData: string | Blob = image;
    if (typeof image !== 'string') {
      imageData = await preprocessImage(image);
      imageData = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(imageData as Blob);
      });
    }
    const { data: { text } } = await worker!.recognize(
      imageData,
      'jpn+eng',
      { logger: () => {} }
    );
    return text.trim();
  } catch (error) {
    console.error('OCR失敗:', error);
    // フォールバック: Gemini Vision APIを使用
    return await extractTextWithGemini(image);
  }
} 