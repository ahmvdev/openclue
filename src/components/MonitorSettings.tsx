import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTimes, FaSave, FaKey, FaEye, FaEyeSlash } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';

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
          <h3 className="font-semibold text-gray-800">{t('monitorSettings.title')}</h3>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-100 transition-colors"
          >
            <FaTimes className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* API Key設定 */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <FaKey className="inline w-4 h-4 mr-1" />
            {t('monitorSettings.apiKey')}
          </label>
          <div className="relative">
            <input
              type={showApiKey ? "text" : "password"}
              value={tempApiKey}
              onChange={(e) => setTempApiKey(e.target.value)}
              placeholder={t('monitorSettings.apiKeyPlaceholder')}
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
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-500 text-white hover:bg-blue-600'
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
                  t('monitorSettings.save')
                )}
              </button>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            <a
              href="https://makersuite.google.com/app/apikey"
              onClick={(e) => {
                e.preventDefault();
                window.electron.openExternal('https://makersuite.google.com/app/apikey');
              }}
              className="text-blue-500 hover:text-blue-700 underline"
            >
              {t('monitorSettings.getApiKey')}
            </a>
          </p>
        </div>

        {/* 監視設定 */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">{t('monitorSettings.monitoring')}</label>
            <button
              onClick={() => onEnabledChange(!isEnabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                isEnabled ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              {t('monitorSettings.interval', { sec: interval / 1000 })}
            </label>
            <input
              type="range"
              min="1000"
              max="30000"
              step="1000"
              value={interval}
              onChange={(e) => onIntervalChange(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              disabled={!isEnabled}
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>{t('monitorSettings.intervalMin')}</span>
              <span>{t('monitorSettings.intervalMax')}</span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              {t('monitorSettings.threshold', { percent: Math.round(changeThreshold * 100) })}
            </label>
            <input
              type="range"
              min="0.01"
              max="0.5"
              step="0.01"
              value={changeThreshold}
              onChange={(e) => onThresholdChange(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              disabled={!isEnabled}
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>{t('monitorSettings.thresholdMin')}</span>
              <span>{t('monitorSettings.thresholdMax')}</span>
            </div>
          </div>

          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-xs text-blue-700">
              <strong>{t('monitorSettings.hint').split(':')[0]}:</strong> {t('monitorSettings.hint').split(':')[1]}
            </p>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default MonitorSettings;
