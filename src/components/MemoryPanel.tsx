import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  FaBrain,
  FaHistory,
  FaSearch,
  FaSave,
  FaTrash,
  FaDownload,
  FaUpload,
  FaTags,
  FaCog,
  FaChartBar,
  FaEdit,
} from "react-icons/fa";
import { useUserMemory } from "../hooks/useUserMemory";
import { AdvancedSearchFilters } from "./AdvancedSearchFilters";
import { TagManager } from "./TagManager";
import toast from "react-hot-toast";

interface MemoryPanelProps {
  isVisible: boolean;
  onClose: () => void;
}

export const MemoryPanel: React.FC<MemoryPanelProps> = ({
  isVisible,
  onClose,
}) => {
  const {
    recentMemories,
    suggestions,
    searchMemories,
    searchMemoriesImmediate,
    saveMemory,
    exportUserData,
    importUserData,
    refreshRecentMemories,
    allTags,
    getAllTags,
    mergeTags,
    removeTag,
    updateMemory,
    deleteMemory,
    memoryStats,
    getMemoryStats,
    searchHistory,
    isSearching: hookIsSearching,
  } = useUserMemory();

  const [activeTab, setActiveTab] = useState<
    "memories" | "patterns" | "settings" | "stats"
  >("memories");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchFilters, setSearchFilters] = useState<any>({});
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [showTagManager, setShowTagManager] = useState(false);

  // 新規メモリー作成用
  const [showNewMemory, setShowNewMemory] = useState(false);
  const [newMemoryType, setNewMemoryType] = useState<
    "note" | "project" | "knowledge"
  >("note");
  const [newMemoryTitle, setNewMemoryTitle] = useState("");
  const [newMemoryContent, setNewMemoryContent] = useState("");
  const [newMemoryTags, setNewMemoryTags] = useState("");

  // 編集用
  const [editingMemory, setEditingMemory] = useState<any>(null);
  const [quickSearch, setQuickSearch] = useState("");

  // 検索実行（フィルタ対応）
  const handleSearch = async (
    query: string = searchQuery,
    immediate: boolean = false,
  ) => {
    if (!query.trim() && Object.keys(searchFilters).length === 0) {
      setSearchResults([]);
      return;
    }

    try {
      const searchFn = immediate ? searchMemoriesImmediate : searchMemories;
      const results = await searchFn(query, 50, searchFilters);
      setSearchResults(results);
    } catch (error) {
      toast.error("検索中にエラーが発生しました");
    }
  };

  // クイック検索（リアルタイム）
  const handleQuickSearch = async (query: string) => {
    setQuickSearch(query);
    if (query.trim()) {
      await handleSearch(query, false);
    } else {
      setSearchResults([]);
    }
  };

  // 新規メモリー保存
  const handleSaveMemory = async () => {
    if (!newMemoryTitle.trim() || !newMemoryContent.trim()) {
      toast.error("タイトルと内容を入力してください");
      return;
    }

    const tags = newMemoryTags
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag);

    const success = await saveMemory(
      newMemoryType,
      newMemoryTitle,
      newMemoryContent,
      tags,
      0.8, // 重要度
      [],
    );

    if (success) {
      toast.success("メモリーを保存しました");
      setShowNewMemory(false);
      setNewMemoryTitle("");
      setNewMemoryContent("");
      setNewMemoryTags("");
      await refreshRecentMemories();
      await getAllTags();
    } else {
      toast.error("メモリーの保存に失敗しました");
    }
  };

  // メモリー編集
  const handleEditMemory = async (memory: any) => {
    setEditingMemory({ ...memory });
  };

  const handleUpdateMemory = async () => {
    if (
      !editingMemory ||
      !editingMemory.title.trim() ||
      !editingMemory.content.trim()
    ) {
      toast.error("タイトルと内容を入力してください");
      return;
    }

    const success = await updateMemory(editingMemory.id, {
      title: editingMemory.title,
      content: editingMemory.content,
      tags: editingMemory.tags,
      type: editingMemory.type,
    });

    if (success) {
      toast.success("メモリーを更新しました");
      setEditingMemory(null);
      await refreshRecentMemories();
      await getAllTags();
      if (searchQuery || quickSearch) {
        await handleSearch();
      }
    } else {
      toast.error("メモリーの更新に失敗しました");
    }
  };

  // メモリー削除
  const handleDeleteMemory = async (memory: any) => {
    if (
      !confirm(`"${memory.title}" を削除しますか？この操作は取り消せません。`)
    ) {
      return;
    }

    const success = await deleteMemory(memory.id);
    if (success) {
      toast.success("メモリーを削除しました");
      await refreshRecentMemories();
      await getAllTags();
      if (searchQuery || quickSearch) {
        await handleSearch();
      }
    } else {
      toast.error("メモリーの削除に失敗しました");
    }
  };

  // データエクスポート
  const handleExport = async () => {
    try {
      const data = await exportUserData();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `openclue-memory-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("データをエクスポートしました");
    } catch (error) {
      toast.error("エクスポートに失敗しました");
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
        toast.success("データをインポートしました");
        await refreshRecentMemories();
      } else {
        toast.error("インポートに失敗しました");
      }
    } catch (error) {
      toast.error("無効なファイル形式です");
    }
  };

  // フィルタ変更時に検索を再実行
  useEffect(() => {
    if (searchQuery || Object.keys(searchFilters).length > 0) {
      handleSearch();
    }
  }, [searchFilters]);

  // 検索クエリが空になったら結果をクリア
  useEffect(() => {
    if (
      !searchQuery &&
      !quickSearch &&
      Object.keys(searchFilters).length === 0
    ) {
      setSearchResults([]);
    }
  }, [searchQuery, quickSearch, searchFilters]);

  // 統計データの初期読み込み
  useEffect(() => {
    if (isVisible) {
      getMemoryStats();
    }
  }, [isVisible]);

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
        <div className="flex gap-1 mb-4 overflow-x-auto">
          <button
            onClick={() => setActiveTab("memories")}
            className={`px-3 py-2 rounded text-sm whitespace-nowrap ${
              activeTab === "memories" ? "bg-blue-600" : "bg-gray-700"
            } hover:bg-blue-500 transition-colors`}
          >
            記憶
          </button>
          <button
            onClick={() => setActiveTab("patterns")}
            className={`px-3 py-2 rounded text-sm whitespace-nowrap ${
              activeTab === "patterns" ? "bg-blue-600" : "bg-gray-700"
            } hover:bg-blue-500 transition-colors`}
          >
            パターン
          </button>
          <button
            onClick={() => setActiveTab("stats")}
            className={`px-3 py-2 rounded text-sm whitespace-nowrap ${
              activeTab === "stats" ? "bg-blue-600" : "bg-gray-700"
            } hover:bg-blue-500 transition-colors`}
          >
            統計
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className={`px-3 py-2 rounded text-sm whitespace-nowrap ${
              activeTab === "settings" ? "bg-blue-600" : "bg-gray-700"
            } hover:bg-blue-500 transition-colors`}
          >
            設定
          </button>
        </div>

        {/* メイン検索 */}
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSearch()}
            placeholder="記憶を検索..."
            className="flex-1 px-3 py-2 bg-gray-800 rounded text-white placeholder-gray-400"
          />
          <button
            onClick={() => handleSearch()}
            disabled={hookIsSearching}
            className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-500 transition-colors disabled:opacity-50"
          >
            <FaSearch />
          </button>
        </div>

        {/* クイック検索とフィルタ */}
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={quickSearch}
            onChange={(e) => handleQuickSearch(e.target.value)}
            placeholder="クイック検索..."
            className="flex-1 px-2 py-1 bg-gray-700 rounded text-sm text-white placeholder-gray-400"
          />
          <AdvancedSearchFilters
            filters={searchFilters}
            onFiltersChange={setSearchFilters}
            availableTags={allTags}
            isVisible={showAdvancedFilters}
            onToggle={() => setShowAdvancedFilters(!showAdvancedFilters)}
          />
        </div>

        {/* 検索履歴 */}
        {searchHistory.length > 0 && (
          <div className="mb-2">
            <div className="text-xs text-gray-400 mb-1">最近の検索:</div>
            <div className="flex gap-1 flex-wrap">
              {searchHistory.slice(0, 5).map((query, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setSearchQuery(query);
                    handleSearch(query);
                  }}
                  className="px-2 py-1 bg-gray-700 text-xs rounded hover:bg-gray-600 transition-colors"
                >
                  {query}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === "memories" && (
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

            {searchQuery || quickSearch || searchResults.length > 0 ? (
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-sm text-gray-400">
                    検索結果 ({searchResults.length}件)
                    {hookIsSearching && <span className="ml-2">🔍</span>}
                  </h4>
                  {searchResults.length > 0 && (
                    <button
                      onClick={() => {
                        setSearchQuery("");
                        setQuickSearch("");
                        setSearchResults([]);
                      }}
                      className="text-xs text-gray-500 hover:text-gray-300"
                    >
                      クリア
                    </button>
                  )}
                </div>
                {searchResults.map((memory) => (
                  <MemoryCard
                    key={memory.id}
                    memory={memory}
                    onEdit={handleEditMemory}
                    onDelete={handleDeleteMemory}
                  />
                ))}
                {searchResults.length === 0 &&
                  !hookIsSearching &&
                  (searchQuery || quickSearch) && (
                    <div className="text-center text-gray-400 py-4">
                      <FaSearch className="mx-auto mb-2" />
                      <p>検索結果が見つかりませんでした</p>
                    </div>
                  )}
              </div>
            ) : (
              <div>
                <h4 className="text-sm text-gray-400 mb-2">最近の記憶</h4>
                {recentMemories.map((memory) => (
                  <MemoryCard
                    key={memory.id}
                    memory={memory}
                    onEdit={handleEditMemory}
                    onDelete={handleDeleteMemory}
                  />
                ))}
                {recentMemories.length === 0 && (
                  <div className="text-center text-gray-400 py-4">
                    <FaBrain className="mx-auto mb-2" />
                    <p>まだ記憶がありません</p>
                    <p className="text-xs">
                      新規作成ボタンから記憶を追加してください
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === "patterns" && (
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

        {activeTab === "stats" && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <FaChartBar /> 統計情報
            </h3>

            {memoryStats && (
              <div className="space-y-4">
                {/* 概要統計 */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-700 p-3 rounded">
                    <div className="text-2xl font-bold">
                      {memoryStats.totalMemories}
                    </div>
                    <div className="text-sm text-gray-400">総記憶数</div>
                  </div>
                  <div className="bg-gray-700 p-3 rounded">
                    <div className="text-2xl font-bold">
                      {memoryStats.totalTags}
                    </div>
                    <div className="text-sm text-gray-400">総タグ数</div>
                  </div>
                  <div className="bg-gray-700 p-3 rounded">
                    <div className="text-2xl font-bold">
                      {Math.round(memoryStats.averageRelevance * 100)}%
                    </div>
                    <div className="text-sm text-gray-400">平均関連度</div>
                  </div>
                  <div className="bg-gray-700 p-3 rounded">
                    <div className="text-2xl font-bold">
                      {memoryStats.mostAccessedMemory?.accessCount || 0}
                    </div>
                    <div className="text-sm text-gray-400">最高アクセス数</div>
                  </div>
                </div>

                {/* タイプ別統計 */}
                <div>
                  <h4 className="font-semibold mb-2">タイプ別分布</h4>
                  <div className="space-y-2">
                    {Object.entries(memoryStats.memoryTypes).map(
                      ([type, count]: [string, any]) => (
                        <div
                          key={type}
                          className="flex justify-between items-center bg-gray-700 p-2 rounded"
                        >
                          <span className="capitalize">{type}</span>
                          <span className="bg-blue-600 px-2 py-1 rounded text-sm">
                            {count}
                          </span>
                        </div>
                      ),
                    )}
                  </div>
                </div>

                {/* 最もアクセスされた記憶 */}
                {memoryStats.mostAccessedMemory && (
                  <div>
                    <h4 className="font-semibold mb-2">
                      最もアクセスされた記憶
                    </h4>
                    <MemoryCard
                      memory={memoryStats.mostAccessedMemory}
                      onEdit={handleEditMemory}
                      onDelete={handleDeleteMemory}
                    />
                  </div>
                )}

                {/* タグ管理ボタン */}
                <button
                  onClick={() => setShowTagManager(true)}
                  className="w-full px-4 py-2 bg-purple-600 rounded hover:bg-purple-500 transition-colors flex items-center justify-center gap-2"
                >
                  <FaTags /> タグ管理
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === "settings" && (
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
                  if (
                    window.confirm(
                      "すべての記憶データを削除しますか？この操作は取り消せません。",
                    )
                  ) {
                    await window.electron.store.clear();
                    toast.success("すべてのデータを削除しました");
                    await refreshRecentMemories();
                    await getAllTags();
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

      {/* タグマネージャー */}
      <TagManager
        tags={allTags}
        onMergeTags={mergeTags}
        onRemoveTag={removeTag}
        onRefresh={getAllTags}
        isVisible={showTagManager}
        onClose={() => setShowTagManager(false)}
      />

      {/* 編集ダイアログ */}
      {editingMemory && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10"
        >
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            className="bg-gray-800 rounded-lg p-4 w-80 max-h-[80vh] overflow-y-auto"
          >
            <h4 className="text-lg font-bold mb-4">メモリーを編集</h4>

            <select
              value={editingMemory.type}
              onChange={(e) =>
                setEditingMemory({ ...editingMemory, type: e.target.value })
              }
              className="w-full mb-2 px-3 py-2 bg-gray-700 rounded text-white"
            >
              <option value="note">ノート</option>
              <option value="project">プロジェクト</option>
              <option value="knowledge">知識</option>
              <option value="preference">設定</option>
              <option value="pattern">パターン</option>
            </select>

            <input
              type="text"
              value={editingMemory.title}
              onChange={(e) =>
                setEditingMemory({ ...editingMemory, title: e.target.value })
              }
              placeholder="タイトル"
              className="w-full mb-2 px-3 py-2 bg-gray-700 rounded text-white placeholder-gray-400"
            />

            <textarea
              value={editingMemory.content}
              onChange={(e) =>
                setEditingMemory({ ...editingMemory, content: e.target.value })
              }
              placeholder="内容"
              className="w-full mb-2 px-3 py-2 bg-gray-700 rounded text-white placeholder-gray-400 h-32"
            />

            <input
              type="text"
              value={editingMemory.tags.join(", ")}
              onChange={(e) =>
                setEditingMemory({
                  ...editingMemory,
                  tags: e.target.value
                    .split(",")
                    .map((tag) => tag.trim())
                    .filter((tag) => tag),
                })
              }
              placeholder="タグ (カンマ区切り)"
              className="w-full mb-4 px-3 py-2 bg-gray-700 rounded text-white placeholder-gray-400"
            />

            <div className="flex gap-2">
              <button
                onClick={handleUpdateMemory}
                className="flex-1 py-2 bg-green-600 rounded hover:bg-green-500 transition-colors"
              >
                更新
              </button>
              <button
                onClick={() => setEditingMemory(null)}
                className="flex-1 py-2 bg-gray-600 rounded hover:bg-gray-500 transition-colors"
              >
                キャンセル
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
};

// メモリーカードコンポーネント
const MemoryCard: React.FC<{
  memory: any;
  onEdit?: (memory: any) => void;
  onDelete?: (memory: any) => void;
}> = ({ memory, onEdit, onDelete }) => {
  const typeColors = {
    note: "bg-blue-900",
    project: "bg-green-900",
    knowledge: "bg-purple-900",
    preference: "bg-yellow-900",
    pattern: "bg-red-900",
  };

  return (
    <div
      className={`mb-3 p-3 rounded ${typeColors[memory.type] || "bg-gray-800"} relative group`}
    >
      <div className="flex justify-between items-start mb-1">
        <h4 className="font-semibold">{memory.title}</h4>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">
            {new Date(memory.updatedAt).toLocaleDateString()}
          </span>
          {onEdit && onDelete && (
            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
              <button
                onClick={() => onEdit(memory)}
                className="p-1 bg-blue-600 rounded hover:bg-blue-500 transition-colors"
                title="編集"
              >
                <FaEdit size={12} />
              </button>
              <button
                onClick={() => onDelete(memory)}
                className="p-1 bg-red-600 rounded hover:bg-red-500 transition-colors"
                title="削除"
              >
                <FaTrash size={12} />
              </button>
            </div>
          )}
        </div>
      </div>
      <p className="text-sm text-gray-300 mb-2 line-clamp-2">
        {memory.content}
      </p>
      {memory.tags && memory.tags.length > 0 && (
        <div className="flex gap-1 flex-wrap mb-2">
          {memory.tags.map((tag: string, index: number) => (
            <span key={index} className="text-xs px-2 py-1 bg-gray-700 rounded">
              <FaTags className="inline mr-1" size={10} />
              {tag}
            </span>
          ))}
        </div>
      )}
      <div className="text-xs text-gray-400">
        アクセス: {memory.accessCount}回 | 関連度:{" "}
        {(memory.relevanceScore * 100).toFixed(0)}%
      </div>
    </div>
  );
};
