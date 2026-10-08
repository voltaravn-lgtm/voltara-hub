import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircle2, Facebook, ImagePlus, Loader2, RefreshCw, Send, Trash2, Upload
} from 'lucide-react';
import { FacebookMediaItem, FacebookPage, FacebookPost } from '../types/facebookTypes';
import { facebookPageService } from '../services/facebookPageService';
import { facebookPublishingService } from '../services/facebookPublishingService';

interface FacebookQuickPublishPageProps {
  addToast: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

export const FacebookQuickPublishPage: React.FC<FacebookQuickPublishPageProps> = ({ addToast }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pages, setPages] = useState<FacebookPage[]>([]);
  const [pageId, setPageId] = useState('');
  const [caption, setCaption] = useState('');
  const [media, setMedia] = useState<FacebookMediaItem[]>([]);
  const [loadingPages, setLoadingPages] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [lastPublishedPage, setLastPublishedPage] = useState('');

  const loadPages = async () => {
    setLoadingPages(true);
    try {
      const connected = (await facebookPageService.getPages()).filter(item => item.status === 'connected');
      setPages(connected);
      setPageId(current => connected.some(page => page.id === current) ? current : (connected[0]?.id || ''));
      if (connected.length === 0) addToast('Chưa có Fanpage nào được kết nối.', 'warning');
    } catch (error: any) {
      setPages([]);
      setPageId('');
      addToast(error?.message || 'Không tải được danh sách Fanpage.', 'error');
    } finally {
      setLoadingPages(false);
    }
  };

  useEffect(() => { void loadPages(); }, []);

  const selectedPage = useMemo(() => pages.find(page => page.id === pageId), [pages, pageId]);

  const uploadFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const accepted = Array.from(files).slice(0, Math.max(0, 20 - media.length));
    setUploading(true);
    try {
      const uploaded: FacebookMediaItem[] = [];
      for (const file of accepted) uploaded.push(await facebookPublishingService.uploadScheduleMedia(file));
      setMedia(current => [...current, ...uploaded]);
      addToast(`Đã tải lên ${uploaded.length} tệp media.`, 'success');
    } catch (error: any) {
      addToast(error?.message || 'Không tải được media.', 'error');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const resetForm = () => {
    setCaption('');
    setMedia([]);
    setLastPublishedPage('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const publishNow = async () => {
    if (!selectedPage) {
      addToast('Vui lòng chọn Fanpage cần đăng.', 'warning');
      return;
    }
    if (!caption.trim() && media.length === 0) {
      addToast('Bài đăng phải có nội dung hoặc ít nhất một ảnh/video.', 'warning');
      return;
    }
    if (!window.confirm(`Đăng bài này ngay lên Fanpage “${selectedPage.name}”?\n\nĐây là bài đăng thật và sẽ xuất hiện công khai trên Facebook.`)) return;

    const now = new Date().toISOString();
    const post: FacebookPost = {
      id: `fb_quick_${crypto.randomUUID?.() || Math.random().toString(36).slice(2)}`,
      pageName: selectedPage.name,
      postUrl: 'https://www.facebook.com',
      originalCaption: caption.trim(),
      editedCaption: caption.trim(),
      media,
      status: 'draft',
      createdAt: now,
      updatedAt: now
    };

    setPublishing(true);
    setLastPublishedPage('');
    try {
      const result = await facebookPublishingService.publishPost(post, [selectedPage.id]);
      if (!result.success) {
        addToast(result.error || 'Facebook từ chối đăng bài.', 'error');
        return;
      }
      setLastPublishedPage(selectedPage.name);
      addToast(`Đăng thành công lên ${selectedPage.name}.`, 'success');
      setCaption('');
      setMedia([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-950 uppercase tracking-wider flex items-center gap-2">
            <Send className="w-6 h-6 text-blue-600" />
            <span>Đăng nhanh Facebook</span>
          </h2>
          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mt-1">
            Đăng trực tiếp để kiểm tra Page token và quyền pages_manage_posts
          </p>
        </div>
        <button disabled={loadingPages || publishing} onClick={() => void loadPages()} className="flex items-center gap-2 px-3 py-2 text-xs font-bold border border-slate-200 rounded-xl bg-white disabled:opacity-50">
          <RefreshCw className={`w-4 h-4 ${loadingPages ? 'animate-spin' : ''}`} /> Làm mới Fanpage
        </button>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900 leading-relaxed">
        <strong>Lưu ý:</strong> nút Đăng ngay sẽ gửi bài thật lên đúng một Fanpage đang chọn. Hệ thống sẽ hỏi lại trước khi gửi và lưu kết quả vào <strong>Nhật ký đăng</strong>.
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-5">
        <label className="space-y-2 block">
          <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Fanpage cần đăng</span>
          <select value={pageId} onChange={event => setPageId(event.target.value)} disabled={loadingPages || publishing} className="w-full border border-slate-200 bg-slate-50 rounded-xl px-3 py-2.5 text-sm disabled:opacity-60" id="facebook-quick-page">
            <option value="">Chọn Fanpage</option>
            {pages.map(page => <option key={page.id} value={page.id}>{page.name}</option>)}
          </select>
        </label>

        <textarea
          value={caption}
          onChange={event => setCaption(event.target.value)}
          disabled={publishing}
          rows={8}
          placeholder="Nhập nội dung muốn đăng ngay..."
          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-slate-800 outline-none focus:border-blue-500 whitespace-pre-wrap disabled:opacity-60"
          id="facebook-quick-caption"
        />

        <div className="space-y-3">
          <div className="flex flex-wrap justify-between items-center gap-3">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Ảnh / video ({media.length}/20)</span>
            <button type="button" disabled={uploading || publishing || media.length >= 20} onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-50 text-blue-700 text-xs font-bold disabled:opacity-50">
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
              {uploading ? 'Đang tải lên...' : 'Thêm ảnh/video'}
            </button>
            <input ref={fileInputRef} type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime" className="hidden" onChange={event => void uploadFiles(event.target.files)} />
          </div>
          {media.length === 0 ? (
            <button type="button" disabled={uploading || publishing} onClick={() => fileInputRef.current?.click()} className="w-full border-2 border-dashed border-slate-200 rounded-xl py-8 text-xs text-slate-500 flex flex-col items-center gap-2 disabled:opacity-50">
              <Upload className="w-6 h-6" /> Chọn media từ máy tính (không bắt buộc)
            </button>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
              {media.map((item, index) => (
                <div key={`${item.url}-${index}`} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 bg-black group">
                  {item.type === 'video'
                    ? <video src={item.url} className="w-full h-full object-cover" muted controls preload="metadata" />
                    : <img src={item.url} className="w-full h-full object-cover" alt={`Media ${index + 1}`} />}
                  <button disabled={publishing} onClick={() => setMedia(current => current.filter((_, itemIndex) => itemIndex !== index))} className="absolute top-1.5 right-1.5 rounded-full bg-black/70 text-white p-1.5 opacity-80 group-hover:opacity-100 disabled:opacity-40" title="Xóa media"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              ))}
            </div>
          )}
        </div>

        {lastPublishedPage && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-700">
            <CheckCircle2 className="w-4 h-4" /> Đã đăng thành công lên {lastPublishedPage}.
          </div>
        )}

        <div className="flex flex-col sm:flex-row justify-end gap-3 pt-2">
          <button disabled={publishing} onClick={resetForm} className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold disabled:opacity-50">Xóa nội dung</button>
          <button disabled={uploading || publishing || loadingPages || !selectedPage} onClick={() => void publishNow()} className="px-5 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-50">
            {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Facebook className="w-4 h-4" />}
            {publishing ? 'Đang gửi lên Facebook...' : 'Đăng ngay lên Facebook'}
          </button>
        </div>
      </div>
    </div>
  );
};
