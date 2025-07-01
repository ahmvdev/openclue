import React, { useState, useRef, useEffect } from 'react';
import { FaEye, FaEyeSlash, FaCog, FaTimes, FaWindowMinimize, FaQuestion } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';

interface HeaderProps {
  onSettingsClick: () => void;
  isMonitoring: boolean;
  onToggleMonitoring: () => void;
}

interface ShortcutInfo {
  description: string;
  keys: string[];
}

const Header: React.FC<HeaderProps> = ({ onSettingsClick, isMonitoring, onToggleMonitoring }) => {
  const [showShortcuts, setShowShortcuts] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // プラットフォーム別のキー表示
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const cmdKey = isMac ? '⌘' : 'Ctrl';

  const shortcuts: Record<string, ShortcutInfo> = {
    toggleWindow: {
      description: 'ウィンドウの表示/非表示',
      keys: [cmdKey, 'B']
    },
    screenshot: {
      description: 'スクリーンショットを撮る',
      keys: [cmdKey, 'H']
    },
    getSolution: {
      description: '解決策を取得',
      keys: [cmdKey, '↵']
    },
    toggleMonitoring: {
      description: '画面監視の切り替え',
      keys: [cmdKey, 'M']
    },
    moveUp: {
      description: '上に移動',
      keys: [cmdKey, '↑']
    },
    moveDown: {
      description: '下に移動',
      keys: [cmdKey, '↓']
    },
    moveLeft: {
      description: '左に移動',
      keys: [cmdKey, '←']
    },
    moveRight: {
      description: '右に移動',
      keys: [cmdKey, '→']
    },
    quit: {
      description: 'アプリを終了',
      keys: [cmdKey, 'Q']
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (tooltipRef.current && !tooltipRef.current.contains(event.target as Node)) {
        setShowShortcuts(false);
      }
    };

    if (showShortcuts) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showShortcuts]);

  return (
    <header className="relative flex items-center justify-between px-4 pt-4 pb-2">
      {/* ロゴ部分 */}
      <div className="flex items-center gap-2">
        <h1 className="text-sm font-bold text-gray-800">OpenClue Kai</h1>
        <span className="text-xs text-gray-600">v1.0.0</span>
      </div>

      {/* コントロールボタン */}
      <div className="no-drag flex items-center gap-2">
        {/* 監視トグルボタン */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={onToggleMonitoring}
          className={`p-2 rounded-lg transition-colors ${
            isMonitoring 
              ? 'bg-green-500/20 hover:bg-green-500/30 text-green-700' 
              : 'bg-gray-500/20 hover:bg-gray-500/30 text-gray-700'
          }`}
          title={isMonitoring ? '監視を停止' : '監視を開始'}
        >
          {isMonitoring ? <FaEye className="w-4 h-4" /> : <FaEyeSlash className="w-4 h-4" />}
        </motion.button>

        {/* 設定ボタン */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={onSettingsClick}
          className="p-2 rounded-lg bg-gray-500/20 hover:bg-gray-500/30 text-gray-700 transition-colors"
          title="設定"
        >
          <FaCog className="w-4 h-4" />
        </motion.button>

        {/* ショートカットヘルプボタン */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowShortcuts(!showShortcuts)}
          className="p-2 rounded-lg bg-gray-500/20 hover:bg-gray-500/30 text-gray-700 transition-colors"
          title="ショートカット一覧"
        >
          <FaQuestion className="w-4 h-4" />
        </motion.button>

        {/* 最小化ボタン */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => window.electron?.minimize()}
          className="p-2 rounded-lg bg-gray-500/20 hover:bg-gray-500/30 text-gray-700 transition-colors"
          title="最小化"
        >
          <FaWindowMinimize className="w-4 h-4" />
        </motion.button>

        {/* 閉じるボタン */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => window.electron?.close()}
          className="p-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-700 transition-colors"
          title="閉じる"
        >
          <FaTimes className="w-4 h-4" />
        </motion.button>
      </div>

      {/* ショートカット一覧ツールチップ */}
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
              <h3 className="font-semibold text-gray-800 mb-3">ショートカット一覧</h3>
              <div className="space-y-2 text-sm">
                {Object.entries(shortcuts).map(([key, info]) => (
                  <div key={key} className="flex items-center justify-between py-1">
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
