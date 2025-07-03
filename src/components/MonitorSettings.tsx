import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaTimes,
  FaSave,
  FaKey,
  FaEye,
  FaEyeSlash,
  FaBrain,
  FaCog,
} from "react-icons/fa";
import { useTranslation } from "react-i18next";

interface MonitorSettingsProps {
  isEnabled: boolean;
  interval: number;
  changeThreshold: number;
  geminiApiKey: string;
  onEnabledChange: (enabled: boolean) => void;
  onIntervalChange: (interval: number) => void;
  onThresholdChange: (threshold: number) => void;
  onGeminiApiKeyChange: (apiKey: string) => void;
  isVisible: boolean;
  onClose: () => void;
}

interface AISettings {
  model: string;
  temperature: number;
  maxTokens: number;
  enableMemory: boolean;
  enableLearning: boolean;
}

const MonitorSettings: React.FC<MonitorSettingsProps> = ({
  isEnabled,
  interval,
  changeThreshold,
  geminiApiKey,
  onEnabledChange,
  onIntervalChange,
  onThresholdChange,
  onGeminiApiKeyChange,
  isVisible,
  onClose,
}) => {
  const { t } = useTranslation();
  const [tempApiKey, setTempApiKey] = useState(geminiApiKey);
  const [showApiKey, setShowApiKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"monitor" | "ai">("monitor");

  // AI設定の状態
  const [aiSettings, setAiSettings] = useState<AISettings>({
    model: "gemini-2.5-flash",
    temperature: 0.7,
    maxTokens: 1000,
    enableMemory: true,
    enableLearning: true,
  });

  // 設定を読み込む
  useEffect(() => {
    const loadAISettings = async () => {
      const settings = await window.electron?.store.get("aiSettings");
      if (settings) {
        // メモリーと学習機能は常に有効
        setAiSettings({
          ...settings,
          enableMemory: true,
          enableLearning: true,
        });
      }
    };
    loadAISettings();
  }, []);

  // AI設定を保存
  const saveAISettings = async (newSettings: AISettings) => {
    // メモリーと学習機能は常に有効
    const settingsWithMemoryEnabled = {
      ...newSettings,
      enableMemory: true,
      enableLearning: true,
    };
    setAiSettings(settingsWithMemoryEnabled);
    await window.electron?.store.set("aiSettings", settingsWithMemoryEnabled);
  };

  const handleSaveApiKey = async () => {
    setIsSaving(true);
    await onGeminiApiKeyChange(tempApiKey);
    setTimeout(() => {
      setIsSaving(false);
    }, 500);
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        className="absolute top-full mt-2 right-0 w-96 bg-white/95 backdrop-blur-md rounded-lg shadow-lg border border-gray-200 p-4 z-50"
      >
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-800">
            {t("monitorSettings.title")}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-100 transition-colors"
          >
            <FaTimes className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* タブ */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setActiveTab("monitor")}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
              activeTab === "monitor"
                ? "bg-blue-500 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            <FaEye className="inline w-4 h-4 mr-1" />
            監視設定
          </button>
          <button
            onClick={() => setActiveTab("ai")}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
              activeTab === "ai"
                ? "bg-blue-500 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            <FaBrain className="inline w-4 h-4 mr-1" />
            AI設定
          </button>
        </div>

        {activeTab === "monitor" ? (
          <>
            {/* 監視設定 */}
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  {t("monitorSettings.interval", { sec: interval / 1000 })}
                </label>
                <input
                  type="range"
                  min="1000"
                  max="30000"
                  step="1000"
                  value={interval}
                  onChange={(e) => onIntervalChange(Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>{t("monitorSettings.intervalMin")}</span>
                  <span>{t("monitorSettings.intervalMax")}</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  {t("monitorSettings.threshold", {
                    percent: Math.round(changeThreshold * 100),
                  })}
                </label>
                <input
                  type="range"
                  min="0.01"
                  max="0.5"
                  step="0.01"
                  value={changeThreshold}
                  onChange={(e) => onThresholdChange(Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>{t("monitorSettings.thresholdMin")}</span>
                  <span>{t("monitorSettings.thresholdMax")}</span>
                </div>
              </div>

              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-xs text-blue-700">
                  <strong>{t("monitorSettings.hint").split(":")[0]}:</strong>{" "}
                  {t("monitorSettings.hint").split(":")[1]}
                </p>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* AI設定 */}
            <div className="space-y-4">
              {/* API Key設定 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <FaKey className="inline w-4 h-4 mr-1" />
                  {t("monitorSettings.apiKey")}
                </label>
                <div className="relative">
                  <input
                    type={showApiKey ? "text" : "password"}
                    value={tempApiKey}
                    onChange={(e) => setTempApiKey(e.target.value)}
                    placeholder={t("monitorSettings.apiKeyPlaceholder")}
                    className="w-full px-3 py-2 pr-20 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                  <div className="absolute right-1 top-1 flex gap-1">
                    <button
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="p-2 rounded hover:bg-gray-100 transition-colors"
                      type="button"
                    >
                      {showApiKey ? (
                        <FaEyeSlash className="w-4 h-4 text-gray-500" />
                      ) : (
                        <FaEye className="w-4 h-4 text-gray-500" />
                      )}
                    </button>
                    <button
                      onClick={handleSaveApiKey}
                      disabled={tempApiKey === geminiApiKey || isSaving}
                      className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                        tempApiKey === geminiApiKey || isSaving
                          ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                          : "bg-blue-500 text-white hover:bg-blue-600"
                      }`}
                    >
                      {isSaving ? (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 0.5 }}
                        >
                          <FaSave className="w-4 h-4" />
                        </motion.div>
                      ) : (
                        t("monitorSettings.save")
                      )}
                    </button>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  <a
                    href="https://makersuite.google.com/app/apikey"
                    onClick={(e) => {
                      e.preventDefault();
                      window.electron.openExternal(
                        "https://makersuite.google.com/app/apikey",
                      );
                    }}
                    className="text-blue-500 hover:text-blue-700 underline"
                  >
                    {t("monitorSettings.getApiKey")}
                  </a>
                </p>
              </div>

              {/* モデル選択 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <FaCog className="inline w-4 h-4 mr-1" />
                  AIモデル
                </label>
                <select
                  value={aiSettings.model}
                  onChange={(e) =>
                    saveAISettings({ ...aiSettings, model: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                >
                  <option value="gemini-2.5-flash">
                    Gemini 2.5 Flash (高速)
                  </option>
                  <option value="gemini-2.5-pro">
                    Gemini 2.5 Pro (高精度)
                  </option>
                </select>
              </div>

              {/* 温度設定 */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  生成の創造性 (Temperature): {aiSettings.temperature}
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={aiSettings.temperature}
                  onChange={(e) =>
                    saveAISettings({
                      ...aiSettings,
                      temperature: Number(e.target.value),
                    })
                  }
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>保守的</span>
                  <span>創造的</span>
                </div>
              </div>

              {/* 最大トークン数 */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  最大トークン数: {aiSettings.maxTokens}
                </label>
                <input
                  type="range"
                  min="100"
                  max="4000"
                  step="100"
                  value={aiSettings.maxTokens}
                  onChange={(e) =>
                    saveAISettings({
                      ...aiSettings,
                      maxTokens: Number(e.target.value),
                    })
                  }
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>短い回答</span>
                  <span>長い回答</span>
                </div>
              </div>

              <div className="mt-4 p-3 bg-purple-50 rounded-lg">
                <p className="text-xs text-purple-700">
                  <strong>メモリ機能について:</strong>{" "}
                  あなたの作業パターンや好みを学習し、よりパーソナライズされたアドバイスを提供します。すべてのデータはローカルに保存されます。機能は常に有効になっています。
                </p>
              </div>
            </div>
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default MonitorSettings;
