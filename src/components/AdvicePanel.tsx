import React from "react";
import { motion } from "framer-motion";
import {
  FaSync,
  FaTrash,
  FaEye,
  FaEyeSlash,
  FaClock,
  FaLightbulb,
  FaBrain,
  FaQuestion,
} from "react-icons/fa";
import { useTranslation } from "react-i18next";

interface AdvicePanelProps {
  advice: string | null;
  isMonitoring: boolean;
  onClear: () => void;
  onToggleMonitoring: () => void;
  suggestions?: string[];
}

const AdvicePanel: React.FC<AdvicePanelProps> = ({
  advice,
  isMonitoring,
  onClear,
  onToggleMonitoring,
  suggestions = [],
}) => {
  const { t } = useTranslation();
  if (!advice && suggestions.length === 0) {
    return null;
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("ja-JP", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
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
              <FaQuestion className="w-4 h-4" />
              <span>AIアシスタント</span>
            </h3>
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
                  title={t("advicePanel.clear")}
                >
                  <FaTrash className="w-3 h-3 text-gray-500" />
                </button>
              </>
            )}
          </div>
        </div>

        {advice && (
          <div className="text-sm text-gray-700 leading-relaxed">{advice}</div>
        )}

        {/* AI提案セクション */}
        {suggestions.length > 0 && (
          <div className="mt-3 pt-3 border-t border-blue-200">
            <h4 className="text-xs font-semibold text-purple-700 mb-2 flex items-center gap-1">
              <FaBrain className="w-3 h-3" />
              AIの提案
            </h4>
            <div className="space-y-1">
              {suggestions.map((suggestion, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-start gap-2"
                >
                  <FaLightbulb className="w-3 h-3 text-yellow-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-gray-600">{suggestion}</p>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default AdvicePanel;
