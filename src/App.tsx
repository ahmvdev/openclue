import { useState, useEffect, useRef } from 'react';
import Header from './components/Header';
import MonitorSettings from './components/MonitorSettings';
import AdvicePanel from './components/AdvicePanel';
import SystemInfo from './components/SystemInfo';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { useScreenMonitor } from './hooks/useScreenMonitor';
import { toast, Toaster } from 'react-hot-toast';

function App() {
  const [isFocused, setIsFocused] = useState(false);
  const [text, setText] = useState('');
  const [hasResized, setHasResized] = useState(false);
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  
  // 監視設定の状態
  const [monitorConfig, setMonitorConfig] = useState({
    interval: 5000, // 5秒
    enabled: false,
    changeThreshold: 0.05, // 5%の変化で検知
  });

  // 設定を読み込む
  useEffect(() => {
    const loadSettings = async () => {
      try {
        // API Keyを読み込む
        const storedApiKey = await window.electron?.store.get('geminiApiKey') || '';
        setGeminiApiKey(storedApiKey);

        // 監視設定を読み込む
        const storedConfig = await window.electron?.store.get('monitorConfig');
        if (storedConfig) {
          setMonitorConfig(storedConfig);
        }
      } catch (error) {
        console.error('Failed to load settings:', error);
        toast.error('設定の読み込みに失敗しました');
      }
    };

    loadSettings();
  }, []);

  // ショートカットキーのイベントハンドラーを登録
  useEffect(() => {
    // スクリーンショットショートカット
    const unsubscribeScreenshot = window.electron?.onTakeScreenshotShortcut(() => {
      handleTakeScreenshot();
    });

    // 解決策取得ショートカット
    const unsubscribeSolution = window.electron?.onGetSolutionShortcut(() => {
      if (text.trim()) {
        handleGetSolution();
      }
    });

    return () => {
      // クリーンアップ
      if (typeof unsubscribeScreenshot === 'function') unsubscribeScreenshot();
      if (typeof unsubscribeSolution === 'function') unsubscribeSolution();
    };
  }, [text]);

  // 画面監視フックを使用
  const {
    isMonitoring,
    currentAdvice,
    startMonitoring,
    stopMonitoring,
    clearAdvice,
  } = useScreenMonitor({
    ...monitorConfig,
    geminiApiKey
  });

  function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  }

  async function sendToGemini(base64Image: string, prompt: string): Promise<string> {
    if (!geminiApiKey) {
      return 'Gemini API Keyが設定されていません。設定画面からAPI Keyを設定してください。';
    }

    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`,
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
                      data: base64Image.replace(/^data:image\/png;base64,/, ''),
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

      if (!res.ok) {
        const errorData = await res.json();
        console.error('Gemini API error:', errorData);
        return `Gemini APIエラー: ${errorData.error?.message || 'Unknown error'}`;
      }

      const json = await res.json();
      return json.candidates?.[0]?.content?.parts?.[0]?.text || 'No response from Gemini';
    } catch (error) {
      console.error('Error calling Gemini API:', error);
      return 'Gemini APIの呼び出し中にエラーが発生しました。';
    }
  }

  const handleTakeScreenshot = async () => {
    try {
      const screenshot = await window.electron.takeScreenshot();
      const base64 = await blobToBase64(screenshot);
      
      // スクリーンショットを保存（必要に応じて）
      const screenshots = await window.electron?.store.get('screenshots') || [];
      screenshots.push({
        timestamp: new Date().toISOString(),
        data: base64
      });
      
      // 最新の5つのみ保持
      if (screenshots.length > 5) {
        screenshots.shift();
      }
      
      await window.electron?.store.set('screenshots', screenshots);
      toast.success('スクリーンショットを撮影しました');
    } catch (error) {
      console.error('Screenshot error:', error);
      toast.error('スクリーンショットの撮影に失敗しました');
    }
  };

  const handleGetSolution = async () => {
    await handleKeyDown({ key: 'Enter' } as React.KeyboardEvent<HTMLInputElement>);
  };

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && text.trim() !== '') {
      setLoading(true);
      setResponse('');
      if (!hasResized) {
        await window.electron?.increaseHeightFromBottom(400);
        setHasResized(true);
      }

      try {
        const screenshot = await window.electron.takeScreenshot();
        const base64 = await blobToBase64(screenshot);
        const reply = await sendToGemini(base64, text.trim());

        setResponse(reply);
        setText('');
        toast.success('解決策を生成しました');
      } catch (error) {
        console.error('Error getting solution:', error);
        toast.error('解決策の生成に失敗しました');
        setResponse('エラーが発生しました。もう一度お試しください。');
      } finally {
        setLoading(false);
      }
    }
  };

  // 監視設定の更新関数
  const updateMonitorConfig = async (updates: Partial<typeof monitorConfig>) => {
    const newConfig = { ...monitorConfig, ...updates };
    setMonitorConfig(newConfig);
    
    // 設定を保存
    try {
      await window.electron?.store.set('monitorConfig', newConfig);
    } catch (error) {
      console.error('Failed to save monitor config:', error);
      toast.error('設定の保存に失敗しました');
    }
  };
  
  // Gemini API Keyの更新関数
  const updateGeminiApiKey = async (apiKey: string) => {
    setGeminiApiKey(apiKey);
    
    // API Keyを保存
    try {
      await window.electron?.store.set('geminiApiKey', apiKey);
      toast.success('API Keyを保存しました');
    } catch (error) {
      console.error('Failed to save Gemini API Key:', error);
      toast.error('API Keyの保存に失敗しました');
    }
  };

  // 監視のトグル
  const toggleMonitoring = () => {
    updateMonitorConfig({ enabled: !monitorConfig.enabled });
    if (!monitorConfig.enabled) {
      toast.success('画面監視を開始しました');
    } else {
      toast.success('画面監視を停止しました');
    }
  };

  return (
    <main className="drag h-screen flex flex-col font-sfpro bg-gradient-to-br from-[#e8debe]/90 via-[#ffffff]/90 to-[#d4e4fc]/90 backdrop-blur-md text-gray-800 rounded-[15px] shadow-lg">
      <Header 
        onSettingsClick={() => setShowSettings(!showSettings)}
        isMonitoring={isMonitoring}
        onToggleMonitoring={toggleMonitoring}
      />

      <section className="no-drag flex justify-center items-start mt-4 px-4">
        <div className="relative w-full max-w-md">
          <input
            ref={inputRef}
            placeholder="質問を入力してください..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onKeyDown={handleKeyDown}
            className="outline-none w-full rounded-lg p-4 text-gray-800 bg-white/80 shadow-sm 
                     placeholder-gray-500 focus:bg-white focus:shadow-md transition-all duration-200"
          />
          
          <AnimatePresence>
            {isFocused && text.trim() && (
              <motion.div
                initial={{ opacity: 0, y: -7 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="absolute top-full right-0 mt-1 text-sm text-gray-600 flex items-center gap-1"
              >
                <span>↵</span>
                <span>Enter</span>
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* 設定パネル */}
          <AnimatePresence>
            {showSettings && (
              <MonitorSettings
                isEnabled={monitorConfig.enabled}
                interval={monitorConfig.interval}
                changeThreshold={monitorConfig.changeThreshold}
                geminiApiKey={geminiApiKey}
                onEnabledChange={(enabled) => updateMonitorConfig({ enabled })}
                onIntervalChange={(interval) => updateMonitorConfig({ interval })}
                onThresholdChange={(threshold) => updateMonitorConfig({ changeThreshold: threshold })}
                onGeminiApiKeyChange={updateGeminiApiKey}
                isVisible={showSettings}
                onClose={() => setShowSettings(false)}
              />
            )}
          </AnimatePresence>
        </div>
      </section>

      <section className="no-drag flex-1 overflow-y-auto mt-4 text-gray-800 select-text">
        {/* アドバイスパネル */}
        <AdvicePanel
          advice={currentAdvice}
          isMonitoring={isMonitoring}
          onClear={clearAdvice}
          onToggleMonitoring={toggleMonitoring}
        />

        <div className="px-4">
          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2 px-6 text-gray-600 font-medium"
            >
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
              <span>考え中...</span>
            </motion.div>
          )}

          <AnimatePresence>
            {response && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="mt-4 px-4 pb-4 max-w-full"
              >
                <div className="bg-white/60 rounded-lg p-4 shadow-sm">
                  <div className="prose prose-sm max-w-full overflow-x-hidden break-words">
                    <ReactMarkdown
                      components={{
                        a: ({ href, children, ...props }) => (
                          <a
                            {...props}
                            href={href}
                            onClick={(e) => {
                              e.preventDefault();
                              if (href) window.electron.openExternal(href);
                            }}
                            className="text-blue-600 underline break-words hover:text-blue-800 transition-colors"
                          >
                            {children}
                          </a>
                        ),
                        code: ({ children, ...props }) => (
                          <code {...props} className="bg-gray-100 px-1 py-0.5 rounded text-sm">
                            {children}
                          </code>
                        ),
                        pre: ({ children, ...props }) => (
                          <pre {...props} className="bg-gray-100 p-3 rounded-lg overflow-x-auto">
                            {children}
                          </pre>
                        ),
                      }}
                    >{response}</ReactMarkdown>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        {/* システム情報 */}
        <SystemInfo 
          isVisible={showSettings} 
          isMonitoring={isMonitoring}
        />
      </section>

      {/* Toast通知 */}
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#fff',
            color: '#333',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
            borderRadius: '8px',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
    </main>
  );
}

export default App;
