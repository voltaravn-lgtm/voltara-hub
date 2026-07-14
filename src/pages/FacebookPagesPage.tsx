import React, { useEffect, useState } from 'react';
import { FacebookPage } from '../types/facebookTypes';
import { facebookPageService } from '../services/facebookPageService';
import { AlertCircle, Check, Facebook, Info, Link2, Link2Off, Loader2, Plus, RefreshCw } from 'lucide-react';

interface FacebookPagesPageProps {
  addToast: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

export const FacebookPagesPage: React.FC<FacebookPagesPageProps> = ({ addToast }) => {
  const [pages, setPages] = useState<FacebookPage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [graphVersion, setGraphVersion] = useState('');

  const loadPages = async (showError = true) => {
    setIsLoading(true);
    try {
      const [config, connectedPages] = await Promise.all([
        facebookPageService.getConfig(),
        facebookPageService.getPages()
      ]);
      setConfigured(config.configured);
      setGraphVersion(config.graphVersion);
      setPages(connectedPages);
    } catch (error: any) {
      if (showError) addToast(error?.message || 'Không tải được danh sách Fanpage.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPages();

    const handleOAuthMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.data?.type !== 'voltara-facebook-oauth') return;
      setIsConnecting(false);
      if (event.data.success) {
        addToast(event.data.message || 'Kết nối Facebook thành công.', 'success');
        loadPages(false);
      } else {
        addToast(event.data.message || 'Kết nối Facebook thất bại.', 'error');
      }
    };
    window.addEventListener('message', handleOAuthMessage);
    return () => window.removeEventListener('message', handleOAuthMessage);
  }, []);

  const handleConnectFacebook = async () => {
    setIsConnecting(true);
    try {
      const authUrl = await facebookPageService.getOAuthUrl();
      const width = 620;
      const height = 760;
      const left = Math.max(0, window.screenX + (window.outerWidth - width) / 2);
      const top = Math.max(0, window.screenY + (window.outerHeight - height) / 2);
      const popup = window.open(
        authUrl,
        'voltara-facebook-oauth',
        `popup=yes,width=${width},height=${height},left=${left},top=${top}`
      );
      if (!popup) {
        throw new Error('Trình duyệt đã chặn cửa sổ đăng nhập. Hãy cho phép popup rồi thử lại.');
      }
      popup.focus();
    } catch (error: any) {
      setIsConnecting(false);
      addToast(error?.message || 'Không thể bắt đầu đăng nhập Facebook.', 'error');
    }
  };

  const handleToggleConnection = async (page: FacebookPage) => {
    if (page.status !== 'connected') {
      await handleConnectFacebook();
      return;
    }
    if (!window.confirm(`Bạn có chắc chắn muốn ngắt kết nối với Fanpage "${page.name}"?`)) return;

    try {
      await facebookPageService.disconnectPage(page.id);
      await loadPages(false);
      addToast(`Đã ngắt kết nối Fanpage "${page.name}".`, 'info');
    } catch (error: any) {
      addToast(error?.message || 'Không thể ngắt kết nối Fanpage.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-950 uppercase tracking-wider flex items-center gap-2">
            <Facebook className="w-6 h-6 text-blue-600 fill-current" />
            <span>Fanpage Facebook đã kết nối</span>
          </h2>
          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mt-1">
            OAuth Meta thật, Page Token được lưu ở máy chủ và không gửi xuống trình duyệt
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => loadPages()}
            disabled={isLoading}
            className="p-2.5 text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl disabled:opacity-50"
            title="Làm mới danh sách"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleConnectFacebook}
            disabled={!configured || isConnecting}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            id="btn-add-fb-page"
          >
            {isConnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            <span>{isConnecting ? 'Đang mở Facebook...' : 'Kết nối bằng Facebook'}</span>
          </button>
        </div>
      </div>

      <div className={`${configured ? 'bg-blue-50 border-blue-200' : 'bg-rose-50 border-rose-200'} border p-4 rounded-2xl flex gap-3`}>
        <Info className={`w-5 h-5 shrink-0 mt-0.5 ${configured ? 'text-blue-600' : 'text-rose-600'}`} />
        <div className="text-xs space-y-1">
          <p className={`font-bold ${configured ? 'text-blue-800' : 'text-rose-800'}`}>
            {configured ? `Facebook Graph API ${graphVersion} đã sẵn sàng` : 'Cấu hình Facebook API chưa đầy đủ'}
          </p>
          <p className="leading-relaxed text-slate-600">
            {configured
              ? 'Bấm “Kết nối bằng Facebook”, đăng nhập tài khoản có quyền quản lý Page và cấp các quyền được yêu cầu.'
              : 'Kiểm tra lại META_APP_ID, META_APP_SECRET, META_REDIRECT_URI và META_GRAPH_VERSION trong file .env, sau đó khởi động lại máy chủ.'}
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="py-16 flex items-center justify-center text-slate-500 gap-2 text-sm">
          <Loader2 className="w-5 h-5 animate-spin" /> Đang tải Fanpage...
        </div>
      ) : pages.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-300 rounded-2xl py-16 text-center space-y-3">
          <Facebook className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="text-sm font-bold text-slate-700">Chưa có Fanpage nào được kết nối</p>
          <p className="text-xs text-slate-500">Bấm “Kết nối bằng Facebook” để lấy các Page bạn đang quản lý.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pages.map((page) => {
            const isConnected = page.status === 'connected';
            return (
              <div key={page.id} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col justify-between">
                <div className="p-5 flex gap-4 items-start">
                  <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-600 overflow-hidden shrink-0">
                    {page.picture ? <img src={page.picture} alt={page.name} className="w-full h-full object-cover" /> : page.name.charAt(0)}
                  </div>
                  <div className="space-y-1 overflow-hidden flex-1">
                    <h4 className="font-bold text-slate-900 text-sm truncate" title={page.name}>{page.name}</h4>
                    <span className="text-xs text-slate-500 block truncate">{page.category || 'Trang Facebook'}</span>
                    <div className="pt-2">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${isConnected ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                        {isConnected ? <Check className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                        {isConnected ? 'Đã kết nối' : 'Đã ngắt kết nối'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="px-5 py-3.5 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-[10px] font-mono text-slate-400">ID: {page.id}</span>
                  <button
                    type="button"
                    onClick={() => handleToggleConnection(page)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 font-bold rounded-xl border ${isConnected ? 'text-rose-700 bg-rose-50 border-rose-200' : 'text-blue-700 bg-blue-50 border-blue-200'}`}
                  >
                    {isConnected ? <Link2Off className="w-3.5 h-3.5" /> : <Link2 className="w-3.5 h-3.5" />}
                    {isConnected ? 'Ngắt kết nối' : 'Kết nối lại'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
