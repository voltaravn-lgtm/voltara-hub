import React, { useState, useEffect } from 'react';
import { FacebookLog } from '../types/facebookTypes';
import { facebookPublishingService } from '../services/facebookPublishingService';
import { Search, Filter, Trash2, CheckCircle2, XCircle, Clock, RefreshCw, Facebook } from 'lucide-react';

interface FacebookLogsPageProps {
  addToast: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

export const FacebookLogsPage: React.FC<FacebookLogsPageProps> = ({ addToast }) => {
  const [logs, setLogs] = useState<FacebookLog[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const loadLogs = () => {
    setLogs(facebookPublishingService.getLogs());
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const handleClearLogs = () => {
    const confirm = window.confirm('Bạn có chắc chắn muốn xóa toàn bộ nhật ký đăng bài này? Hành động không thể khôi phục.');
    if (confirm) {
      facebookPublishingService.clearLogs();
      loadLogs();
      addToast('Đã dọn dẹp sạch nhật ký đăng tải.', 'success');
    }
  };

  const filteredLogs = logs.filter((log) => {
    const title = (log.postTitle || '').toLowerCase();
    const page = (log.targetPage || '').toLowerCase();
    const msg = (log.message || '').toLowerCase();
    const query = searchQuery.toLowerCase();

    const matchesSearch = title.includes(query) || page.includes(query) || msg.includes(query);
    const matchesStatus = statusFilter === 'all' || log.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-950 uppercase tracking-wider flex items-center gap-2">
            <Facebook className="w-6 h-6 text-blue-600 fill-current" />
            <span>Nhật ký đăng tải Facebook</span>
          </h2>
          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mt-1">
            Nhật ký lịch sử đăng tải bài viết và thông báo lỗi phản hồi từ hệ thống
          </p>
        </div>

        <div className="flex gap-2 shrink-0">
          <button
            onClick={loadLogs}
            className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-50 border border-slate-200 rounded-xl transition-all shadow-sm bg-white"
            title="Làm mới"
            id="btn-refresh-fb-logs"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          
          {logs.length > 0 && (
            <button
              onClick={handleClearLogs}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl hover:bg-rose-100 transition-all shadow-sm"
              id="btn-clear-fb-logs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Xóa tất cả nhật ký</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo nội dung đăng, tên Fanpage đích hoặc nội dung log..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50/50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition-all shadow-inner"
            id="search-fb-logs"
          />
        </div>

        <div className="flex gap-2 shrink-0">
          <div className="relative">
            <Filter className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-50/50 border border-slate-200 rounded-xl pl-9 pr-8 py-2 text-xs font-semibold text-slate-700 outline-none cursor-pointer focus:border-blue-500 focus:bg-white transition-all appearance-none"
              id="filter-fb-logs-status"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="success">Đăng thành công</option>
              <option value="failed">Đăng thất bại</option>
            </select>
          </div>
        </div>
      </div>

      {/* Logs Listing Table */}
      {filteredLogs.length === 0 ? (
        <div className="bg-white border border-slate-150 rounded-2xl py-16 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mx-auto border border-slate-100 text-slate-400">
            <Search className="w-6 h-6" />
          </div>
          <p className="text-slate-500 font-medium text-xs">Không tìm thấy bản ghi nhật ký nào.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  <th className="py-3 px-5 w-44">Thời gian</th>
                  <th className="py-3 px-5 w-48">Fanpage Đích</th>
                  <th className="py-3 px-5">Bài đăng tham chiếu</th>
                  <th className="py-3 px-5 w-32">Kết quả</th>
                  <th className="py-3 px-5">Mô tả chi tiết / Phản hồi API</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredLogs.map((log) => {
                  const isSuccess = log.status === 'success';
                  return (
                    <tr key={log.id} className="hover:bg-slate-50/40 transition-colors" id={`fb-log-row-${log.id}`}>
                      {/* Timestamp */}
                      <td className="py-4 px-5 text-slate-500 font-medium whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{new Date(log.timestamp).toLocaleString('vi-VN')}</span>
                        </div>
                      </td>

                      {/* Fanpage */}
                      <td className="py-4 px-5 text-slate-900 font-bold whitespace-normal">
                        {log.targetPage}
                      </td>

                      {/* Post Reference Title */}
                      <td className="py-4 px-5 text-slate-700 font-normal">
                        <div className="space-y-0.5 max-w-sm">
                          <p className="line-clamp-2 leading-relaxed font-semibold">{log.postTitle}</p>
                          {log.postUrl && (
                            <a
                              href={log.postUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] font-medium text-blue-600 hover:underline block"
                            >
                              Xem liên kết bài ↗
                            </a>
                          )}
                        </div>
                      </td>

                      {/* Result Tag */}
                      <td className="py-4 px-5 whitespace-nowrap">
                        {isSuccess ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                            <span>Thành công</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-100">
                            <XCircle className="w-3.5 h-3.5 text-rose-500" />
                            <span>Thất bại</span>
                          </span>
                        )}
                      </td>

                      {/* Detailed API Response */}
                      <td className="py-4 px-5 font-normal text-slate-500 break-words max-w-xs leading-relaxed">
                        <span className={isSuccess ? 'text-slate-600' : 'text-rose-600 font-medium'}>
                          {log.message}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
