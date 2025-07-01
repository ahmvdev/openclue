import Tesseract from 'tesseract.js';

/**
 * 画像（BlobまたはBase64）から日本語OCRテキストを抽出
 * @param image 画像のBlobまたはBase64文字列
 * @returns 認識テキスト（失敗時は空文字）
 */
export async function extractOcrText(image: Blob | string): Promise<string> {
  try {
    let imageData: string;
    if (typeof image === 'string') {
      imageData = image;
    } else {
      imageData = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(image);
      });
    }
    const { data: { text } } = await Tesseract.recognize(
      imageData,
      'jpn',
      { logger: () => {} }
    );
    return text.trim();
  } catch (e) {
    console.error('OCR失敗:', e);
    return '';
  }
} 