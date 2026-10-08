import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CalendarClock, CheckCircle2, Clock3, Edit3, ExternalLink, Facebook,
  ImagePlus, Loader2, Plus, RefreshCw, Save, Trash2, Upload, X
} from 'lucide-react';
import {
  FacebookMediaItem, FacebookPage, FacebookPost, FacebookScheduleDraft
} from '../types/facebookTypes';
import { facebookPageService } from '../services/facebookPageService';
import { facebookPublishingService } from '../services/facebookPublishingService';
import { facebookScheduleDraftService } from '../services/facebookScheduleDraftService';

interface FacebookSchedulePageProps {
  onNavigateToEditor?: (post: FacebookPost) => void;
  addToast: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

const toLocalInputValue = (date: Date) => {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
};

const defaultScheduleTime = () => toLocalInputValue(new Date(Date.now() + 30 * 60_000));
const minimumScheduleTime = () => toLocalInputValue(new Date(Date.now() + 20 * 60_000));
const maximumScheduleTime = () => toLocalInputValue(new Date(Date.now() + 29 * 24 * 60 * 60_000));

const statusLabel: Record<FacebookScheduleDraft['status'], string> = {
  draft: 'Bản nháp',
  opened: 'Đã mở Facebook',
  scheduled: 'Đã xác nhận lịch',
  cancelled: 'Đã hủy'
};

export const FacebookSchedulePage: React.FC<FacebookSchedulePageProps> = ({ addToast }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [drafts, setDrafts] = useState<FacebookScheduleDraft[]>([]);
  const [pages, setPages] = useState<FacebookPage[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [media, setMedia] = useState<FacebookMediaItem[]>([]);
  const [pageId, setPageId] = useState('');
  const [scheduledAt, setScheduledAt] = useState(defaultScheduleTime());
  const [uploading, setUploading] = useState(false);
  const [openingId, setOpeningId] = useState<string | null>(null);

  const loadData = async () => {
    setDrafts(facebookScheduleDraftService.getDrafts());
    try {
      const connected = (await facebookPageService.getPages()).filter(item => item.status === 'connected');
      setPages(connected);
      setPageId(current => current || connected[0]?.id || '');
    } catch (error: any) {
      setPages([]);
      addToast(error?.message || 'Không tải được danh sách Fanpage.', 'warning');
    }
  };

  useEffect(() => { void loadData(); }, []);

  const selectedPage = useMemo(() => pages.find(item => item.id === pageId), [pages, pageId]);

  const resetForm = () => {
    setEditingId(null);
    setCaption('');
    setMedia([]);
    setScheduledAt(defaultScheduleTime());
    setPageId(current => current || pages[0]?.id || '');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const validateForm = () => {
    if (!caption.trim() && media.length === 0) return 'Bài mới phải có caption hoặc ít nhất một ảnh/video.';
    if (!selectedPage) return 'Vui lòng chọn Fanpage cần hẹn lịch.';
    const timestamp = Date.parse(scheduledAt);
    if (Number.isNaN(timestamp)) return 'Thời gian hẹn lịch không hợp lệ.';
    if (timestamp < Date.now() + 19 * 60_000) return 'Facebook yêu cầu lịch đăng cách hiện tại ít nhất khoảng 20 phút.';
    if (timestamp > Date.now() + 29 * 24 * 60 * 60_000) return 'Facebook chỉ cho hẹn lịch tối đa khoảng 29 ngày.';
    return '';
  };

  const buildDraft = (): FacebookScheduleDraft | null => {
    const error = validateForm();
    if (error || !selectedPage) {
      addToast(error || 'Fanpage không hợp lệ.', 'warning');
      return null;
    }
    const existing = editingId ? drafts.find(item => item.id === editingId) : undefined;
    const now = new Date().toISOString();
    return {
      id: existing?.id || `fb_schedule_${crypto.randomUUID?.() || Math.random().toString(36).slice(2)}`,
      caption: caption.trim(),
      media,
      pageId: selectedPage.id,
      pageName: selectedPage.name,
      scheduledAt: new Date(scheduledAt).toISOString(),
      status: existing?.status === 'scheduled' ? 'scheduled' : 'draft',
      lastOpenedAt: existing?.lastOpenedAt,
      createdAt: existing?.createdAt || now,
      updatedAt: now
    };
  };

  const saveDraft = () => {
    const draft = buildDraft();
    if (!draft) return null;
    facebookScheduleDraftService.saveDraft(draft);
    setDrafts(facebookScheduleDraftService.getDrafts());
    setEditingId(draft.id);
    addToast('Đã lưu bài hẹn lịch vào kho riêng.', 'success');
    return draft;
  };

  const editDraft = (draft: FacebookScheduleDraft) => {
    setEditingId(draft.id);
    setCaption(draft.caption);
    setMedia(draft.media);
    setPageId(draft.pageId);
    setScheduledAt(toLocalInputValue(new Date(draft.scheduledAt)));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const uploadFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const accepted = Array.from(files).slice(0, Math.max(0, 20 - media.length));
    setUploading(true);
    try {
      const uploaded: FacebookMediaItem[] = [];
      for (const file of accepted) {
        uploaded.push(await facebookPublishingService.uploadScheduleMedia(file));
      }
      setMedia(current => [...current, ...uploaded]);
      addToast(`Đã tải lên ${uploaded.length} tệp media.`, 'success');
    } catch (error: any) {
      addToast(error?.message || 'Không tải được media.', 'error');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const openFacebookForSchedule = async (source?: FacebookScheduleDraft) => {
    const draft = source || buildDraft();
    if (!draft) return;
    facebookScheduleDraftService.saveDraft(draft);
    setOpeningId(draft.id);
    const post: FacebookPost = {
      id: draft.id,
      pageName: draft.pageName,
      postUrl: 'https://www.facebook.com',
      originalCaption: draft.caption,
      editedCaption: draft.caption,
      media: draft.media,
      status: 'draft',
      scheduledAt: draft.scheduledAt,
      createdAt: draft.createdAt,
      updatedAt: draft.updatedAt
    };
    const result = await facebookPublishingService.prepareManualScheduledPost(
      post,
      { id: draft.pageId, name: draft.pageName },
      draft.scheduledAt
    );
    setOpeningId(null);
    if (!result.success) {
      addToast(result.error || 'Không mở được Facebook để hẹn lịch.', 'error');
      return;
    }
    facebookScheduleDraftService.saveDraft({
      ...draft,
      status: 'opened',
      lastOpenedAt: new Date().toISOString()
    });
    setDrafts(facebookScheduleDraftService.getDrafts());
    addToast('Đã mở Facebook. Tiện ích sẽ điền bài; bạn chọn Lên lịch và xác nhận giờ đăng.', 'info');
  };

  const updateStatus = (draft: FacebookScheduleDraft, status: FacebookScheduleDraft['status']) => {
    facebookScheduleDraftService.saveDraft({ ...draft, status });
    setDrafts(facebookScheduleDraftService.getDrafts());
  };

  const deleteDraft = (draft: FacebookScheduleDraft) => {
    if (!window.confirm('Xóa bài hẹn lịch này khỏi Voltara? Thao tác không xóa lịch đã tạo trên Facebook.')) return;
    facebookScheduleDraftService.deleteDraft(draft.id);
    if (editingId === draft.id) resetForm();
    setDrafts(facebookScheduleDraftService.getDrafts());
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-950 uppercase tracking-wider flex items-center gap-2">
            <CalendarClock className="w-6 h-6 text-blue-600" />
            <span>Soạn bài mới & hẹn lịch Facebook</span>
          </h2>
          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mt-1">
            Voltara chuẩn bị nội dung; Facebook lưu và thực thi lịch đăng
          </p>
        </div>
        <button onClick={() => void loadData()} className="flex items-center gap-2 px-3 py-2 text-xs font-bold border border-slate-200 rounded-xl bg-white">
          <RefreshCw className="w-4 h-4" /> Làm mới
        </button>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-xs text-blue-900 leading-relaxed">
        <strong>Cách hoạt động ổn định:</strong> lưu bài ở Voltara → mở đúng Fanpage → tiện ích điền caption và media → bạn chọn <strong>Lên lịch</strong>, kiểm tra thời gian rồi xác nhận trên Facebook. Voltara không chạy bộ đếm giờ nền nên đóng máy hoặc Vercel ngủ cũng không làm mất lịch Facebook.
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-5">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2 font-extrabold text-slate-900">
            {editingId ? <Edit3 className="w-5 h-5 text-blue-600" /> : <Plus className="w-5 h-5 text-blue-600" />}
            {editingId ? 'Chỉnh sửa bài hẹn lịch' : 'Tạo bài mới'}
          </div>
          {editingId && <button onClick={resetForm} className="text-xs font-bold text-slate-500 flex items-center gap-1"><X className="w-4 h-4" /> Bài mới</button>}
        </div>

        <textarea
          value={caption}
          onChange={event => setCaption(event.target.value)}
          rows={7}
          placeholder="Nhập nội dung bài viết mới..."
          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-slate-800 outline-none focus:border-blue-500 whitespace-pre-wrap"
          id="facebook-schedule-caption"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="space-y-2">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Fanpage cần đăng</span>
            <select value={pageId} onChange={event => setPageId(event.target.value)} className="w-full border border-slate-200 bg-slate-50 rounded-xl px-3 py-2.5 text-sm" id="facebook-schedule-page">
              <option value="">Chọn Fanpage</option>
              {pages.map(page => <option key={page.id} value={page.id}>{page.name}</option>)}
            </select>
          </label>
          <label className="space-y-2">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Ngày giờ dự kiến</span>
            <input type="datetime-local" value={scheduledAt} min={minimumScheduleTime()} max={maximumScheduleTime()} onChange={event => setScheduledAt(event.target.value)} className="w-full border border-slate-200 bg-slate-50 rounded-xl px-3 py-2.5 text-sm" id="facebook-schedule-time" />
          </label>
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap justify-between items-center gap-3">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Ảnh / video ({media.length}/20)</span>
            <button type="button" disabled={uploading || media.length >= 20} onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-50 text-blue-700 text-xs font-bold disabled:opacity-50">
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
              {uploading ? 'Đang tải lên...' : 'Thêm ảnh/video'}
            </button>
            <input ref={fileInputRef} type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime" className="hidden" onChange={event => void uploadFiles(event.target.files)} />
          </div>
          {media.length === 0 ? (
            <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full border-2 border-dashed border-slate-200 rounded-xl py-8 text-xs text-slate-500 flex flex-col items-center gap-2">
              <Upload className="w-6 h-6" /> Chọn media từ máy tính (không bắt buộc)
            </button>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
              {media.map((item, index) => (
                <div key={`${item.url}-${index}`} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 bg-black group">
                  {item.type === 'video'
                    ? <video src={item.url} className="w-full h-full object-cover" muted controls preload="metadata" />
                    : <img src={item.url} className="w-full h-full object-cover" alt={`Media ${index + 1}`} />}
                  <button onClick={() => setMedia(current => current.filter((_, itemIndex) => itemIndex !== index))} className="absolute top-1.5 right-1.5 rounded-full bg-black/70 text-white p-1.5 opacity-80 group-hover:opacity-100" title="Xóa media"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row justify-end gap-3 pt-2">
          <button onClick={saveDraft} className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold flex items-center justify-center gap-2"><Save className="w-4 h-4" /> Lưu bản nháp</button>
          <button disabled={uploading || openingId !== null} onClick={() => void openFacebookForSchedule()} className="px-4 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-50">
            {openingId ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
            Mở Facebook để hẹn lịch
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-extrabold text-slate-900 flex items-center gap-2"><Clock3 className="w-5 h-5 text-blue-600" /> Danh sách chuẩn bị lịch ({drafts.length})</h3>
        </div>
        {drafts.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl py-12 text-center text-sm text-slate-500">Chưa có bài mới nào được chuẩn bị để hẹn lịch.</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {drafts.map(draft => (
              <article key={draft.id} className="bg-white border border-slate-200 rounded-2xl p-4 space-y-4">
                <div className="flex justify-between gap-3">
                  <div>
                    <div className="font-bold text-sm text-slate-900 flex items-center gap-2"><Facebook className="w-4 h-4 text-blue-600" /> {draft.pageName}</div>
                    <div className="text-xs text-blue-700 font-bold mt-1">{new Date(draft.scheduledAt).toLocaleString('vi-VN')}</div>
                  </div>
                  <span className={`h-fit px-2.5 py-1 rounded-full text-[10px] font-bold ${draft.status === 'scheduled' ? 'bg-emerald-100 text-emerald-700' : draft.status === 'opened' ? 'bg-amber-100 text-amber-700' : draft.status === 'cancelled' ? 'bg-rose-100 text-rose-700' : 'bg-blue-100 text-blue-700'}`}>{statusLabel[draft.status]}</span>
                </div>
                <p className="text-xs text-slate-700 whitespace-pre-wrap line-clamp-5">{draft.caption || '(Bài chỉ có media)'}</p>
                <div className="text-[11px] text-slate-500">{draft.media.length} tệp media</div>
                <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                  <button onClick={() => editDraft(draft)} className="px-3 py-2 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold flex items-center gap-1"><Edit3 className="w-3.5 h-3.5" /> Sửa</button>
                  <button disabled={openingId !== null} onClick={() => void openFacebookForSchedule(draft)} className="px-3 py-2 rounded-lg bg-blue-600 text-white text-xs font-bold flex items-center gap-1 disabled:opacity-50">{openingId === draft.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ExternalLink className="w-3.5 h-3.5" />} Mở Facebook</button>
                  {draft.status === 'opened' && <button onClick={() => updateStatus(draft, 'scheduled')} className="px-3 py-2 rounded-lg bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Đã hẹn trên Facebook</button>}
                  <button onClick={() => deleteDraft(draft)} className="ml-auto p-2 text-rose-600 hover:bg-rose-50 rounded-lg" title="Xóa"><Trash2 className="w-4 h-4" /></button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
