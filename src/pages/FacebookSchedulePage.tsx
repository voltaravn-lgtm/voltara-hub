import React, { useState, useEffect } from 'react';
import { FacebookPost } from '../types/facebookTypes';
import { facebookImportService } from '../services/facebookImportService';
import { Clock, Calendar, Search, RefreshCw, AlertCircle, Edit, Trash2, Facebook } from 'lucide-react';

interface FacebookSchedulePageProps {
  onNavigateToEditor: (post: FacebookPost) => void;
  addToast: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

export const FacebookSchedulePage: React.FC<FacebookSchedulePageProps> = ({
  onNavigateToEditor,
  addToast,
}) => {
  const [scheduledPosts, setScheduledPosts] = useState<FacebookPost[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = () => {
    const allPosts = facebookImportService.getPosts();
    // Filter posts that are draft and have scheduledAt timestamp
    const scheduled = allPosts.filter(p => p.status === 'draft' && !!p.scheduledAt);
    setScheduledPosts(scheduled);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCancelSchedule = (id: string) => {
    if (window.confirm('Bạn có chắc chắn muốn hủy lịch đăng của bài viết này? Bài viết sẽ trở lại trạng thái nháp thông thường.')) {
      const allPosts = facebookImportService.getPosts();
      const post = allPosts.find(p => p.id === id);
      if (post) {
        post.scheduledAt = undefined;
        facebookImportService.savePost(post);
        loadData();
        addToast('Đã hủy lịch đăng bài viết thành công.', 'success');
      }
    }
  };

  const filtered = scheduledPosts.filter(p => {
    const text = (p.editedCaption || p.originalCaption || '').toLowerCase();
    return text.includes(searchQuery.toLowerCase());
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-950 uppercase tracking-wider flex items-center gap-2">
            <Facebook className="w-6 h-6 text-blue-600 fill-current" />
            <span>Lịch phát bài đăng Facebook</span>
          </h2>
          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mt-1">
            Theo dõi danh sách các bài viết đã lên lịch phát tự động trên hệ thống Fanpage
          </p>
        </div>

        <button
          onClick={loadData}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all shadow-sm focus:outline-none shrink-0"
          id="btn-refresh-schedule"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Làm mới hàng đợi</span>
        </button>
      </div>

      {/* Info sandbox reminder */}
      <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-2xl flex gap-3">
        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <p className="font-bold text-amber-800">Cơ chế phát bài tự động giả lập (Sandbox Queue)</p>
          <p className="leading-relaxed text-slate-600 font-normal">
            Hệ thống lên lịch đăng giả lập sẽ lưu trữ và hiển thị các bài đăng chờ phát. Khi đến giờ đã định, hệ thống kiểm duyệt nền sẽ tự động đẩy dữ liệu sang trạng thái <strong className="font-semibold">Đã đăng</strong> và ghi nhận vào Nhật ký.
          </p>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Tìm trong danh sách bài lên lịch..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-slate-50/50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition-all shadow-inner"
          id="search-fb-schedule"
        />
      </div>

      {/* Scheduled Queue List */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-slate-150 rounded-2xl py-16 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mx-auto border border-slate-100 text-slate-400">
            <Calendar className="w-6 h-6" />
          </div>
          <p className="text-slate-500 font-medium text-xs">Không có bài viết nào đang nằm trong hàng đợi lên lịch.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((post) => (
            <div key={post.id} className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between space-y-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="space-y-3">
                {/* Header info */}
                <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  <span>Bài viết nguồn: {post.pageName || 'Facebook'}</span>
                  <span className="text-amber-600 flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">
                    <Clock className="w-3 h-3" />
                    <span>Chờ phát</span>
                  </span>
                </div>

                {/* Caption preview */}
                <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap line-clamp-4">
                  {post.editedCaption || post.originalCaption}
                </p>

                {/* Schedule details */}
                {post.scheduledAt && (
                  <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-3 flex items-center gap-2.5">
                    <Calendar className="w-4 h-4 text-blue-600" />
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Giờ phát sóng dự kiến</span>
                      <span className="text-xs font-bold text-blue-900">{new Date(post.scheduledAt).toLocaleString('vi-VN')}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                <button
                  onClick={() => handleCancelSchedule(post.id)}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-50 rounded-xl transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hủy lịch</span>
                </button>
                <button
                  onClick={() => onNavigateToEditor(post)}
                  className="flex items-center gap-1 px-3.5 py-1.5 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-xl transition-all"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>Sửa nhanh</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
