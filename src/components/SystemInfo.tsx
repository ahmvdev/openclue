import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  FaMemory,
  FaBatteryThreeQuarters,
  FaDesktop,
  FaExclamationTriangle,
} from "react-icons/fa";
import { useTranslation } from "react-i18next";

interface SystemInfoProps {
  isVisible: boolean;
  isMonitoring: boolean;
}

const SystemInfo: React.FC<SystemInfoProps> = ({ isVisible, isMonitoring }) => {
  const { t } = useTranslation();
  const [memoryUsage, setMemoryUsage] = useState<number>(0);
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  const [isCharging, setIsCharging] = useState(false);

  useEffect(() => {
    if (!isVisible) return;

    // メモリ使用量を取得（簡易的な実装）
    const updateMemoryUsage = () => {
      if (performance && "memory" in performance) {
        const memory = (performance as any).memory;
        if (memory) {
          const usage = (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100;
          setMemoryUsage(Math.round(usage));
        }
      }
    };

    // バッテリー状態を取得
    const updateBatteryStatus = async () => {
      if ("getBattery" in navigator) {
        try {
          const battery = await (navigator as any).getBattery();
          setBatteryLevel(Math.round(battery.level * 100));
          setIsCharging(battery.charging);

          battery.addEventListener("levelchange", () => {
            setBatteryLevel(Math.round(battery.level * 100));
          });

          battery.addEventListener("chargingchange", () => {
            setIsCharging(battery.charging);
          });
        } catch (error) {
          console.error("Battery API not available:", error);
        }
      }
    };

    updateMemoryUsage();
    updateBatteryStatus();

    const interval = setInterval(updateMemoryUsage, 5000);

    return () => clearInterval(interval);
  }, [isVisible]);

  if (!isVisible) return null;

  const getBatteryIcon = () => {
    if (batteryLevel === null) return null;

    if (isCharging) {
      return "🔌";
    }

    if (batteryLevel > 75) return "🔋";
    if (batteryLevel > 50) return "🔋";
    if (batteryLevel > 25) return "🪫";
    return "🪫";
  };

  const getMemoryStatus = () => {
    if (memoryUsage > 80) {
      return {
        color: "text-red-600",
        message: t("systemInfo.memoryStatusHigh"),
      };
    } else if (memoryUsage > 60) {
      return {
        color: "text-yellow-600",
        message: t("systemInfo.memoryStatusMedium"),
      };
    }
    return {
      color: "text-green-600",
      message: t("systemInfo.memoryStatusNormal"),
    };
  };

  const memoryStatus = getMemoryStatus();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="fixed bottom-4 left-4 bg-white/90 backdrop-blur-md rounded-lg shadow-lg p-3 text-xs"
    >
      <div className="space-y-2">
        {/* メモリ使用量 */}
        <div className="flex items-center gap-2">
          <FaMemory className="w-4 h-4 text-gray-600" />
          <span className="text-gray-700">{t("systemInfo.memory")}:</span>
          <span className={`font-medium ${memoryStatus.color}`}>
            {memoryUsage}% ({memoryStatus.message})
          </span>
        </div>

        {/* バッテリー状態 */}
        {batteryLevel !== null && (
          <div className="flex items-center gap-2">
            <span className="text-lg">{getBatteryIcon()}</span>
            <span className="text-gray-700">{t("systemInfo.battery")}:</span>
            <span
              className={`font-medium ${batteryLevel < 20 ? "text-red-600" : "text-gray-800"}`}
            >
              {batteryLevel}%{isCharging && ` (${t("systemInfo.charging")})`}
            </span>
          </div>
        )}

        {/* 警告メッセージ */}
        {batteryLevel !== null && batteryLevel < 20 && !isCharging && (
          <div className="flex items-center gap-2 text-yellow-600 mt-2 pt-2 border-t border-gray-200">
            <FaExclamationTriangle className="w-4 h-4" />
            <span>{t("systemInfo.batteryWarning")}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default SystemInfo;
