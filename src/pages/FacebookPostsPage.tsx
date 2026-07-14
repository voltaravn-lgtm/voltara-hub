import React, { useState, useEffect } from 'react';
import { FacebookPost, FacebookPage } from '../types/facebookTypes';
import { facebookImportService } from '../services/facebookImportService';
import { facebookPageService } from '../services/facebookPageService';
import { facebookPublishingService } from '../services/facebookPublishingService';
import { FacebookPostCard } from '../components/facebook/FacebookPostCard';
import { FacebookPublishDialog } from '../components/facebook/FacebookPublishDialog';
import { Search, Filter, RefreshCw, FileSpreadsheet, PlusCircle, Facebook } from 'lucide-react';

interface FacebookPostsPageProps {
  onNavigateToEditor: (post: FacebookPost) => void;
  addToast: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

export const FacebookPostsPage: React.FC<FacebookPostsPageProps> = ({
  onNavigateToEditor,
  addToast,
}) => {
  const [posts, setPosts] = useState<FacebookPost[]>([]);
  const [pages, setPages] = useState<FacebookPage[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [publishingPost, setPublishingPost] = useState<FacebookPost | null>(null);

  const loadData = async () => {
    // Sync any pending imports from the Extension queue
    try {
      const res = await fetch('/api/extensions/facebook');
      if (res.ok) {
        const pendingImports = await res.json();
        if (pendingImports && pendingImports.length > 0) {
          for (const item of pendingImports) {
            facebookImportService.savePost(item);
            await fetch(`/api/extensions/facebook/${item.id}`, { method: 'DELETE' });
          }
          addToast(`Đồng bộ thành công ${pendingImports.length} bài viết mới copy từ Chrome Extension!`, 'success');
        }
      }
    } catch (e) {
      console.warn('Facebook post sync failed:', e);
    }

    setPosts(facebookImportService.getPosts());
    try {
      setPages(await facebookPageService.getPages());
    } catch (error) {
      console.warn('Facebook Page sync failed:', error);
      setPages([]);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDelete = (id: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa bài viết Facebook đã copy này?')) {
      facebookImportService.deletePost(id);
      loadData();
      addToast('Đã xóa bài viết đã copy thành công.', 'success');
    }
  };

  const handlePublishClick = (post: FacebookPost) => {
    const connectedPages = pages.filter(p => p.status === 'connected');
    if (connectedPages.length === 0) {
      addToast('Không thể đăng bài. Vui lòng kết nối ít nhất 1 Fanpage trước!', 'warning');
      return;
    }
    setPublishingPost(post);
  };

  const handlePublishSubmit = async (post: FacebookPost, pageIds: string[]) => {
    const res = await facebookPublishingService.publishPost(post, pageIds);
    if (res.success) {
      loadData();
      addToast('Đăng bài thành công lên Fanpage đã chọn!', 'success');
    } else {
      addToast(res.error || 'Đăng bài thất bại', 'error');
    }
    return res;
  };

  // Filter and search logic
  const filteredPosts = posts.filter((post) => {
    const caption = (post.editedCaption || post.originalCaption || '').toLowerCase();
    const page = (post.pageName || '').toLowerCase();
    const query = searchQuery.toLowerCase();
    
    const matchesSearch = caption.includes(query) || page.includes(query);
    const matchesStatus = statusFilter === 'all' || post.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-950 uppercase tracking-wider flex items-center gap-2">
            <Facebook className="w-6 h-6 text-blue-600 fill-current" />
            <span>Bài viết Facebook đã copy</span>
          </h2>
          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mt-1">
            Quản lý, biên tập và đồng bộ các bài viết được copy từ Facebook của đối thủ
          </p>
        </div>
        
        <button
          onClick={loadData}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all shadow-sm focus:outline-none shrink-0"
          id="btn-refresh-fb-posts"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Làm mới dữ liệu</span>
        </button>
      </div>

      {/* Stats Counter Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 p-4 rounded-2xl flex flex-col justify-between">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Tổng số bài viết</span>
          <span className="text-2xl font-black text-slate-900 mt-1">{posts.length}</span>
        </div>
        <div className="bg-white border border-slate-200 p-4 rounded-2xl flex flex-col justify-between">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Đang lưu nháp</span>
          <span className="text-2xl font-black text-blue-600 mt-1">
            {posts.filter(p => p.status === 'draft').length}
          </span>
        </div>
        <div className="bg-white border border-slate-200 p-4 rounded-2xl flex flex-col justify-between">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Đã đăng thành công</span>
          <span className="text-2xl font-black text-emerald-600 mt-1">
            {posts.filter(p => p.status === 'published').length}
          </span>
        </div>
        <div className="bg-white border border-slate-200 p-4 rounded-2xl flex flex-col justify-between">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Đăng thất bại</span>
          <span className="text-2xl font-black text-rose-600 mt-1">
            {posts.filter(p => p.status === 'failed').length}
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo nội dung bài viết, tên fanpage nguồn..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50/50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition-all shadow-inner"
            id="search-fb-posts"
          />
        </div>

        <div className="flex gap-2 shrink-0">
          <div className="relative">
            <Filter className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-50/50 border border-slate-200 rounded-xl pl-9 pr-8 py-2 text-xs font-semibold text-slate-700 outline-none cursor-pointer focus:border-blue-500 focus:bg-white transition-all appearance-none"
              id="filter-fb-posts-status"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="draft">Bản nháp (Draft)</option>
              <option value="published">Đã đăng (Published)</option>
              <option value="failed">Lỗi/Thất bại</option>
            </select>
          </div>
        </div>
      </div>

      {/* Posts Grid List */}
      {filteredPosts.length === 0 ? (
        <div className="bg-white border border-slate-150 rounded-2xl py-16 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mx-auto border border-slate-100 text-slate-400">
            <Search className="w-6 h-6" />
          </div>
          <p className="text-slate-500 font-medium text-xs">Không tìm thấy bài viết nào phù hợp.</p>
          <p className="text-[10px] text-slate-400">Hãy đảm bảo bạn đã copy bài viết từ tiện ích Voltara Importer.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPosts.map((post) => (
            <FacebookPostCard
              key={post.id}
              post={post}
              onEdit={onNavigateToEditor}
              onDelete={handleDelete}
              onPublish={handlePublishClick}
            />
          ))}
        </div>
      )}

      {/* Publish Dialog Trigger */}
      {publishingPost && (
        <FacebookPublishDialog
          post={publishingPost}
          pages={pages}
          onClose={() => setPublishingPost(null)}
          onPublish={handlePublishSubmit}
        />
      )}
    </div>
  );
};
