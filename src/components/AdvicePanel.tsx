import React from 'react';
import { motion } from 'framer-motion';
import { FaSync, FaTrash, FaEye, FaEyeSlash, FaClock } from 'react-icons/fa';

interface AdvicePanelProps {
  advice: string | null;
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
  if (!advice && !isMonitoring) {
    return null;
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('ja-JP', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="mx-4 mb-4"
    >
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 shadow-sm border border-blue-200">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-blue-800 flex items-center gap-2">
              {isMonitoring ? (
                <>
                  <FaEye className="w-4 h-4" />
                  <span>画面監視中</span>
                </>
              ) : (
                <>
                  <FaEyeSlash className="w-4 h-4" />
                  <span>アドバイス</span>
                </>
              )}
            </h3>
            {isMonitoring && (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              >
                <FaSync className="w-4 h-4 text-blue-600" />
              </motion.div>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {advice && (
              <>
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <FaClock className="w-3 h-3" />
                  {formatTime(new Date())}
                </span>
                <button
                  onClick={onClear}
                  className="p-1 rounded hover:bg-white/50 transition-colors"
                  title="クリア"
                >
                  <FaTrash className="w-3 h-3 text-gray-500" />
                </button>
              </>
            )}
          </div>
        </div>
        
        {advice ? (
          <div className="text-sm text-gray-700 leading-relaxed">
            {advice}
          </div>
        ) : isMonitoring ? (
          <div className="text-sm text-gray-600 italic">
            画面の変化を監視しています...
          </div>
        ) : null}
        
        {!isMonitoring && !advice && (
          <div className="text-center py-2">
            <button
              onClick={onToggleMonitoring}
              className="text-sm text-blue-600 hover:text-blue-800 underline"
            >
              監視を開始
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default AdvicePanel;
