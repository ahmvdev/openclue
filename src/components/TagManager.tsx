import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaTags,
  FaEdit,
  FaTrash,
  FaCodeBranch,
  FaSearch,
  FaPlus,
} from "react-icons/fa";
import toast from "react-hot-toast";

interface TagManagerProps {
  tags: { tag: string; count: number }[];
  onMergeTags: (oldTag: string, newTag: string) => Promise<boolean>;
  onRemoveTag: (tag: string) => Promise<boolean>;
  onRefresh: () => void;
  isVisible: boolean;
  onClose: () => void;
}

export const TagManager: React.FC<TagManagerProps> = ({
  tags,
  onMergeTags,
  onRemoveTag,
  onRefresh,
  isVisible,
  onClose,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [mergeTarget, setMergeTarget] = useState("");
  const [showMergeDialog, setShowMergeDialog] = useState(false);

  const filteredTags = tags.filter(({ tag }) =>
    tag.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleTagSelect = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const handleMergeTags = async () => {
    if (selectedTags.length < 2 || !mergeTarget.trim()) {
      toast.error("統合するタグを複数選択し、統合先タグ名を入力してください");
      return;
    }

    try {
      let success = true;
      for (const tag of selectedTags) {
        if (tag !== mergeTarget) {
          const result = await onMergeTags(tag, mergeTarget);
          if (!result) success = false;
        }
      }

      if (success) {
        toast.success(
          `${selectedTags.length}個のタグを "${mergeTarget}" に統合しました`,
        );
        setSelectedTags([]);
        setMergeTarget("");
        setShowMergeDialog(false);
        onRefresh();
      } else {
        toast.error("一部のタグの統合に失敗しました");
      }
    } catch (error) {
      toast.error("タグの統合中にエラーが発生しました");
    }
  };

  const handleRemoveTags = async () => {
    if (selectedTags.length === 0) {
      toast.error("削除するタグを選択してください");
      return;
    }

    if (!confirm(`選択した${selectedTags.length}個のタグを削除しますか？`)) {
      return;
    }

    try {
      let success = true;
      for (const tag of selectedTags) {
        const result = await onRemoveTag(tag);
        if (!result) success = false;
      }

      if (success) {
        toast.success(`${selectedTags.length}個のタグを削除しました`);
        setSelectedTags([]);
        onRefresh();
      } else {
        toast.error("一部のタグの削除に失敗しました");
      }
    } catch (error) {
      toast.error("タグの削除中にエラーが発生しました");
    }
  };

  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-gray-800 rounded-lg p-6 w-96 max-h-[80vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <FaTags /> タグ管理
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* 検索 */}
        <div className="mb-4">
          <div className="flex items-center gap-2 bg-gray-700 rounded-lg px-3 py-2">
            <FaSearch className="text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="タグを検索..."
              className="flex-1 bg-transparent text-white placeholder-gray-400 outline-none"
            />
          </div>
        </div>

        {/* 統計 */}
        <div className="mb-4 p-3 bg-gray-700 rounded-lg">
          <div className="text-sm text-gray-300">
            <div>総タグ数: {tags.length}</div>
            <div>選択中: {selectedTags.length}</div>
            <div>表示中: {filteredTags.length}</div>
          </div>
        </div>

        {/* アクションボタン */}
        <div className="mb-4 flex gap-2">
          <button
            onClick={() => setShowMergeDialog(true)}
            disabled={selectedTags.length < 2}
            className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <FaCodeBranch /> 統合
          </button>
          <button
            onClick={handleRemoveTags}
            disabled={selectedTags.length === 0}
            className="flex items-center gap-1 px-3 py-2 bg-red-600 text-white rounded text-sm hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <FaTrash /> 削除
          </button>
          <button
            onClick={() => setSelectedTags([])}
            disabled={selectedTags.length === 0}
            className="flex items-center gap-1 px-3 py-2 bg-gray-600 text-white rounded text-sm hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            クリア
          </button>
        </div>

        {/* タグリスト */}
        <div className="flex-1 overflow-y-auto">
          <div className="space-y-1">
            {filteredTags.map(({ tag, count }) => (
              <div
                key={tag}
                className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${
                  selectedTags.includes(tag)
                    ? "bg-blue-600 text-white"
                    : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                }`}
                onClick={() => handleTagSelect(tag)}
              >
                <span className="flex-1 truncate">{tag}</span>
                <span className="text-xs bg-gray-600 px-2 py-1 rounded">
                  {count}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 統合ダイアログ */}
        <AnimatePresence>
          {showMergeDialog && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center"
            >
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.9 }}
                className="bg-gray-800 rounded-lg p-4 w-80"
              >
                <h4 className="text-lg font-bold text-white mb-4">
                  タグの統合
                </h4>

                <div className="mb-4">
                  <label className="block text-sm text-gray-300 mb-2">
                    統合するタグ ({selectedTags.length}個):
                  </label>
                  <div className="text-sm text-gray-400">
                    {selectedTags.join(", ")}
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm text-gray-300 mb-2">
                    統合先タグ名:
                  </label>
                  <input
                    type="text"
                    value={mergeTarget}
                    onChange={(e) => setMergeTarget(e.target.value)}
                    placeholder="新しいタグ名を入力..."
                    className="w-full px-3 py-2 bg-gray-700 text-white rounded outline-none"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleMergeTags}
                    className="flex-1 py-2 bg-blue-600 text-white rounded hover:bg-blue-500 transition-colors"
                  >
                    統合
                  </button>
                  <button
                    onClick={() => setShowMergeDialog(false)}
                    className="flex-1 py-2 bg-gray-600 text-white rounded hover:bg-gray-500 transition-colors"
                  >
                    キャンセル
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
};
