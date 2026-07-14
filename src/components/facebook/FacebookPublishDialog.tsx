import React, { useState } from 'react';
import { FacebookPost, FacebookPage } from '../../types/facebookTypes';
import { FacebookPageSelector } from './FacebookPageSelector';
import { X, Send, CheckCircle2, AlertCircle } from 'lucide-react';

interface FacebookPublishDialogProps {
  post: FacebookPost;
  pages: FacebookPage[];
  onClose: () => void;
  onPublish: (post: FacebookPost, pageIds: string[]) => Promise<{ success: boolean; error?: string }>;
}

export const FacebookPublishDialog: React.FC<FacebookPublishDialogProps> = ({
  post,
  pages,
  onClose,
  onPublish,
}) => {
  const [selectedPageIds, setSelectedPageIds] = useState<string[]>(post.targetPages || []);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; error?: string } | null>(null);

  const handleSubmit = async () => {
    if (selectedPageIds.length === 0) {
      alert('Vui lòng chọn ít nhất một Fanpage để đăng bài!');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await onPublish(post, selectedPageIds);
      setResult(res);
    } catch (err: any) {
      setResult({ success: false, error: err.message || 'Lỗi không xác định.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-xl overflow-hidden animate-scale-up">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-extrabold text-slate-900 text-sm md:text-base uppercase tracking-wider">
            Đăng bài viết lên Fanpage
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-50 text-slate-400 hover:text-slate-700 rounded-lg transition-colors"
            title="Đóng cửa sổ"
            disabled={isSubmitting}
            id="btn-close-publish-dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          {!result ? (
            <>
              {/* Post Caption Preview */}
              <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-2xl text-xs space-y-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Xem trước nội dung đăng</span>
                <p className="text-slate-700 leading-relaxed truncate-3-lines whitespace-pre-wrap">
                  {post.editedCaption || post.originalCaption}
                </p>
              </div>

              {/* Page Selector */}
              <FacebookPageSelector
                pages={pages}
                selectedPageIds={selectedPageIds}
                onSelectionChange={setSelectedPageIds}
              />
            </>
          ) : (
            <div className="py-6 text-center space-y-4">
              {result.success ? (
                <div className="space-y-2">
                  <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center mx-auto text-emerald-500 border border-emerald-100">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h4 className="font-extrabold text-slate-900 text-sm md:text-base">Đăng tải thành công!</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                    Dữ liệu bài viết đã được đẩy lên Facebook API và đồng bộ thành công vào các Fanpage đã chọn. Nhật ký đăng đã được ghi nhận.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="w-14 h-14 bg-rose-50 rounded-full flex items-center justify-center mx-auto text-rose-500 border border-rose-100">
                    <AlertCircle className="w-8 h-8" />
                  </div>
                  <h4 className="font-extrabold text-slate-900 text-sm md:text-base">Có lỗi xảy ra!</h4>
                  <p className="text-xs text-rose-700 max-w-sm mx-auto leading-relaxed bg-rose-50 p-3 rounded-xl border border-rose-100 break-words">
                    {result.error}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 bg-slate-50 border-t border-slate-100 flex gap-3 justify-end">
          {!result ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                disabled={isSubmitting}
                id="btn-cancel-publish"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting || selectedPageIds.length === 0}
                className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                id="btn-confirm-publish"
              >
                {isSubmitting ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle><path d="M4 12a8 8 0 0 1 8-8"></path></svg>
                    <span>Đang đẩy bài...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Đồng ý đăng bài</span>
                  </>
                )}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
              id="btn-close-publish-result"
            >
              Đóng lại
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
