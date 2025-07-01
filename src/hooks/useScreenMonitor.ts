import { useState, useEffect, useRef, useCallback } from 'react';
import { callGeminiAPI } from '../lib/geminiClient';
import { extractOcrText } from '../lib/ocrClient';

interface ScreenMonitorConfig {
  interval: number; // 監視間隔（ミリ秒）
  enabled: boolean; // 監視の有効/無効
  changeThreshold: number; // 変化検知の閾値（0-1）
}

// 型定義を拡張して、API Keyを受け取れるようにする
interface ScreenMonitorProps extends ScreenMonitorConfig {
  geminiApiKey?: string;
  onStructuredAdvice?: (advice: { todo?: string[]; summary?: string; raw?: string }) => void;
}

interface ScreenChange {
  timestamp: number;
  screenshot: Blob;
  changePercentage: number;
  context: string;
}

export const useScreenMonitor = (props: ScreenMonitorProps) => {
  const { geminiApiKey, ...config } = props;
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [lastScreenshot, setLastScreenshot] = useState<string | null>(null);
  const [screenHistory, setScreenHistory] = useState<ScreenChange[]>([]);
  const [currentAdvice, setCurrentAdvice] = useState<string>('');
  const [actionHistory, setActionHistory] = useState<{ timestamp: number; app: string; title: string }[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // 画像の差分を計算する関数
  const calculateImageDifference = useCallback(async (img1: string, img2: string): Promise<number> => {
    return new Promise((resolve) => {
      if (!canvasRef.current) {
        canvasRef.current = document.createElement('canvas');
      }
      
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(0);
        return;
      }

      const image1 = new Image();
      const image2 = new Image();
      let loadedCount = 0;

      const onLoad = () => {
        loadedCount++;
        if (loadedCount === 2) {
          // 画像サイズを小さくして処理を高速化
          const width = 200;
          const height = 150;
          canvas.width = width;
          canvas.height = height;

          // 最初の画像を描画
          ctx.drawImage(image1, 0, 0, width, height);
          const data1 = ctx.getImageData(0, 0, width, height);

          // 2番目の画像を描画
          ctx.drawImage(image2, 0, 0, width, height);
          const data2 = ctx.getImageData(0, 0, width, height);

          // ピクセル差分を計算
          let diffPixels = 0;
          const totalPixels = width * height;

          for (let i = 0; i < data1.data.length; i += 4) {
            const r1 = data1.data[i];
            const g1 = data1.data[i + 1];
            const b1 = data1.data[i + 2];
            const r2 = data2.data[i];
            const g2 = data2.data[i + 1];
            const b2 = data2.data[i + 2];

            const diff = Math.abs(r1 - r2) + Math.abs(g1 - g2) + Math.abs(b1 - b2);
            if (diff > 30) { // 閾値を調整可能
              diffPixels++;
            }
          }

          const changePercentage = diffPixels / totalPixels;
          resolve(changePercentage);
        }
      };

      image1.onload = onLoad;
      image2.onload = onLoad;
      image1.src = img1;
      image2.src = img2;
    });
  }, []);

  // スクリーンショットを取得してBase64に変換
  const takeScreenshotAsBase64 = useCallback(async (): Promise<string> => {
    if (!window.electron?.takeScreenshot) {
      throw new Error('Screenshot functionality not available');
    }
    
    const blob = await window.electron.takeScreenshot();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  }, []);

  // アクティブウィンドウ履歴の取得
  useEffect(() => {
    if (!isMonitoring) return;
    const interval = setInterval(async () => {
      const win = await window.electron.getActiveWindow?.();
      if (win && win.app && win.title) {
        setActionHistory(prev => [
          ...prev.slice(-9),
          { timestamp: Date.now(), app: win.app, title: win.title }
        ]);
      }
    }, Math.max(2000, config.interval)); // 2秒ごと、または監視間隔以上
    return () => clearInterval(interval);
  }, [isMonitoring, config.interval]);

  // 文脈に基づいたアドバイスを生成
  const generateContextualAdvice = useCallback(async (
    screenshot: Blob,
    context: string,
    history: ScreenChange[]
  ): Promise<string> => {
    if (!geminiApiKey) {
      return 'Gemini API Keyが設定されていません。設定画面からAPI Keyを設定してください。';
    }

    const base64 = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(screenshot);
    });

    const historyContext = history.slice(-3).map((change, index) => 
      `${index + 1}. ${new Date(change.timestamp).toLocaleTimeString()}: ${change.context}`
    );
    const actionContext = actionHistory.slice(-3).map((item, idx) =>
      `A${idx + 1}. ${new Date(item.timestamp).toLocaleTimeString()}: [${item.app}] ${item.title}`
    );
    const mergedHistory = [...historyContext, ...actionContext];

    const prompt = `画面を継続的に監視しています。以下の文脈で、現在の画面に対して簡潔で実用的なアドバイスを日本語で提供してください：\n\n最近の画面変化の履歴・状況・操作履歴を考慮してください。\n\n現在の状況：${context}\n\nアドバイスは以下の観点から提供してください：\n- 生産性の向上\n- 作業効率の改善\n- 注意すべき点\n- 次に取るべきアクション\n\n回答は100文字以内で簡潔にお願いします。`;

    try {
      const result = await callGeminiAPI({
        apiKey: geminiApiKey,
        model: 'gemini-2.5-flash',
        prompt,
        imageBase64: base64,
        history: mergedHistory,
        outputFormat: 'text',
      });
      return typeof result === 'string' ? result : JSON.stringify(result);
    } catch (error: any) {
      console.error('Error generating advice:', error);
      return 'アドバイス生成中にエラーが発生しました';
    }
  }, [geminiApiKey, actionHistory]);

  // 構造化アドバイス（TODOリスト・要点）を生成
  const generateStructuredAdvice = useCallback(async (
    screenshot: Blob,
    context: string,
    history: ScreenChange[]
  ): Promise<{ todo?: string[]; summary?: string; raw?: string }> => {
    if (!geminiApiKey) {
      return { raw: 'Gemini API Keyが設定されていません。設定画面からAPI Keyを設定してください。' };
    }
    const base64 = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(screenshot);
    });
    const historyContext = history.slice(-3).map((change, index) => 
      `${index + 1}. ${new Date(change.timestamp).toLocaleTimeString()}: ${change.context}`
    );
    const actionContext = actionHistory.slice(-3).map((item, idx) =>
      `A${idx + 1}. ${new Date(item.timestamp).toLocaleTimeString()}: [${item.app}] ${item.title}`
    );
    const mergedHistory = [...historyContext, ...actionContext];

    const prompt = `画面を継続的に監視しています。以下の文脈で、現在の画面に対してTODOリストと要点(summary)を日本語でJSON形式で返してください。\n\n最近の画面変化の履歴・状況・操作履歴を考慮してください。\n\n現在の状況：${context}\n\n出力例：\n{\n  \"todo\": [\"やるべきこと1\", \"やるべきこと2\"],\n  \"summary\": \"要点のまとめ\"\n}`;

    try {
      const result = await callGeminiAPI({
        apiKey: geminiApiKey,
        model: 'gemini-2.5-flash',
        prompt,
        imageBase64: base64,
        history: mergedHistory,
        outputFormat: 'json',
      });
      if (typeof result === 'object') {
        return { ...result, raw: JSON.stringify(result) };
      } else {
        return { raw: result };
      }
    } catch (error: any) {
      console.error('Error generating structured advice:', error);
      return { raw: '構造化アドバイス生成中にエラーが発生しました' };
    }
  }, [geminiApiKey, actionHistory]);

  // 画面を監視する関数
  const monitorScreen = useCallback(async () => {
    try {
      const currentScreenshot = await takeScreenshotAsBase64();
      if (lastScreenshot) {
        const changePercentage = await calculateImageDifference(lastScreenshot, currentScreenshot);
        if (changePercentage > config.changeThreshold) {
          const blob = await window.electron.takeScreenshot();
          // OCRテキストを抽出
          const ocrText = await extractOcrText(blob);
          // contextにOCRテキストを追加
          let context = `画面が${(changePercentage * 100).toFixed(1)}%変化しました`;
          if (ocrText && ocrText.length > 0) {
            context += `\n[画面OCRテキスト]\n${ocrText}`;
          }
          const newChange: ScreenChange = {
            timestamp: Date.now(),
            screenshot: blob,
            changePercentage,
            context,
          };
          setScreenHistory(prev => [...prev.slice(-9), newChange]); // 最新10件を保持
          // 文脈に基づいたアドバイスを生成
          const advice = await generateContextualAdvice(blob, context, screenHistory);
          setCurrentAdvice(advice);
          // 構造化アドバイスも自動生成
          if (props.onStructuredAdvice) {
            const structured = await generateStructuredAdvice(blob, context, screenHistory);
            props.onStructuredAdvice(structured);
          }
        }
      }
      setLastScreenshot(currentScreenshot);
    } catch (error) {
      console.error('Screen monitoring error:', error);
    }
  }, [lastScreenshot, config.changeThreshold, calculateImageDifference, takeScreenshotAsBase64, generateContextualAdvice, generateStructuredAdvice, screenHistory, props.onStructuredAdvice]);

  // 監視を開始
  const startMonitoring = useCallback(() => {
    if (!config.enabled || isMonitoring) return;
    
    setIsMonitoring(true);
    intervalRef.current = setInterval(monitorScreen, config.interval);
  }, [config.enabled, config.interval, isMonitoring, monitorScreen]);

  // 監視を停止
  const stopMonitoring = useCallback(() => {
    setIsMonitoring(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // 設定変更時の処理
  useEffect(() => {
    if (config.enabled && !isMonitoring) {
      startMonitoring();
    } else if (!config.enabled && isMonitoring) {
      stopMonitoring();
    }
  }, [config.enabled, isMonitoring, startMonitoring, stopMonitoring]);

  // 監視間隔変更時の処理
  useEffect(() => {
    if (isMonitoring) {
      stopMonitoring();
      startMonitoring();
    }
  }, [config.interval]);

  // クリーンアップ
  useEffect(() => {
    return () => {
      stopMonitoring();
    };
  }, [stopMonitoring]);

  return {
    isMonitoring,
    screenHistory,
    currentAdvice,
    startMonitoring,
    stopMonitoring,
    clearHistory: () => setScreenHistory([]),
    clearAdvice: () => setCurrentAdvice(''),
    generateStructuredAdvice,
  };
};