import React, { useState, useRef, useEffect } from "react";
import {
  FaEye,
  FaEyeSlash,
  FaCog,
  FaTimes,
  FaWindowMinimize,
  FaQuestion,
  FaBrain,
} from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";

interface HeaderProps {
  onSettingsClick: () => void;
  isMonitoring: boolean;
  onToggleMonitoring: () => void;
  onMemoryClick?: () => void;
}

interface ShortcutInfo {
  description: string;
  keys: string[];
}

const Header: React.FC<HeaderProps> = ({
  onSettingsClick,
  isMonitoring,
  onToggleMonitoring,
  onMemoryClick,
}) => {
  const [showShortcuts, setShowShortcuts] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const { t, i18n } = useTranslation();

  // プラットフォーム別のキー表示
  const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
  const cmdKey = isMac ? "⌘" : "Ctrl";

  const shortcuts: Record<string, ShortcutInfo> = {
    toggleWindow: {
      description: t("shortcut.toggleWindow"),
      keys: [cmdKey, "B"],
    },
    screenshot: {
      description: t("shortcut.screenshot"),
      keys: [cmdKey, "H"],
    },
    getSolution: {
      description: t("shortcut.getSolution"),
      keys: [cmdKey, "↵"],
    },
    toggleMonitoring: {
      description: t("shortcut.toggleMonitoring"),
      keys: [cmdKey, "M"],
    },
    moveUp: {
      description: t("shortcut.moveUp"),
      keys: [cmdKey, "↑"],
    },
    moveDown: {
      description: t("shortcut.moveDown"),
      keys: [cmdKey, "↓"],
    },
    moveLeft: {
      description: t("shortcut.moveLeft"),
      keys: [cmdKey, "←"],
    },
    moveRight: {
      description: t("shortcut.moveRight"),
      keys: [cmdKey, "→"],
    },
    quit: {
      description: t("shortcut.quit"),
      keys: [cmdKey, "Q"],
    },
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        tooltipRef.current &&
        !tooltipRef.current.contains(event.target as Node)
      ) {
        setShowShortcuts(false);
      }
    };

    if (showShortcuts) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showShortcuts]);

  return (
    <header className="relative flex items-center justify-between px-4 pt-4 pb-2">
      {/* ロゴ部分 */}
      <div className="flex items-center gap-2">
        <h1 className="text-sm font-bold text-gray-800">{t("appName")}</h1>
        <span className="text-xs text-gray-600">{t("version")}</span>
      </div>

      {/* 言語切替UI */}
      <div className="flex items-center gap-2">
        <button
          className={`px-2 py-1 rounded text-xs font-bold ${i18n.language === "ja" ? "bg-blue-200" : "bg-gray-100"}`}
          onClick={() => i18n.changeLanguage("ja")}
        >
          日本語
        </button>
        <button
          className={`px-2 py-1 rounded text-xs font-bold ${i18n.language === "en" ? "bg-blue-200" : "bg-gray-100"}`}
          onClick={() => i18n.changeLanguage("en")}
        >
          English
        </button>
      </div>

      {/* コントロールボタン */}
      <div className="no-drag flex items-center gap-2">
        {/* 設定ボタン */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={onSettingsClick}
          className="p-2 rounded-lg bg-gray-500/20 hover:bg-gray-500/30 text-gray-700 transition-colors"
          title={t("settings")}
        >
          <FaCog className="w-4 h-4" />
        </motion.button>

        {/* メモリボタン */}
        {onMemoryClick && (
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={onMemoryClick}
            className="p-2 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-700 transition-colors"
            title={t("memory")}
          >
            <FaBrain className="w-4 h-4" />
          </motion.button>
        )}

        {/* ショートカットヘルプボタン */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowShortcuts(!showShortcuts)}
          className="p-2 rounded-lg bg-gray-500/20 hover:bg-gray-500/30 text-gray-700 transition-colors"
          title={t("shortcuts")}
        >
          <FaQuestion className="w-4 h-4" />
        </motion.button>

        {/* 最小化ボタン */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => window.electron?.minimize()}
          className="p-2 rounded-lg bg-gray-500/20 hover:bg-gray-500/30 text-gray-700 transition-colors"
          title={t("minimize")}
        >
          <FaWindowMinimize className="w-4 h-4" />
        </motion.button>

        {/* 閉じるボタン */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => window.electron?.close()}
          className="p-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-700 transition-colors"
          title={t("close")}
        >
          <FaTimes className="w-4 h-4" />
        </motion.button>
      </div>

      {/* ショートカ��ト一覧ツールチップ */}
      <AnimatePresence>
        {showShortcuts && (
          <motion.div
            ref={tooltipRef}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full right-0 mt-2 w-80 z-50"
          >
            <div className="bg-white/95 backdrop-blur-md rounded-lg shadow-lg border border-gray-200 p-4">
              <h3 className="font-semibold text-gray-800 mb-3">
                {t("shortcutsTitle")}
              </h3>
              <div className="space-y-2 text-sm">
                {Object.entries(shortcuts).map(([key, info]) => (
                  <div
                    key={key}
                    className="flex items-center justify-between py-1"
                  >
                    <span className="text-gray-600">{info.description}</span>
                    <div className="flex gap-1">
                      {info.keys.map((k, i) => (
                        <span
                          key={i}
                          className="bg-gray-100 px-2 py-1 rounded text-xs font-mono text-gray-700"
                        >
                          {k}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Header;
