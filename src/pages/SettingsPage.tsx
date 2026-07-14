import React from 'react';
import { 
  Settings, RefreshCw, Sliders, ShieldAlert, DollarSign, Info, 
  MapPin, Mail, Phone, Building, Check, FileCode2, Chrome
} from 'lucide-react';
import { ExtensionConnectionSettings } from '../components/extensionConnectionSettings';

interface SettingsPageProps {
  onResetDatabase: () => void;
  lowStockThreshold: number;
  setLowStockThreshold: (val: number) => void;
  addToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  onNavigateToPendingList?: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  onResetDatabase,
  lowStockThreshold,
  setLowStockThreshold,
  addToast,
  onNavigateToPendingList,
}) => {
  const [activeSubTab, setActiveSubTab] = React.useState<'general' | 'extension'>('general');

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-fade-in pb-12">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Cài đặt hệ thống</h1>
        <p className="text-sm text-slate-500 font-normal">
          Cấu hình quy tắc cảnh báo hàng tồn kho, thông tin thương hiệu Voltara và kết nối Chrome Extension.
        </p>
      </div>

      {/* Sub-tab Navigation */}
      <div className="flex border-b border-slate-200 gap-6">
        <button
          onClick={() => setActiveSubTab('general')}
          className={`pb-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${
            activeSubTab === 'general'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Cấu hình chung
        </button>
        <button
          onClick={() => setActiveSubTab('extension')}
          className={`pb-3 text-sm font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
            activeSubTab === 'extension'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Chrome className="w-4 h-4" />
          Tiện ích Chrome
        </button>
      </div>

      {activeSubTab === 'general' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left Side: Configuration fields (2/3 width) */}
          <div className="md:col-span-2 space-y-6">
            {/* Warehouse Alerts Card */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 pb-2 border-b border-slate-100">
                <Sliders className="w-4.5 h-4.5 text-blue-600" />
                Cấu hình cảnh báo kho
              </h2>
              
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700 block">Ngưỡng cảnh báo sắp hết hàng (Sản phẩm)</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min="1"
                      max="50"
                      value={lowStockThreshold}
                      onChange={(e) => setLowStockThreshold(Math.max(1, Number(e.target.value)))}
                      className="w-24 px-3 py-2 text-sm rounded-xl border border-slate-200 focus:border-blue-500 focus:outline-none transition-all font-bold text-slate-800 bg-slate-50"
                    />
                    <span className="text-sm text-slate-500">
                      Khi số lượng sản phẩm bằng hoặc dưới mức này, hệ thống sẽ cảnh báo ở Trang tổng quan.
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Business profile info mockup */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 pb-2 border-b border-slate-100">
                <Building className="w-4.5 h-4.5 text-blue-600" />
                Thông tin thương hiệu chính hãng
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <span className="text-xs text-slate-400 block font-semibold">Tên doanh nghiệp</span>
                  <span className="font-semibold text-slate-800 block">Công ty TNHH Thiết Bị Điện Voltara Việt Nam</span>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-slate-400 block font-semibold">Mã số thuế</span>
                  <span className="font-semibold text-slate-800 block">0317894562 - Chi cục Thuế TP.HCM</span>
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <span className="text-xs text-slate-400 block font-semibold">Địa chỉ kho trung tâm</span>
                  <span className="font-semibold text-slate-800 block flex items-start gap-1.5">
                    <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    Đường số 12, Khu công nghệ cao TP. Thủ Đức, TP. Hồ Chí Minh
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-slate-400 block font-semibold">Email hỗ trợ kĩ thuật</span>
                  <span className="font-semibold text-slate-800 block flex items-center gap-1.5">
                    <Mail className="w-4 h-4 text-slate-400" />
                    support@voltara-tools.vn
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-slate-400 block font-semibold">Hotline bảo hành</span>
                  <span className="font-semibold text-slate-800 block flex items-center gap-1.5">
                    <Phone className="w-4 h-4 text-slate-400" />
                    1900 88 99 22
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side: Advanced Database seed tools (1/3 width) */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
              <h2 className="text-base font-bold text-rose-700 flex items-center gap-2 pb-2 border-b border-rose-100">
                <ShieldAlert className="w-4.5 h-4.5" />
                Bảo trì & Khôi phục
              </h2>

              <p className="text-xs text-slate-500 leading-relaxed">
                Nhấp vào nút bên dưới để khôi phục cơ sở dữ liệu ban đầu gồm 10 dòng sản phẩm Voltara mẫu của nhà phát triển.
              </p>
              <div className="p-3 bg-rose-50 rounded-xl text-xs text-rose-800 font-semibold leading-relaxed border border-rose-100">
                Cảnh báo: Hành động này sẽ xóa toàn bộ các sản phẩm và danh mục bạn đã thêm mới hoặc chỉnh sửa gần đây!
              </div>

              <button
                onClick={onResetDatabase}
                className="w-full py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2 shadow-sm transition-colors focus:ring-2 focus:ring-rose-500 focus:ring-offset-2"
              >
                <RefreshCw className="w-4 h-4 animate-spin-hover" />
                Khôi phục dữ liệu mẫu
              </button>
            </div>

            {/* Infrastructure details */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-3">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <FileCode2 className="w-4 h-4 text-slate-500" />
                Trạng thái lưu trữ
              </h3>
              <div className="space-y-1.5 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>Cơ chế lưu trữ:</span>
                  <strong className="font-semibold text-slate-800">Browser LocalStorage</strong>
                </div>
                <div className="flex justify-between">
                  <span>Cấu trúc tương lai:</span>
                  <strong className="font-semibold text-blue-600">Firebase Firestore Ready</strong>
                </div>
                <div className="flex justify-between">
                  <span>Phiên bản Hub:</span>
                  <strong className="font-semibold text-slate-800">v1.0.0 (Beta)</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Chrome Extension Settings Component takes full width */}
          <ExtensionConnectionSettings addToast={addToast} onNavigateToPendingList={onNavigateToPendingList} />
        </div>
      )}
    </div>
  );
};
