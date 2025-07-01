import { useEffect, useRef } from "react";
import { FiSettings, FiEye, FiEyeOff } from "react-icons/fi";

interface HeaderProps {
  onSettingsClick: () => void;
  isMonitoring: boolean;
  onToggleMonitoring: () => void;
}

const Header: React.FC<HeaderProps> = ({ onSettingsClick, isMonitoring, onToggleMonitoring }) => {
  const header = useRef<HTMLElement>(null);

  useEffect(() => {
    if(window.electron) {
      window.electron.onToggleTitlebar((show: boolean) => {
        if (show) {
          header.current?.classList.remove("hidden");
        } else {
          header.current?.classList.add("hidden");
        }
      });
    }
  }, []);

  return (
    <header ref={header} className="no-drag flex justify-between items-center p-3">
      <div className="flex items-center gap-2">
        <h1 className="text-sm font-semibold text-gray-700">OpenClue</h1>
        {isMonitoring && (
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs text-green-600">監視中</span>
          </div>
        )}
      </div>
      
      <div className="flex items-center gap-2">
        <button
          onClick={onToggleMonitoring}
          className={`p-2 rounded-full transition-colors ${
            isMonitoring 
              ? 'bg-green-100 text-green-600 hover:bg-green-200' 
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
          title={isMonitoring ? '監視を停止' : '監視を開始'}
        >
          {isMonitoring ? <FiEye className="text-sm" /> : <FiEyeOff className="text-sm" />}
        </button>
        
        <button
          onClick={onSettingsClick}
          className="p-2 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
          title="設定"
        >
          <FiSettings className="text-sm" />
        </button>
      </div>
    </header>
  );
};

export default Header;
