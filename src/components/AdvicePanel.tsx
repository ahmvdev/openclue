import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiEye, FiClock } from 'react-icons/fi';

interface AdvicePanelProps {
  advice: string;
  isMonitoring: boolean;
  onClear: () => void;
  onToggleMonitoring: () => void;
}

const AdvicePanel: React.FC<AdvicePanelProps> = ({
  advice,
  isMonitoring,
  onClear,
  onToggleMonitoring,
}) => {
  return (
    <div className="mt-4 px-4">
      {/* 監視ステータス */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <FiEye className={`text-sm ${isMonitoring ? 'text-green-600' : 'text-gray-400'}`} />
          <span className="text-xs font-medium text-gray-600">
            {isMonitoring ? '監視中' : '監視停止中'}
          </span>
          {isMonitoring && (
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-2 h-2 bg-green-500 rounded-full"
            />
          )}
        </div>
        
        <button
          onClick={onToggleMonitoring}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
            isMonitoring
              ? 'bg-red-100 text-red-700 hover:bg-red-200'
              : 'bg-green-100 text-green-700 hover:bg-green-200'
          }`}
        >
          {isMonitoring ? '停止' : '開始'}
        </button>
      </div>

      {/* アドバイス表示 */}
      <AnimatePresence>
        {advice && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 relative"
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-1">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <FiClock className="text-blue-600 text-sm" />
                </div>
              </div>
              
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-blue-900 mb-1">
                  リアルタイムアドバイス
                </h4>
                <p className="text-sm text-blue-800 leading-relaxed">
                  {advice}
                </p>
                <div className="text-xs text-blue-600 mt-2">
                  {new Date().toLocaleTimeString()}
                </div>
              </div>
              
              <button
                onClick={onClear}
                className="flex-shrink-0 p-1 text-blue-400 hover:text-blue-600 transition-colors"
              >
                <FiX className="text-sm" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 監視中でアドバイスがない場合の表示 */}
      {isMonitoring && !advice && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center"
        >
          <div className="text-gray-400 mb-2">
            <FiEye className="mx-auto text-2xl" />
          </div>
          <p className="text-sm text-gray-600">
            画面の変化を監視しています...
          </p>
          <p className="text-xs text-gray-500 mt-1">
            大きな変化があった時にアドバイスを表示します
          </p>
        </motion.div>
      )}
    </div>
  );
};

export default AdvicePanel;