import React, { useState, useEffect } from 'react';
import { FiCpu, FiBattery, FiMonitor } from 'react-icons/fi';
import { getMemoryUsage, getBatteryInfo } from '../utils/performance';

interface SystemInfoProps {
  isVisible: boolean;
  isMonitoring: boolean;
}

const SystemInfo: React.FC<SystemInfoProps> = ({ isVisible, isMonitoring }) => {
  const [memoryInfo, setMemoryInfo] = useState<string>('');
  const [batteryInfo, setBatteryInfo] = useState<string>('');

  useEffect(() => {
    if (!isVisible) return;

    const updateSystemInfo = async () => {
      setMemoryInfo(getMemoryUsage());
      setBatteryInfo(await getBatteryInfo());
    };

    updateSystemInfo();
    const interval = setInterval(updateSystemInfo, 5000); // 5秒ごとに更新

    return () => clearInterval(interval);
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div className="text-xs text-gray-500 p-2 bg-gray-50 rounded-lg mt-2">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1">
          <FiCpu className="text-xs" />
          <span>{memoryInfo}</span>
        </div>
        
        <div className="flex items-center gap-1">
          <FiBattery className="text-xs" />
          <span>{batteryInfo}</span>
        </div>
        
        <div className="flex items-center gap-1">
          <FiMonitor className="text-xs" />
          <span className={isMonitoring ? 'text-green-600' : 'text-gray-400'}>
            {isMonitoring ? 'アクティブ' : '停止中'}
          </span>
        </div>
      </div>
      
      {isMonitoring && (
        <div className="mt-1 text-xs text-orange-600">
          ⚠️ 継続監視中：バッテリー消費にご注意ください
        </div>
      )}
    </div>
  );
};

export default SystemInfo;