import React from 'react';
import { motion } from 'framer-motion';

interface MonitorSettingsProps {
  isEnabled: boolean;
  interval: number;
  changeThreshold: number;
  onEnabledChange: (enabled: boolean) => void;
  onIntervalChange: (interval: number) => void;
  onThresholdChange: (threshold: number) => void;
  isVisible: boolean;
  onClose: () => void;
}

const MonitorSettings: React.FC<MonitorSettingsProps> = ({
  isEnabled,
  interval,
  changeThreshold,
  onEnabledChange,
  onIntervalChange,
  onThresholdChange,
  isVisible,
  onClose,
}) => {
  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="absolute top-full left-0 right-0 mt-2 bg-white/95 backdrop-blur-md rounded-lg p-4 shadow-lg border border-white/20 z-50"
    >
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800">監視設定</h3>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700 text-xl"
        >
          ×
        </button>
      </div>

      <div className="space-y-4">
        {/* 監視の有効/無効 */}
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">
            画面監視
          </label>
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

        {/* 監視間隔 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            監視間隔: {interval / 1000}秒
          </label>
          <input
            type="range"
            min="1000"
            max="30000"
            step="1000"
            value={interval}
            onChange={(e) => onIntervalChange(Number(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>1秒</span>
            <span>30秒</span>
          </div>
        </div>

        {/* 変化検知の感度 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            変化検知感度: {(changeThreshold * 100).toFixed(0)}%
          </label>
          <input
            type="range"
            min="0.01"
            max="0.5"
            step="0.01"
            value={changeThreshold}
            onChange={(e) => onThresholdChange(Number(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>高感度</span>
            <span>低感度</span>
          </div>
        </div>

        {/* 説明 */}
        <div className="text-xs text-gray-600 bg-gray-50 p-3 rounded">
          <p className="mb-1">
            <strong>監視間隔:</strong> 画面をチェックする頻度
          </p>
          <p className="mb-1">
            <strong>変化検知感度:</strong> どの程度の変化でアドバイスを生成するか
          </p>
          <p>
            <strong>注意:</strong> 短い間隔や高感度設定はバッテリー消費が増加します
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export default MonitorSettings;