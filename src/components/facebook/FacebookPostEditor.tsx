import React, { useState } from 'react';
import { FacebookPost, FacebookPage, FacebookMediaItem } from '../../types/facebookTypes';
import { FacebookPageSelector } from './FacebookPageSelector';
import { FacebookMediaGrid } from './FacebookMediaGrid';
import { FileText, Save, Send, Calendar, ArrowLeft, RefreshCw, AlertTriangle } from 'lucide-react';

interface FacebookPostEditorProps {
  post: FacebookPost;
  pages: FacebookPage[];
  onSaveDraft: (post: FacebookPost) => void;
  onPublishNow: (post: FacebookPost, pageIds: string[]) => void;
  onSchedule: (post: FacebookPost, pageIds: string[], time: string) => void;
  onCancel: () => void;
}

export const FacebookPostEditor: React.FC<FacebookPostEditorProps> = ({
  post,
  pages,
  onSaveDraft,
  onPublishNow,
  onSchedule,
  onCancel,
}) => {
  const [editedCaption, setEditedCaption] = useState(post.editedCaption || post.originalCaption);
  const [media, setMedia] = useState<FacebookMediaItem[]>(post.media || []);
  const [selectedPageIds, setSelectedPageIds] = useState<string[]>(post.targetPages || []);
  const [scheduleTime, setScheduleTime] = useState(post.scheduledAt || '');
  const [isScheduling, setIsScheduling] = useState(!!post.scheduledAt);

  const handleSaveDraft = () => {
    const updatedPost: FacebookPost = {
      ...post,
      editedCaption,
      media,
      targetPages: selectedPageIds,
      scheduledAt: isScheduling ? scheduleTime : undefined,
    };
    onSaveDraft(updatedPost);
  };

  const handlePublishNow = () => {
    if (selectedPageIds.length === 0) {
      alert('Vui lòng chọn ít nhất một Fanpage đích để đăng bài.');
      return;
    }
    const updatedPost: FacebookPost = {
      ...post,
      editedCaption,
      media,
      targetPages: selectedPageIds,
    };
    onPublishNow(updatedPost, selectedPageIds);
  };

  const handleScheduleSubmit = () => {
    if (selectedPageIds.length === 0) {
      alert('Vui lòng chọn ít nhất một Fanpage đích để lên lịch.');
      return;
    }
    if (!scheduleTime) {
      alert('Vui lòng chọn ngày và giờ muốn đăng.');
      return;
    }
    const updatedPost: FacebookPost = {
      ...post,
      editedCaption,
      media,
      targetPages: selectedPageIds,
    };
    onSchedule(updatedPost, selectedPageIds, scheduleTime);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Editor Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <button
            onClick={onCancel}
            className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-50 border border-slate-100 rounded-xl transition-all"
            title="Quay lại"
            id="btn-back-editor"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Biên tập bài viết Facebook</h2>
            <p className="text-xs text-slate-500 font-medium">Chỉnh sửa captions, hình ảnh và thiết lập đăng tải Fanpage</p>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={handleSaveDraft}
            className="flex items-center gap-1.5 px-4 py-2 text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 font-bold text-xs shadow-sm transition-all"
            id="btn-save-draft"
          >
            <Save className="w-4 h-4" />
            <span>Lưu bản nháp</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Editor Controls (8/12 width) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Caption editor */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              Nội dung biên tập (Caption mới)
            </label>
            <textarea
              value={editedCaption}
              onChange={(e) => setEditedCaption(e.target.value)}
              rows={8}
              className="w-full bg-slate-50/50 border border-slate-200 focus:bg-white focus:border-blue-500 rounded-2xl p-4 text-sm text-slate-800 leading-relaxed outline-none transition-all shadow-inner focus:ring-1 focus:ring-blue-500/20"
              placeholder="Nhập nội dung bài viết đăng Facebook..."
              id="fb-editor-caption"
            />
          </div>

          {/* Media list */}
          <FacebookMediaGrid mediaList={media} onMediaChange={setMedia} />

          {/* Fanpage target select */}
          <FacebookPageSelector
            pages={pages}
            selectedPageIds={selectedPageIds}
            onSelectionChange={setSelectedPageIds}
          />
        </div>

        {/* Right Column: References & Scheduling (4/12 width) */}
        <div className="lg:col-span-4 space-y-6 lg:border-l lg:border-slate-100 lg:pl-6">
          {/* Posting Options: Now vs Schedule */}
          <div className="bg-slate-50 rounded-2xl border border-slate-100 p-4 space-y-4">
            <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-slate-500">Cấu hình đăng tải</h4>

            <div className="space-y-3">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="radio"
                  name="schedule_type"
                  checked={!isScheduling}
                  onChange={() => setIsScheduling(false)}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span>Đăng tải ngay lập tức</span>
              </label>

              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="radio"
                  name="schedule_type"
                  checked={isScheduling}
                  onChange={() => setIsScheduling(true)}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span>Lên lịch đăng bài (Schedule)</span>
              </label>
            </div>

            {isScheduling && (
              <div className="space-y-1.5 pt-2 border-t border-slate-200/50">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Chọn ngày & giờ đăng</span>
                <input
                  type="datetime-local"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-blue-500 shadow-sm"
                  min={new Date().toISOString().slice(0, 16)}
                  id="fb-editor-schedule-time"
                />
              </div>
            )}

            {isScheduling ? (
              <button
                type="button"
                onClick={handleScheduleSubmit}
                className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition-all text-xs font-bold shadow-md shadow-amber-500/10"
                id="btn-schedule-post"
              >
                <Calendar className="w-4 h-4" />
                <span>Lên lịch đăng tải</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handlePublishNow}
                className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all text-xs font-bold shadow-md shadow-blue-500/10"
                id="btn-publish-now"
              >
                <Send className="w-4 h-4" />
                <span>Đăng ngay lên Fanpage</span>
              </button>
            )}
          </div>

          {/* Original Post Reference Panel */}
          <div className="bg-slate-50 rounded-2xl border border-slate-100 p-4 space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200/60">
              <span className="font-bold text-slate-900 text-xs uppercase tracking-wider text-slate-500">Bài viết gốc (Xem tham khảo)</span>
              {post.postUrl && (
                <a
                  href={post.postUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] font-bold text-blue-600 hover:underline"
                >
                  Facebook link ↗
                </a>
              )}
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto pr-1">
              {post.originalCaption || 'Không có nội dung gốc.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
