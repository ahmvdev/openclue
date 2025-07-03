import { useState, useEffect, useRef } from "react";
import Header from "./components/Header";
import MonitorSettings from "./components/MonitorSettings";
import AdvicePanel from "./components/AdvicePanel";
import SystemInfo from "./components/SystemInfo";
// メモリー機能は内部的に useUserMemory フックで動作
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { useScreenMonitor } from "./hooks/useScreenMonitor";
import { useUserMemory } from "./hooks/useUserMemory";
import { toast, Toaster } from "react-hot-toast";
import { callGeminiAPI } from "./lib/geminiClient";
import "./i18n";
import { useTranslation } from "react-i18next";

// 型定義拡張
interface TodoItem {
  text: string;
  checked: boolean;
}
interface StructuredAdvice {
  todo?: TodoItem[];
  summary?: string;
  raw?: string;
  timestamp?: number;
}

function App() {
  const { t, i18n } = useTranslation();
  const [isFocused, setIsFocused] = useState(false);
  const [text, setText] = useState("");
  const [hasResized, setHasResized] = useState(false);
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  // メモリーパネルは内部的に常に動作（UIは非表示）
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // 監視設定の状態（常にオン）
  const [monitorConfig, setMonitorConfig] = useState({
    interval: 5000, // 5秒
    enabled: true, // 常にオン
    changeThreshold: 0.05, // 5%の変化で検知
  });

  // --- 構造化アドバイス用の状態 ---
  const [structuredAdvice, setStructuredAdvice] =
    useState<StructuredAdvice | null>(null);
  const [structuring, setStructuring] = useState(false);
  const [structuredAdviceHistory, setStructuredAdviceHistory] = useState<
    StructuredAdvice[]
  >([]);

  // 設定を読み込む
  useEffect(() => {
    const loadSettings = async () => {
      try {
        // API Keyを読み込む
        const storedApiKey =
          (await window.electron?.store.get("geminiApiKey")) || "";
        setGeminiApiKey(storedApiKey);

        // 監視設定を読み込む
        const storedConfig = await window.electron?.store.get("monitorConfig");
        if (storedConfig) {
          setMonitorConfig(storedConfig);
        }
      } catch (error) {
        console.error("Failed to load settings:", error);
        toast.error("設定の読み込みに失敗しました");
      }
    };

    loadSettings();
  }, []);

  // --- 履歴の永続化: 初期化・復元 ---
  useEffect(() => {
    const loadAdviceHistory = async () => {
      try {
        const langKey = `adviceHistory_${i18n.language.startsWith("en") ? "en" : "ja"}`;
        const saved = await window.electron?.store.get(langKey);
        if (Array.isArray(saved)) {
          // 旧型式（string[]）→新型式（TodoItem[]）に変換
          const converted = saved.map((item: any) => ({
            ...item,
            todo: Array.isArray(item.todo)
              ? item.todo.map((t: string | TodoItem) =>
                  typeof t === "string" ? { text: t, checked: false } : t,
                )
              : undefined,
          }));
          setStructuredAdviceHistory(converted);
        } else {
          setStructuredAdviceHistory([]);
        }
      } catch (e) {
        // エラーは無視
      }
    };
    loadAdviceHistory();
    // 言語切替時も履歴を切り替え
  }, [i18n.language]);

  // --- 履歴の永続化: 保存 ---
  useEffect(() => {
    if (structuredAdviceHistory.length > 0) {
      const langKey = `adviceHistory_${i18n.language.startsWith("en") ? "en" : "ja"}`;
      window.electron?.store.set(langKey, structuredAdviceHistory);
    }
  }, [structuredAdviceHistory, i18n.language]);

  // --- ショートカットキーのイベントハンドラーで使う関数を先に宣言 ---
  const handleTakeScreenshot = async () => {
    try {
      const screenshot = await window.electron.takeScreenshot();
      const base64 = await blobToBase64(screenshot);
      // スクリーンショットを保存（必要に応じて）
      const screenshots =
        (await window.electron?.store.get("screenshots")) || [];
      screenshots.push({
        timestamp: new Date().toISOString(),
        data: base64,
      });
      // 最新の5つのみ保持
      if (screenshots.length > 5) {
        screenshots.shift();
      }
      await window.electron?.store.set("screenshots", screenshots);
      toast.success("スクリーンショットを撮影しました");
    } catch (error) {
      console.error("Screenshot error:", error);
      toast.error("スクリーンショットの撮影に失敗しました");
    }
  };

  const handleGetSolution = async () => {
    await handleKeyDown({
      key: "Enter",
    } as React.KeyboardEvent<HTMLInputElement>);
  };

  // ショートカットキーのイベントハンドラーを登録
  useEffect(() => {
    // スクリーンショットショートカット
    const unsubscribeScreenshot = window.electron?.onTakeScreenshotShortcut(
      () => {
        handleTakeScreenshot();
      },
    );
    // 解決策取得ショートカット
    const unsubscribeSolution = window.electron?.onGetSolutionShortcut(() => {
      if (text.trim()) {
        handleGetSolution();
      }
    });
    return () => {
      // クリーンアップ
      if (typeof unsubscribeScreenshot === "function") unsubscribeScreenshot();
      if (typeof unsubscribeSolution === "function") unsubscribeSolution();
    };
  }, [text, handleGetSolution, handleTakeScreenshot]);

  // structuredAdviceが更新されたら履歴に追加
  useEffect(() => {
    if (
      structuredAdvice &&
      (structuredAdvice.summary ||
        (structuredAdvice.todo && structuredAdvice.todo.length > 0))
    ) {
      setStructuredAdviceHistory((prev) => {
        // todo: string[] → TodoItem[]
        const todo = structuredAdvice.todo
          ? structuredAdvice.todo.map((t: string | TodoItem) =>
              typeof t === "string" ? { text: t, checked: false } : t,
            )
          : undefined;
        const newItem: StructuredAdvice = {
          ...structuredAdvice,
          todo,
          timestamp: Date.now(),
        };
        const arr = [...prev, newItem];
        return arr.slice(-10);
      });
    }
  }, [structuredAdvice]);

  // --- チェック状態の切り替え ---
  const handleToggleTodo = (historyIdx: number, todoIdx: number) => {
    setStructuredAdviceHistory((prev) => {
      const arr = prev.map((item, idx) => {
        if (idx !== historyIdx) return item;
        if (!item.todo) return item;
        const newTodo = item.todo.map((t, i) =>
          i === todoIdx ? { ...t, checked: !t.checked } : t,
        );
        return { ...item, todo: newTodo };
      });
      // 永続化
      const langKey = `adviceHistory_${i18n.language.startsWith("en") ? "en" : "ja"}`;
      window.electron?.store.set(langKey, arr);
      return arr;
    });
  };

  // --- 最新アドバイスのTODOチェック ---
  const handleToggleCurrentTodo = (todoIdx: number) => {
    setStructuredAdvice((prev) => {
      if (!prev || !prev.todo) return prev;
      const newTodo = prev.todo.map((t, i) =>
        i === todoIdx ? { ...t, checked: !t.checked } : t,
      );
      return { ...prev, todo: newTodo };
    });
  };

  // --- 履歴クリア機能の永続化 ---
  const handleClearAdviceHistory = async () => {
    setStructuredAdviceHistory([]);
    const langKey = `adviceHistory_${i18n.language.startsWith("en") ? "en" : "ja"}`;
    await window.electron?.store.delete(langKey);
    toast.success(t("app.clearHistory") + " " + t("app.adviceHistory"));
  };

  // 履歴から選択したアドバイスを再表示
  const handleSelectHistory = (item: StructuredAdvice) => {
    setStructuredAdvice(item);
  };

  // 画面変化時の自動構造化アドバイス反映用コールバック
  const handleAutoStructuredAdvice = (advice: {
    todo?: string[];
    summary?: string;
    raw?: string;
  }) => {
    // string[]をTodoItem[]に変換
    const structuredAdvice: StructuredAdvice = {
      ...advice,
      todo: advice.todo
        ? advice.todo.map((text) => ({ text, checked: false }))
        : undefined,
    };
    setStructuredAdvice(structuredAdvice);
  };

  // 画面監視フックを使用
  const {
    isMonitoring,
    currentAdvice,
    startMonitoring,
    stopMonitoring,
    clearAdvice,
    generateStructuredAdvice,
    screenHistory,
    suggestions,
  } = useScreenMonitor({
    ...monitorConfig,
    geminiApiKey,
    onStructuredAdvice: handleAutoStructuredAdvice,
  });

  function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  }

  async function sendToGemini(
    base64Image: string,
    prompt: string,
  ): Promise<string> {
    if (!geminiApiKey) {
      return t("app.geminiKeyNotSet");
    }
    try {
      // 高度なOCRを使用してコンテキストを拡張
      const blob = await window.electron.takeScreenshot();
      const { enhanceLLMContextWithOCR } = await import(
        "./lib/ocrIntegrationService"
      );

      const enhancedPrompt = await enhanceLLMContextWithOCR(blob, prompt, {
        includeOCRAnalysis: true,
        useEnhancedPrompts: true,
        maxOCRTextLength: 1500,
      });

      const result = await callGeminiAPI({
        apiKey: geminiApiKey,
        model: "gemini-2.5-flash",
        prompt: enhancedPrompt,
        imageBase64: base64Image,
        outputFormat: "text",
        language: i18n.language.startsWith("en") ? "en" : "ja",
      });
      return typeof result === "string" ? result : JSON.stringify(result);
    } catch (error: unknown) {
      console.error("Error calling Gemini API:", error);
      return t("app.geminiApiError");
    }
  }

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && text.trim() !== "") {
      setLoading(true);
      setResponse("");
      if (!hasResized) {
        await window.electron?.increaseHeightFromBottom(400);
        setHasResized(true);
      }

      try {
        const screenshot = await window.electron.takeScreenshot();
        const base64 = await blobToBase64(screenshot);
        const reply = await sendToGemini(base64, text.trim());

        setResponse(reply);
        setText("");
        toast.success("解決策を生成しました");
      } catch (error) {
        console.error("Error getting solution:", error);
        toast.error("解決策の生成に失敗しました");
        setResponse("エラーが発生しました。もう一度お試しください。");
      } finally {
        setLoading(false);
      }
    }
  };

  // 監視設定の更新関数（enabledは常にtrue）
  const updateMonitorConfig = async (
    updates: Partial<typeof monitorConfig>,
  ) => {
    const newConfig = { ...monitorConfig, ...updates, enabled: true };
    setMonitorConfig(newConfig);

    // 設定を保存
    try {
      await window.electron?.store.set("monitorConfig", newConfig);
    } catch (error) {
      console.error("Failed to save monitor config:", error);
      toast.error("設定の保存に失敗しました");
    }
  };

  // Gemini API Keyの更新関数
  const updateGeminiApiKey = async (apiKey: string) => {
    setGeminiApiKey(apiKey);

    // API Keyを保存
    try {
      await window.electron?.store.set("geminiApiKey", apiKey);
      toast.success("API Keyを保存しました");
    } catch (error) {
      console.error("Failed to save Gemini API Key:", error);
      toast.error("API Keyの保存に失敗しました");
    }
  };

  // 監視のトグル
  const toggleMonitoring = () => {
    updateMonitorConfig({ enabled: !monitorConfig.enabled });
    if (!monitorConfig.enabled) {
      toast.success("画面監視を開��しました");
    } else {
      toast.success("画面監視を停止しました");
    }
  };

  // 構造化ア���バイス生成ハンドラ
  const handleStructuredAdvice = async () => {
    setStructuring(true);
    setStructuredAdvice(null);
    try {
      // 最新の履歴から直近のスクリーンショット・文脈を取得
      const last = screenHistory[screenHistory.length - 1];
      if (!last) {
        toast.error("履歴がありません");
        setStructuring(false);
        return;
      }
      const result = await generateStructuredAdvice(
        last.screenshot,
        last.context,
        screenHistory,
      );
      // string[]をTodoItem[]に変換
      const structuredResult: StructuredAdvice = {
        ...result,
        todo: result.todo
          ? result.todo.map((text: string) => ({ text, checked: false }))
          : undefined,
      };
      setStructuredAdvice(structuredResult);
    } catch (e) {
      toast.error("構造化アドバイス生成に失敗しました");
    } finally {
      setStructuring(false);
    }
  };

  return (
    <main className="drag h-screen flex flex-col font-sfpro bg-gradient-to-br from-[#e8debe]/90 via-[#ffffff]/90 to-[#d4e4fc]/90 backdrop-blur-md text-gray-800 rounded-[15px] shadow-lg">
      <Header
        onSettingsClick={() => setShowSettings(!showSettings)}
        isMonitoring={true}
        onToggleMonitoring={() => {}} // 何もしない
      />

      <section className="no-drag flex justify-center items-start mt-4 px-4">
        <div className="relative w-full max-w-md">
          <input
            ref={inputRef}
            placeholder={t("app.inputPlaceholder")}
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
                onIntervalChange={(interval) =>
                  updateMonitorConfig({ interval })
                }
                onThresholdChange={(threshold) =>
                  updateMonitorConfig({ changeThreshold: threshold })
                }
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
          isMonitoring={true}
          onClear={clearAdvice}
          onToggleMonitoring={() => {}} // 何もしない
          suggestions={suggestions}
        />

        {/* 構造化アドバ���ス生成ボタンと表示 */}
        <div className="px-4 mt-4">
          <button
            onClick={handleStructuredAdvice}
            disabled={structuring || screenHistory.length === 0}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:text-gray-400"
          >
            {structuring ? t("app.generating") : t("app.generateTodo")}
          </button>
          {/* 構造化アドバイス表示（最新） */}
          {structuredAdvice && (
            <div className="mt-3 bg-white/70 rounded-lg p-4 shadow-sm">
              {structuredAdvice.summary && (
                <div className="mb-2 text-sm text-gray-700">
                  <span className="font-bold">{t("app.summary")}</span>{" "}
                  {structuredAdvice.summary}
                </div>
              )}
              {structuredAdvice.todo && structuredAdvice.todo.length > 0 && (
                <div className="text-sm text-gray-700">
                  <span className="font-bold">{t("app.todoList")}</span>
                  <ul className="list-disc ml-6 mt-1">
                    {structuredAdvice.todo.map((item, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={item.checked}
                          onChange={() => handleToggleCurrentTodo(idx)}
                          className="accent-blue-500 w-4 h-4"
                        />
                        <span
                          className={
                            item.checked ? "line-through text-gray-400" : ""
                          }
                        >
                          {item.text}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {!structuredAdvice.summary &&
                (!structuredAdvice.todo ||
                  structuredAdvice.todo.length === 0) && (
                  <div className="text-xs text-gray-500">
                    {structuredAdvice.raw}
                  </div>
                )}
            </div>
          )}

          {/* アドバイス履歴一覧 */}
          {structuredAdviceHistory.length > 0 && (
            <div className="mt-6">
              <div className="font-bold text-xs text-gray-500 mb-1 flex items-center gap-2">
                <span>{t("app.adviceHistory")}</span>
                <button
                  className="ml-auto text-xs text-red-400 hover:text-red-600 underline"
                  onClick={handleClearAdviceHistory}
                  type="button"
                >
                  {t("app.clearHistory")}
                </button>
              </div>
              <ul className="divide-y divide-gray-200 bg-white/60 rounded-lg shadow-sm">
                {structuredAdviceHistory
                  .slice()
                  .reverse()
                  .map((item, idx) => (
                    <li
                      key={item.timestamp}
                      className="px-3 py-2 cursor-pointer hover:bg-blue-50 transition-colors"
                      onClick={() => handleSelectHistory(item)}
                    >
                      <div className="text-xs text-gray-700 flex items-center gap-2">
                        <span>
                          {item.summary
                            ? item.summary.slice(0, 30)
                            : t("app.noSummary")}
                        </span>
                        <span className="ml-auto text-gray-400">
                          {item.timestamp
                            ? new Date(item.timestamp).toLocaleTimeString()
                            : ""}
                        </span>
                      </div>
                      {item.todo && item.todo.length > 0 && (
                        <div className="text-[11px] text-gray-500 mt-1 truncate flex flex-wrap gap-2">
                          {item.todo.slice(0, 3).map((todo, tIdx) => (
                            <label
                              key={tIdx}
                              className="inline-flex items-center gap-1 cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={todo.checked}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  handleToggleTodo(
                                    structuredAdviceHistory.length - 1 - idx,
                                    tIdx,
                                  );
                                }}
                                className="accent-blue-500 w-3 h-3"
                                onClick={(e) => e.stopPropagation()}
                              />
                              <span
                                className={
                                  todo.checked
                                    ? "line-through text-gray-400"
                                    : ""
                                }
                              >
                                {todo.text}
                              </span>
                            </label>
                          ))}
                          {item.todo.length > 3 ? <span>...</span> : null}
                        </div>
                      )}
                    </li>
                  ))}
              </ul>
            </div>
          )}
        </div>

        <div className="px-4">
          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2 px-6 text-gray-600 font-medium"
            >
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
              <span>{t("app.loading")}</span>
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
                          <code
                            {...props}
                            className="bg-gray-100 px-1 py-0.5 rounded text-sm"
                          >
                            {children}
                          </code>
                        ),
                        pre: ({ children, ...props }) => (
                          <pre
                            {...props}
                            className="bg-gray-100 p-3 rounded-lg overflow-x-auto"
                          >
                            {children}
                          </pre>
                        ),
                      }}
                    >
                      {response}
                    </ReactMarkdown>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* システム情報 */}
        <SystemInfo isVisible={showSettings} isMonitoring={true} />
      </section>

      {/* Toast通知 */}
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "#fff",
            color: "#333",
            boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
            borderRadius: "8px",
          },
          success: {
            iconTheme: {
              primary: "#10b981",
              secondary: "#fff",
            },
          },
          error: {
            iconTheme: {
              primary: "#ef4444",
              secondary: "#fff",
            },
          },
        }}
      />
    </main>
  );
}

export default App;
