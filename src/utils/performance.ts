// パフォーマンス最適化のためのユーティリティ

export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

// メモリ使用量を監視
export const getMemoryUsage = (): string => {
  if (typeof window !== 'undefined' && 'performance' in window && 'memory' in window.performance) {
    const memory = (window.performance as any).memory;
    return `Used: ${Math.round(memory.usedJSHeapSize / 1048576)}MB / Total: ${Math.round(memory.totalJSHeapSize / 1048576)}MB`;
  }
  return 'Memory info not available';
};

// 画像圧縮
export const compressImage = (canvas: HTMLCanvasElement, quality: number = 0.8): string => {
  return canvas.toDataURL('image/jpeg', quality);
};

// バッテリー状態の確認（可能な場合）
export const getBatteryInfo = async (): Promise<string> => {
  if ('getBattery' in navigator) {
    try {
      const battery = await (navigator as any).getBattery();
      const level = Math.round(battery.level * 100);
      const charging = battery.charging ? '充電中' : '放電中';
      return `バッテリー: ${level}% (${charging})`;
    } catch (error) {
      return 'バッテリー情報取得不可';
    }
  }
  return 'バッテリー情報未対応';
};