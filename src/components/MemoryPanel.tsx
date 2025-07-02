import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FaBrain, FaHistory, FaSearch, FaSave, FaTrash, FaDownload, FaUpload, FaTags } from 'react-icons/fa';
import { useUserMemory } from '../hooks/useUserMemory';
import toast from 'react-hot-toast';

interface MemoryPanelProps {
  isVisible: boolean;
  onClose: () => void;
}

export const MemoryPanel: React.FC<MemoryPanelProps> = ({ isVisible, onClose }) => {
  const {
    recentMemories,
    suggestions,
    searchMemories,
    saveMemory,
    exportUserData,
    importUserData,
    refreshRecentMemories,
  } = useUserMemory();

  const [activeTab, setActiveTab] = useState<'memories' | 'patterns' | 'settings'>('memories');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // 新規メモリー作成用
  const [showNewMemory, setShowNewMemory] = useState(false);
  const [newMemoryType, setNewMemoryType] = useState<'note' | 'project' | 'knowledge'>('note');
  const [newMemoryTitle, setNewMemoryTitle] = useState('');
  const [newMemoryContent, setNewMemoryContent] = useState('');
  const [newMemoryTags, setNewMemoryTags] = useState('');

  // 検索実行
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    try {
      const results = await searchMemories(searchQuery, 20);
      setSearchResults(results);
    } catch (error) {
      toast.error('検索中にエラーが発生しました');
    } finally {
      setIsSearching(false);
    }
  };

  // 新規メモリー保存
  const handleSaveMemory = async () => {
    if (!newMemoryTitle.trim() || !newMemoryContent.trim()) {
      toast.error('タイトルと内容を入力してください');
      return;
    }

    const tags = newMemoryTags.split(',').map(tag => tag.trim()).filter(tag => tag);
    
    const success = await saveMemory(
      newMemoryType,
      newMemoryTitle,
      newMemoryContent,
      tags,
      0.8, // 重要度
      []
    );

    if (success) {
      toast.success('メモリーを保存しました');
      setShowNewMemory(false);
      setNewMemoryTitle('');
      setNewMemoryContent('');
      setNewMemoryTags('');
      await refreshRecentMemories();
    } else {
      toast.error('メモリーの保存に失敗しました');
    }
  };

  // データエクスポート
  const handleExport = async () => {
    try {
      const data = await exportUserData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `openclue-memory-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('データをエクスポートしました');
    } catch (error) {
      toast.error('エクスポートに失敗しました');
    }
  };

  // データインポート
  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const success = await importUserData(data);
      
      if (success) {
        toast.success('データをインポートしました');
        await refreshRecentMemories();
      } else {
        toast.error('インポートに失敗しました');
      }
    } catch (error) {
      toast.error('無効なファイル形式です');
    }
  };

  useEffect(() => {
    if (searchQuery === '') {
      setSearchResults([]);
    }
  }, [searchQuery]);

  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, x: 300 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 300 }}
      className="fixed right-0 top-0 h-full w-96 bg-gray-900 text-white shadow-xl z-50 overflow-hidden"
    >
      <div className="p-4 border-b border-gray-700 flex justify-between items-center">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <FaBrain /> ユーザーメモリー
        </h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors"
        >
          ✕
        </button>
      </div>

      <div className="p-4 border-b border-gray-700">
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setActiveTab('memories')}
            className={`px-4 py-2 rounded ${
              activeTab === 'memories' ? 'bg-blue-600' : 'bg-gray-700'
            } hover:bg-blue-500 transition-colors`}
          >
            記憶
          </button>
          <button
            onClick={() => setActiveTab('patterns')}
            className={`px-4 py-2 rounded ${
              activeTab === 'patterns' ? 'bg-blue-600' : 'bg-gray-700'
            } hover:bg-blue-500 transition-colors`}
          >
            パターン
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 rounded ${
              activeTab === 'settings' ? 'bg-blue-600' : 'bg-gray-700'
            } hover:bg-blue-500 transition-colors`}
          >
            設定
          </button>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="記憶を検索..."
            className="flex-1 px-3 py-2 bg-gray-800 rounded text-white placeholder-gray-400"
          />
          <button
            onClick={handleSearch}
            disabled={isSearching}
            className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-500 transition-colors disabled:opacity-50"
          >
            <FaSearch />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'memories' && (
          <div>
            <div className="mb-4 flex justify-between items-center">
              <h3 className="text-lg font-semibold">最近の記憶</h3>
              <button
                onClick={() => setShowNewMemory(!showNewMemory)}
                className="px-3 py-1 bg-green-600 rounded text-sm hover:bg-green-500 transition-colors"
              >
                <FaSave className="inline mr-1" /> 新規作成
              </button>
            </div>

            {showNewMemory && (
              <div className="mb-4 p-4 bg-gray-800 rounded">
                <select
                  value={newMemoryType}
                  onChange={(e) => setNewMemoryType(e.target.value as any)}
                  className="w-full mb-2 px-3 py-2 bg-gray-700 rounded text-white"
                >
                  <option value="note">ノート</option>
                  <option value="project">プロジェクト</option>
                  <option value="knowledge">知識</option>
                </select>
                <input
                  type="text"
                  value={newMemoryTitle}
                  onChange={(e) => setNewMemoryTitle(e.target.value)}
                  placeholder="タイトル"
                  className="w-full mb-2 px-3 py-2 bg-gray-700 rounded text-white placeholder-gray-400"
                />
                <textarea
                  value={newMemoryContent}
                  onChange={(e) => setNewMemoryContent(e.target.value)}
                  placeholder="内容"
                  className="w-full mb-2 px-3 py-2 bg-gray-700 rounded text-white placeholder-gray-400 h-24"
                />
                <input
                  type="text"
                  value={newMemoryTags}
                  onChange={(e) => setNewMemoryTags(e.target.value)}
                  placeholder="タグ (カンマ区切り)"
                  className="w-full mb-2 px-3 py-2 bg-gray-700 rounded text-white placeholder-gray-400"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveMemory}
                    className="px-4 py-2 bg-green-600 rounded hover:bg-green-500 transition-colors"
                  >
                    保存
                  </button>
                  <button
                    onClick={() => setShowNewMemory(false)}
                    className="px-4 py-2 bg-gray-600 rounded hover:bg-gray-500 transition-colors"
                  >
                    キャンセル
                  </button>
                </div>
              </div>
            )}

            {searchQuery && searchResults.length > 0 ? (
              <div>
                <h4 className="text-sm text-gray-400 mb-2">検索結果</h4>
                {searchResults.map((memory) => (
                  <MemoryCard key={memory.id} memory={memory} />
                ))}
              </div>
            ) : (
              <div>
                {recentMemories.map((memory) => (
                  <MemoryCard key={memory.id} memory={memory} />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'patterns' && (
          <div>
            <h3 className="text-lg font-semibold mb-4">AI の提案</h3>
            {suggestions.length > 0 ? (
              <div className="space-y-2">
                {suggestions.map((suggestion, index) => (
                  <div
                    key={index}
                    className="p-3 bg-gray-800 rounded flex items-start gap-2"
                  >
                    <span className="text-blue-400">💡</span>
                    <span className="text-sm">{suggestion}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-sm">
                使用を続けると、AIがあなたの作業パターンを学習し、提案を表示します。
              </p>
            )}
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">データ管理</h3>
              <div className="space-y-2">
                <button
                  onClick={handleExport}
                  className="w-full px-4 py-2 bg-gray-700 rounded hover:bg-gray-600 transition-colors flex items-center gap-2"
                >
                  <FaDownload /> データをエクスポート
                </button>
                <label className="w-full px-4 py-2 bg-gray-700 rounded hover:bg-gray-600 transition-colors flex items-center gap-2 cursor-pointer">
                  <FaUpload /> データをインポート
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImport}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">プライバシー</h3>
              <p className="text-sm text-gray-400 mb-2">
                すべてのデータはローカルに保存され、外部に送信されることはありません。
              </p>
              <button
                onClick={async () => {
                  if (window.confirm('すべての記憶データを削除しますか？この操作は取り消せません。')) {
                    await window.electron.store.clear();
                    toast.success('すべてのデータを削除しました');
                    await refreshRecentMemories();
                  }
                }}
                className="px-4 py-2 bg-red-600 rounded hover:bg-red-500 transition-colors flex items-center gap-2"
              >
                <FaTrash /> すべてのデータを削除
              </button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

// メモリーカードコンポーネント
const MemoryCard: React.FC<{ memory: any }> = ({ memory }) => {
  const typeColors = {
    note: 'bg-blue-900',
    project: 'bg-green-900',
    knowledge: 'bg-purple-900',
    preference: 'bg-yellow-900',
    pattern: 'bg-red-900',
  };

  return (
    <div className={`mb-3 p-3 rounded ${typeColors[memory.type] || 'bg-gray-800'}`}>
      <div className="flex justify-between items-start mb-1">
        <h4 className="font-semibold">{memory.title}</h4>
        <span className="text-xs text-gray-400">
          {new Date(memory.updatedAt).toLocaleDateString()}
        </span>
      </div>
      <p className="text-sm text-gray-300 mb-2 line-clamp-2">{memory.content}</p>
      {memory.tags && memory.tags.length > 0 && (
        <div className="flex gap-1 flex-wrap">
          {memory.tags.map((tag: string, index: number) => (
            <span
              key={index}
              className="text-xs px-2 py-1 bg-gray-700 rounded"
            >
              <FaTags className="inline mr-1" size={10} />
              {tag}
            </span>
          ))}
        </div>
      )}
      <div className="mt-2 text-xs text-gray-400">
        アクセス: {memory.accessCount}回 | 
        関連度: {(memory.relevanceScore * 100).toFixed(0)}%
      </div>
    </div>
  );
};