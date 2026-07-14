import React, { useState, useEffect } from 'react';
import { 
  Chrome, Bolt, Link2, Link2Off, RefreshCw, KeyRound, Copy, Check, 
  Play, Sparkles, HelpCircle 
} from 'lucide-react';
import { ExtensionConnectionConfig } from '../types/extensionImportTypes';
import { extensionAuthService } from '../services/extensionAuthService';
import { extensionImportService } from '../services/extensionImportService';

interface ExtensionConnectionSettingsProps {
  addToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  onNavigateToPendingList?: () => void;
}

export const ExtensionConnectionSettings: React.FC<ExtensionConnectionSettingsProps> = ({
  addToast,
  onNavigateToPendingList
}) => {
  const [config, setConfig] = useState<ExtensionConnectionConfig | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isMocking, setIsMocking] = useState<boolean>(false);

  // Load configuration
  const loadConfig = async () => {
    setIsLoading(true);
    try {
      const data = await extensionAuthService.getStatus();
      setConfig(data);
    } catch (err) {
      addToast('Không thể tải cấu hình tiện ích kết nối', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const handleGenerateToken = async () => {
    try {
      const data = await extensionAuthService.generateToken();
      setConfig(data);
      addToast('Đã tạo mã kết nối thành công!', 'success');
    } catch (err) {
      addToast('Có lỗi xảy ra khi sinh mã kết nối', 'error');
    }
  };

  const handleDisconnect = async () => {
    try {
      const data = await extensionAuthService.disconnect();
      setConfig(data);
      addToast('Đã ngắt kết nối tiện ích thành công', 'warning');
    } catch (err) {
      addToast('Có lỗi xảy ra khi ngắt kết nối', 'error');
    }
  };

  const handleCopyToken = (token: string) => {
    navigator.clipboard.writeText(token);
    setIsCopied(true);
    addToast('Đã sao chép mã kết nối vào bộ nhớ tạm', 'success');
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Trigger mô phỏng dữ liệu từ tiện ích
  const handleMockImport = async () => {
    if (!config || !config.token) {
      addToast('Vui lòng tạo mã kết nối trước khi thực hiện mô phỏng!', 'warning');
      return;
    }
    
    setIsMocking(true);
    try {
      const res = await extensionImportService.mockExtensionImport(config.token);
      if (res.success) {
        addToast('Đã nhận sản phẩm từ Chrome Extension.', 'success');
        // Refresh connection stats
        await loadConfig();
        if (onNavigateToPendingList) {
          onNavigateToPendingList();
        }
      } else {
        addToast(res.error || 'Mô phỏng gửi dữ liệu thất bại', 'error');
      }
    } catch (err) {
      addToast('Lỗi kết nối API máy chủ mô phỏng', 'error');
    } finally {
      setIsMocking(false);
    }
  };

  // Helper che giấu token (hiện đầy đủ vì đây là mã thử nghiệm ngắn gọn)
  const formatMaskedToken = (token: string | null) => {
    if (!token) return '';
    return token;
  };

  if (isLoading && !config) {
    return (
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm text-center">
        <RefreshCw className="w-6 h-6 text-blue-600 animate-spin mx-auto mb-2" />
        <p className="text-xs text-slate-500">Đang tải cấu hình Chrome Extension...</p>
      </div>
    );
  }

  const isConnected = config?.isConnected && config.token;

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
      
      {/* Title */}
      <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 pb-2 border-b border-slate-100">
        <Chrome className="w-5 h-5 text-blue-600" />
        Tiện ích Chrome: Voltara Product Importer
      </h2>

      {/* Main Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Left Side: Status display */}
        <div className="space-y-4">
          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-semibold block">Trạng thái kết nối</span>
            {isConnected ? (
              <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-3 py-1 rounded-xl text-xs font-bold border border-emerald-100">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                ĐÃ KẾT NỐI
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 px-3 py-1 rounded-xl text-xs font-bold border border-slate-200">
                <span className="w-2 h-2 rounded-full bg-slate-400" />
                CHƯA KẾT NỐI
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="space-y-1">
              <span className="text-slate-400 block font-semibold">Tên tiện ích:</span>
              <span className="font-bold text-slate-800">{config?.extensionName || "Voltara Product Importer"}</span>
            </div>
            <div className="space-y-1">
              <span className="text-slate-400 block font-semibold">Phiên bản:</span>
              <span className="font-bold text-slate-800">1.0.0</span>
            </div>
            <div className="space-y-1">
              <span className="text-slate-400 block font-semibold">Tổng số sản phẩm đã gửi:</span>
              <span className="font-extrabold text-blue-600 text-sm bg-blue-50 px-2 py-0.5 rounded-md inline-block">
                {config?.productsSentCount || 0}
              </span>
            </div>
            <div className="col-span-2 space-y-1">
              <span className="text-slate-400 block font-semibold">Lần kết nối gần nhất:</span>
              <span className="font-semibold text-slate-700">
                {config?.lastConnectedAt 
                  ? new Date(config.lastConnectedAt).toLocaleString('vi-VN') 
                  : 'Chưa có kết nối nào'}
              </span>
            </div>
          </div>
        </div>

        {/* Right Side: Security info / Actions */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3.5 text-xs">
          <div className="flex items-start gap-2">
            <KeyRound className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-700 font-bold block mb-0.5">Xác thực API Bảo mật</strong>
              <p className="text-slate-500 leading-relaxed font-normal">
                Để kết nối Extension, sao chép Connection Token bên dưới và dán vào phần cài đặt trong tiện ích Chrome. Token này dùng để xác thực quyền ghi sản phẩm.
              </p>
            </div>
          </div>

          {/* Token Display Container */}
          {isConnected && config.token && (
            <div className="space-y-2">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Extension connection token:</span>
              <div className="flex items-center gap-1 bg-white p-2 rounded-lg border border-slate-200 shadow-inner">
                <code className="text-[11px] text-slate-600 font-mono font-bold select-all truncate flex-1">
                  {formatMaskedToken(config.token)}
                </code>
                <button
                  onClick={() => handleCopyToken(config.token!)}
                  className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-800 transition-colors shrink-0"
                  title="Sao chép toàn bộ mã kết nối"
                >
                  {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2 pt-1">
            {!isConnected ? (
              <button
                onClick={handleGenerateToken}
                className="py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg flex items-center gap-1.5 shadow-xs transition-colors"
              >
                <Link2 className="w-3.5 h-3.5" />
                Tạo mã kết nối
              </button>
            ) : (
              <>
                <button
                  onClick={handleGenerateToken}
                  className="py-2 px-3 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded-lg flex items-center gap-1.5 border border-slate-200 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Tạo lại mã
                </button>
                <button
                  onClick={handleDisconnect}
                  className="py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-lg flex items-center gap-1.5 border border-rose-100 transition-colors"
                >
                  <Link2Off className="w-3.5 h-3.5" />
                  Ngắt kết nối
                </button>
              </>
            )}
          </div>

        </div>

      </div>

      {/* Section 5: CHẾ ĐỘ THỬ NGHIỆM */}
      <div className="p-4 bg-blue-50/40 rounded-xl border border-blue-100/60 space-y-4">
        <div className="flex items-start gap-2.5">
          <Sparkles className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h3 className="font-extrabold text-blue-900 text-xs uppercase tracking-wider">Chế độ thử nghiệm: Mock Chrome Extension</h3>
            <p className="text-xs text-blue-800 font-normal leading-relaxed">
              Bạn chưa cài đặt Voltara Chrome Extension? Không sao cả! Nhấn vào nút bên dưới để hệ thống mô phỏng một yêu cầu gửi sản phẩm mẫu từ Shopee đi qua đúng quy trình xác thực API thực tế.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleMockImport}
            disabled={isMocking || !isConnected}
            className={`py-2 px-4 rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-all ${
              !isConnected 
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300/40'
                : 'bg-blue-600 hover:bg-blue-700 text-white hover:shadow-sm'
            }`}
          >
            {isMocking ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current" />
            )}
            Mô phỏng dữ liệu từ tiện ích
          </button>
          
          {!isConnected && (
            <span className="text-[11px] text-amber-600 font-semibold flex items-center gap-1">
              <HelpCircle className="w-3.5 h-3.5" />
              Hãy bấm "Tạo mã kết nối" ở trên trước để kích hoạt mô phỏng.
            </span>
          )}
        </div>
      </div>

    </div>
  );
};
