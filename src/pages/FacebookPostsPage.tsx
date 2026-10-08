import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { FacebookPost, FacebookPage } from '../types/facebookTypes';
import { facebookImportService } from '../services/facebookImportService';
import { facebookPageService } from '../services/facebookPageService';
import { facebookPublishingService } from '../services/facebookPublishingService';
import { FacebookPostCard } from '../components/facebook/FacebookPostCard';
import { FacebookPublishDialog } from '../components/facebook/FacebookPublishDialog';
import { Search, Filter, RefreshCw, FileSpreadsheet, PlusCircle, Facebook, Send, CheckSquare } from 'lucide-react';

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
  const [selectedPostIds, setSelectedPostIds] = useState<string[]>([]);
  const [bulkPageId, setBulkPageId] = useState('');
  const [bulkStarting, setBulkStarting] = useState(false);
  const [showFloatingBulkBar, setShowFloatingBulkBar] = useState(false);
  const bulkBarAnchorRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    const anchor = bulkBarAnchorRef.current;
    if (!anchor) return;

    let frameId = 0;
    const updateFloatingBar = () => {
      cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(() => {
        const anchorRect = anchor.getBoundingClientRect();
        setShowFloatingBulkBar(anchorRect.top < 72);
      });
    };

    // Capture scroll events from any nested scrolling container used by the app/browser.
    window.addEventListener('scroll', updateFloatingBar, { passive: true, capture: true });
    window.addEventListener('resize', updateFloatingBar);
    updateFloatingBar();

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('scroll', updateFloatingBar, true);
      window.removeEventListener('resize', updateFloatingBar);
    };
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

  const handleManualPublish = async (post: FacebookPost, pageId: string) => {
    const page = pages.find(item => item.id === pageId);
    if (!page) return { success: false, error: 'Không tìm thấy Fanpage đã chọn.' };
    const res = await facebookPublishingService.prepareManualPost(post, page);
    if (res.success) {
      addToast('Đã mở Facebook. Dùng bảng Voltara để điền bài rồi tự bấm Đăng.', 'info');
      setPublishingPost(null);
    } else {
      addToast(res.error || 'Không mở được trình đăng Facebook.', 'error');
    }
    return res;
  };

  const handlePostSelection = (id: string, selected: boolean) => {
    setSelectedPostIds(current => selected
      ? Array.from(new Set([...current, id]))
      : current.filter(item => item !== id));
  };

  const handleBulkAutoPublish = async () => {
    const postsById = new Map(posts.map(post => [post.id, post]));
    const selectedPosts = selectedPostIds
      .map(id => postsById.get(id))
      .filter((post): post is FacebookPost => Boolean(post));
    const page = pages.find(item => item.id === bulkPageId && item.status === 'connected');
    if (!selectedPosts.length) {
      addToast('Vui lòng chọn ít nhất một bài viết.', 'warning');
      return;
    }
    if (!page) {
      addToast('Vui lòng chọn Fanpage đích.', 'warning');
      return;
    }
    if (!window.confirm(`Tiện ích sẽ tự động đăng tuần tự ${selectedPosts.length} bài lên Fanpage “${page.name}”. Bạn muốn tiếp tục?`)) return;

    setBulkStarting(true);
    const result = await facebookPublishingService.prepareManualBatch(selectedPosts, page);
    setBulkStarting(false);
    if (result.success) {
      addToast(`Đã mở hàng đợi ${result.count || selectedPosts.length} bài. Không đóng tab Facebook cho đến khi hoàn tất.`, 'success');
    } else {
      addToast(result.error || 'Không khởi động được hàng đợi đăng bài.', 'error');
    }
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
  const connectedPages = pages.filter(page => page.status === 'connected');
  const allFilteredSelected = filteredPosts.length > 0 && filteredPosts.every(post => selectedPostIds.includes(post.id));

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

      {/* Bulk sequential publishing */}
      <div ref={bulkBarAnchorRef} className="min-h-[76px]">
        <div className={showFloatingBulkBar
          ? 'hidden'
          : ''}
        >
          <div className={showFloatingBulkBar ? 'max-w-7xl mx-auto pointer-events-auto' : ''}>
            <div className={`bg-blue-50/95 backdrop-blur-md border border-blue-200 rounded-2xl p-4 flex flex-col lg:flex-row lg:items-center gap-3 transition-shadow supports-[backdrop-filter]:bg-blue-50/85 ${showFloatingBulkBar ? 'shadow-xl ring-1 ring-blue-200/60' : 'shadow-sm'}`}>
        <button
          type="button"
          onClick={() => setSelectedPostIds(allFilteredSelected
            ? selectedPostIds.filter(id => !filteredPosts.some(post => post.id === id))
            : Array.from(new Set([...selectedPostIds, ...filteredPosts.map(post => post.id)])))}
          className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-blue-200 bg-white text-blue-700 text-xs font-bold hover:bg-blue-50"
        >
          <CheckSquare className="w-4 h-4" />
          {allFilteredSelected ? 'Bỏ chọn danh sách đang xem' : 'Chọn tất cả đang xem'}
        </button>

        <div className="text-xs font-bold text-slate-700 whitespace-nowrap">
          Đã chọn <span className="text-blue-700 text-sm">{selectedPostIds.length}</span> bài
        </div>

        <select
          value={bulkPageId}
          onChange={event => setBulkPageId(event.target.value)}
          className="flex-1 min-w-0 bg-white border border-blue-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-blue-500"
        >
          <option value="">Chọn Fanpage cần đăng...</option>
          {connectedPages.map(page => (
            <option key={page.id} value={page.id}>{page.name}</option>
          ))}
        </select>

        <button
          type="button"
          onClick={handleBulkAutoPublish}
          disabled={bulkStarting || selectedPostIds.length === 0 || !bulkPageId}
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-extrabold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
        >
          <Send className="w-4 h-4" />
          {bulkStarting ? 'Đang tạo hàng đợi...' : 'Tự động đăng tuần tự'}
        </button>
            </div>
          </div>
        </div>
      </div>

      {showFloatingBulkBar && createPortal(
        <div className="fixed top-[72px] left-0 md:left-64 right-0 z-[100] px-4 sm:px-6 lg:px-8 pointer-events-none">
          <div className="max-w-7xl mx-auto pointer-events-auto">
            <div className="bg-blue-50/95 backdrop-blur-md border border-blue-300 rounded-2xl p-4 flex flex-col lg:flex-row lg:items-center gap-3 shadow-2xl ring-1 ring-blue-300/70">
              <button
                type="button"
                onClick={() => setSelectedPostIds(allFilteredSelected
                  ? selectedPostIds.filter(id => !filteredPosts.some(post => post.id === id))
                  : Array.from(new Set([...selectedPostIds, ...filteredPosts.map(post => post.id)])))}
                className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-blue-200 bg-white text-blue-700 text-xs font-bold hover:bg-blue-50"
              >
                <CheckSquare className="w-4 h-4" />
                {allFilteredSelected ? 'Bỏ chọn danh sách đang xem' : 'Chọn tất cả đang xem'}
              </button>

              <div className="text-xs font-bold text-slate-700 whitespace-nowrap">
                Đã chọn <span className="text-blue-700 text-sm">{selectedPostIds.length}</span> bài
              </div>

              <select
                value={bulkPageId}
                onChange={event => setBulkPageId(event.target.value)}
                className="flex-1 min-w-0 bg-white border border-blue-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-blue-500"
              >
                <option value="">Chọn Fanpage cần đăng...</option>
                {connectedPages.map(page => (
                  <option key={page.id} value={page.id}>{page.name}</option>
                ))}
              </select>

              <button
                type="button"
                onClick={handleBulkAutoPublish}
                disabled={bulkStarting || selectedPostIds.length === 0 || !bulkPageId}
                className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-extrabold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                <Send className="w-4 h-4" />
                {bulkStarting ? 'Đang tạo hàng đợi...' : 'Tự động đăng tuần tự'}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}

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
              selected={selectedPostIds.includes(post.id)}
              selectionOrder={selectedPostIds.indexOf(post.id) + 1}
              onSelectionChange={handlePostSelection}
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
          onManualPublish={handleManualPublish}
        />
      )}
    </div>
  );
};
