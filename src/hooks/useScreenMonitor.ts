import { useState, useEffect, useRef, useCallback } from 'react';

interface ScreenMonitorConfig {
  interval: number; // 監視間隔（ミリ秒）
  enabled: boolean; // 監視の有効/無効
  changeThreshold: number; // 変化検知の閾値（0-1）
}

interface ScreenChange {
  timestamp: number;
  screenshot: Blob;
  changePercentage: number;
  context: string;
}

export const useScreenMonitor = (config: ScreenMonitorConfig) => {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [lastScreenshot, setLastScreenshot] = useState<string | null>(null);
  const [screenHistory, setScreenHistory] = useState<ScreenChange[]>([]);
  const [currentAdvice, setCurrentAdvice] = useState<string>('');
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

  // 文脈に基づいたアドバイスを生成
  const generateContextualAdvice = useCallback(async (
    screenshot: Blob,
    context: string,
    history: ScreenChange[]
  ): Promise<string> => {
    const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
      return 'API key not configured';
    }

    const base64 = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(screenshot);
    });

    const historyContext = history.slice(-3).map((change, index) => 
      `${index + 1}. ${new Date(change.timestamp).toLocaleTimeString()}: ${change.context}`
    ).join('\n');

    const prompt = `画面を継続的に監視しています。以下の文脈で、現在の画面に対して簡潔で実用的なアドバイスを日本語で提供してください：

最近の画面変化の履歴：
${historyContext}

現在の状況：${context}

アドバイスは以下の観点から提供してください：
- 生産性の向上
- 作業効率の改善
- 注意すべき点
- 次に取るべきアクション

回答は100文字以内で簡潔にお願いします。`;

    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    inlineData: {
                      mimeType: 'image/png',
                      data: base64.replace(/^data:image\/png;base64,/, ''),
                    },
                  },
                  {
                    text: prompt,
                  },
                ],
              },
            ],
          }),
        }
      );

      const json = await res.json();
      return json.candidates?.[0]?.content?.parts?.[0]?.text || 'アドバイスを生成できませんでした';
    } catch (error) {
      console.error('Error generating advice:', error);
      return 'アドバイス生成中にエラーが発生しました';
    }
  }, []);

  // 画面を監視する関数
  const monitorScreen = useCallback(async () => {
    try {
      const currentScreenshot = await takeScreenshotAsBase64();
      
      if (lastScreenshot) {
        const changePercentage = await calculateImageDifference(lastScreenshot, currentScreenshot);
        
        if (changePercentage > config.changeThreshold) {
          const blob = await window.electron.takeScreenshot();
          const context = `画面が${(changePercentage * 100).toFixed(1)}%変化しました`;
          
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
        }
      }
      
      setLastScreenshot(currentScreenshot);
    } catch (error) {
      console.error('Screen monitoring error:', error);
    }
  }, [lastScreenshot, config.changeThreshold, calculateImageDifference, takeScreenshotAsBase64, generateContextualAdvice, screenHistory]);

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
  };
};