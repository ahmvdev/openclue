import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaFilter,
  FaCalendar,
  FaTags,
  FaStar,
  FaSort,
  FaChevronDown,
} from "react-icons/fa";
import { MemoryEntry } from "../electron";

interface SearchFilters {
  type?: MemoryEntry["type"][];
  tags?: string[];
  dateRange?: { start: number; end: number };
  minRelevance?: number;
  sortBy?: "relevance" | "date" | "access";
  useSemantic?: boolean;
}

interface AdvancedSearchFiltersProps {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  availableTags: { tag: string; count: number }[];
  isVisible: boolean;
  onToggle: () => void;
}

export const AdvancedSearchFilters: React.FC<AdvancedSearchFiltersProps> = ({
  filters,
  onFiltersChange,
  availableTags,
  isVisible,
  onToggle,
}) => {
  const [datePreset, setDatePreset] = useState<string>("all");

  const memoryTypes: MemoryEntry["type"][] = [
    "note",
    "project",
    "knowledge",
    "preference",
    "pattern",
  ];
  const typeLabels = {
    note: "ノート",
    project: "プロジェクト",
    knowledge: "知識",
    preference: "設定",
    pattern: "パターン",
  };

  const handleTypeToggle = (type: MemoryEntry["type"]) => {
    const currentTypes = filters.type || [];
    const newTypes = currentTypes.includes(type)
      ? currentTypes.filter((t) => t !== type)
      : [...currentTypes, type];

    onFiltersChange({
      ...filters,
      type: newTypes.length === 0 ? undefined : newTypes,
    });
  };

  const handleTagToggle = (tag: string) => {
    const currentTags = filters.tags || [];
    const newTags = currentTags.includes(tag)
      ? currentTags.filter((t) => t !== tag)
      : [...currentTags, tag];

    onFiltersChange({
      ...filters,
      tags: newTags.length === 0 ? undefined : newTags,
    });
  };

  const handleDatePresetChange = (preset: string) => {
    setDatePreset(preset);
    const now = Date.now();

    let dateRange: { start: number; end: number } | undefined;

    switch (preset) {
      case "today":
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        dateRange = { start: today.getTime(), end: now };
        break;
      case "week":
        dateRange = { start: now - 7 * 24 * 60 * 60 * 1000, end: now };
        break;
      case "month":
        dateRange = { start: now - 30 * 24 * 60 * 60 * 1000, end: now };
        break;
      case "quarter":
        dateRange = { start: now - 90 * 24 * 60 * 60 * 1000, end: now };
        break;
      case "year":
        dateRange = { start: now - 365 * 24 * 60 * 60 * 1000, end: now };
        break;
      default:
        dateRange = undefined;
    }

    onFiltersChange({
      ...filters,
      dateRange,
    });
  };

  const clearAllFilters = () => {
    onFiltersChange({});
    setDatePreset("all");
  };

  const activeFilterCount = [
    filters.type?.length,
    filters.tags?.length,
    filters.dateRange ? 1 : 0,
    filters.minRelevance ? 1 : 0,
  ]
    .filter(Boolean)
    .reduce((a, b) => (a || 0) + (b || 0), 0);

  return (
    <div className="relative">
      <button
        onClick={onToggle}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
          isVisible
            ? "bg-blue-600 text-white"
            : "bg-gray-700 text-gray-300 hover:bg-gray-600"
        }`}
      >
        <FaFilter />
        <span>フィルタ</span>
        {activeFilterCount > 0 && (
          <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
            {activeFilterCount}
          </span>
        )}
        <FaChevronDown
          className={`transition-transform ${isVisible ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 mt-2 bg-gray-800 rounded-lg p-4 shadow-xl z-10 border border-gray-700"
          >
            {/* タイプフィルタ */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <FaTags className="inline mr-1" />
                タイプ
              </label>
              <div className="flex flex-wrap gap-2">
                {memoryTypes.map((type) => (
                  <button
                    key={type}
                    onClick={() => handleTypeToggle(type)}
                    className={`px-3 py-1 rounded-full text-sm transition-colors ${
                      filters.type?.includes(type)
                        ? "bg-blue-600 text-white"
                        : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                    }`}
                  >
                    {typeLabels[type]}
                  </button>
                ))}
              </div>
            </div>

            {/* タグフィルタ */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <FaTags className="inline mr-1" />
                タグ
              </label>
              <div className="max-h-32 overflow-y-auto">
                <div className="flex flex-wrap gap-1">
                  {availableTags.slice(0, 20).map(({ tag, count }) => (
                    <button
                      key={tag}
                      onClick={() => handleTagToggle(tag)}
                      className={`px-2 py-1 rounded text-xs transition-colors ${
                        filters.tags?.includes(tag)
                          ? "bg-purple-600 text-white"
                          : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                      }`}
                    >
                      {tag} ({count})
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 日付範囲フィルタ */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <FaCalendar className="inline mr-1" />
                期間
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: "all", label: "すべて" },
                  { value: "today", label: "今日" },
                  { value: "week", label: "1週間" },
                  { value: "month", label: "1ヶ月" },
                  { value: "quarter", label: "3ヶ月" },
                  { value: "year", label: "1年" },
                ].map((preset) => (
                  <button
                    key={preset.value}
                    onClick={() => handleDatePresetChange(preset.value)}
                    className={`px-3 py-1 rounded text-sm transition-colors ${
                      datePreset === preset.value
                        ? "bg-green-600 text-white"
                        : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 関連度フィ���タ */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <FaStar className="inline mr-1" />
                最小関連度: {Math.round((filters.minRelevance || 0) * 100)}%
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={filters.minRelevance || 0}
                onChange={(e) =>
                  onFiltersChange({
                    ...filters,
                    minRelevance: parseFloat(e.target.value) || undefined,
                  })
                }
                className="w-full"
              />
            </div>

            {/* ソート順 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <FaSort className="inline mr-1" />
                ソート順
              </label>
              <div className="flex gap-2">
                {[
                  { value: "relevance", label: "関連度" },
                  { value: "date", label: "更新日" },
                  { value: "access", label: "アクセス数" },
                ].map((sort) => (
                  <button
                    key={sort.value}
                    onClick={() =>
                      onFiltersChange({
                        ...filters,
                        sortBy: sort.value as any,
                      })
                    }
                    className={`px-3 py-1 rounded text-sm transition-colors ${
                      (filters.sortBy || "relevance") === sort.value
                        ? "bg-orange-600 text-white"
                        : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                    }`}
                  >
                    {sort.label}
                  </button>
                ))}
              </div>
            </div>

            {/* セマンティック検索 */}
            <div className="mb-4">
              <label className="flex items-center gap-2 text-sm text-gray-300">
                <input
                  type="checkbox"
                  checked={filters.useSemantic || false}
                  onChange={(e) =>
                    onFiltersChange({
                      ...filters,
                      useSemantic: e.target.checked || undefined,
                    })
                  }
                  className="rounded"
                />
                セマンティック検索を使用
              </label>
            </div>

            {/* アクション */}
            <div className="flex justify-between pt-2 border-t border-gray-700">
              <button
                onClick={clearAllFilters}
                className="px-3 py-1 text-sm text-gray-400 hover:text-white transition-colors"
              >
                すべてクリア
              </button>
              <button
                onClick={onToggle}
                className="px-4 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-500 transition-colors"
              >
                適用
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
