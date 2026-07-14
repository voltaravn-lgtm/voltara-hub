import React, { useState } from 'react';
import { FacebookPost } from '../../types/facebookTypes';
import { Clock, Edit, Trash2, Globe, AlertCircle, CheckCircle, Share2, Eye } from 'lucide-react';
import { FacebookDashVideo } from './FacebookDashVideo';

interface FacebookPostCardProps {
  post: FacebookPost;
  onEdit: (post: FacebookPost) => void;
  onDelete: (id: string) => void;
  onPublish: (post: FacebookPost) => void;
}

export const FacebookPostCard: React.FC<FacebookPostCardProps> = ({
  post,
  onEdit,
  onDelete,
  onPublish,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const isDirectVideoUrl = (url: string) =>
    /^https?:\/\//i.test(url) &&
    !/(?:facebook\.com|fb\.watch)\/(?:reel|reels|posts|videos)?/i.test(url);

  // Status Badge Helper
  const renderStatusBadge = () => {
    switch (post.status) {
      case 'published':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
            <span>Đã đăng</span>
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200" title={post.errorLog}>
            <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
            <span>Thất bại</span>
          </span>
        );
      case 'draft':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <Clock className="w-3.5 h-3.5 text-blue-500" />
            <span>Bản nháp</span>
          </span>
        );
    }
  };

  const captionText = post.editedCaption || post.originalCaption;
  const isLongText = captionText.length > 200;
  const displayText = isExpanded ? captionText : (isLongText ? captionText.slice(0, 200) + '...' : captionText);

  return (
    <div id={`fb-card-${post.id}`} className="bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col justify-between">
      {/* Post Header */}
      <div className="p-4 border-b border-slate-100 flex justify-between items-start gap-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center font-bold text-blue-700 text-sm">
            {post.pageName ? post.pageName.charAt(0) : 'FB'}
          </div>
          <div>
            <h4 className="font-bold text-slate-900 text-sm leading-snug">{post.pageName || 'Trang Facebook'}</h4>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
              <Globe className="w-3 h-3" />
              <span>Bài viết đã copy</span>
              <span>•</span>
              <span>{new Date(post.createdAt).toLocaleDateString('vi-VN')}</span>
            </div>
          </div>
        </div>
        {renderStatusBadge()}
      </div>

      {/* Post Body (Caption & Media Preview) */}
      <div className="p-4 flex-1 flex flex-col gap-3">
        <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap break-words">
          {displayText}
          {isLongText && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 ml-1.5 focus:outline-none"
            >
              {isExpanded ? 'Thu gọn' : 'Xem thêm'}
            </button>
          )}
        </p>

        {/* Media Grid Preview */}
        {post.media && post.media.length > 0 && (
          <div className={`grid gap-1 rounded-xl overflow-hidden ${post.media.length === 1 ? 'grid-cols-1' : 'grid-cols-2'} max-h-48 border border-slate-100`}>
            {post.media.slice(0, 2).map((item, idx) => (
              <div key={idx} className="relative aspect-video bg-slate-50">
                {item.type === 'video' && isDirectVideoUrl(item.url) ? (
                  <FacebookDashVideo
                    src={item.url}
                    audioUrl={item.audioUrl}
                    poster={item.thumbnail}
                    controls
                    playsInline
                    preload="metadata"
                    className="w-full h-full object-cover bg-black"
                  />
                ) : item.type === 'video' ? (
                  item.thumbnail ? (
                    <img src={item.thumbnail} alt="Video Facebook" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full bg-slate-900" />
                  )
                ) : (
                  <img src={item.url} alt="Post media" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                )}
                {item.type === 'video' && !isDirectVideoUrl(item.url) && (
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                    <div className="w-9 h-9 rounded-full bg-white/90 shadow flex items-center justify-center">
                      <div className="w-0 h-0 border-t-4 border-t-transparent border-l-8 border-l-slate-800 border-b-4 border-b-transparent ml-0.5"></div>
                    </div>
                  </div>
                )}
                {item.type === 'video' && item.audioUrl && (
                  <div className="absolute top-2 left-2 rounded-md bg-emerald-600/90 px-2 py-1 text-[10px] font-bold text-white shadow">
                    Video + tiếng
                  </div>
                )}
                {idx === 1 && post.media.length > 2 && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white font-bold text-sm">
                    +{post.media.length - 2} ảnh khác
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {post.scheduledAt && post.status === 'draft' && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs px-3 py-2 rounded-xl flex items-center gap-2 mt-1">
            <Clock className="w-4 h-4 text-amber-600" />
            <span className="font-semibold">Lịch đăng: {new Date(post.scheduledAt).toLocaleString('vi-VN')}</span>
          </div>
        )}

        {post.status === 'failed' && post.errorLog && (
          <div className="bg-rose-50 border border-rose-100 text-rose-800 text-[11px] p-3 rounded-xl flex gap-2 mt-1 break-words">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed"><strong className="font-bold">Lỗi:</strong> {post.errorLog}</p>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex gap-2 justify-end">
        <button
          onClick={() => onDelete(post.id)}
          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
          title="Xóa bài viết"
          id={`btn-delete-fb-${post.id}`}
        >
          <Trash2 className="w-4 h-4" />
        </button>

        <a
          href={post.postUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all flex items-center justify-center"
          title="Xem bài viết gốc trên Facebook"
          id={`btn-view-fb-${post.id}`}
        >
          <Eye className="w-4 h-4" />
        </a>

        <button
          onClick={() => onEdit(post)}
          className="flex items-center gap-1.5 px-3 py-2 text-slate-700 hover:text-slate-900 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all text-xs font-bold shadow-sm"
          id={`btn-edit-fb-${post.id}`}
        >
          <Edit className="w-3.5 h-3.5" />
          <span>Biên tập</span>
        </button>

        <button
          onClick={() => onPublish(post)}
          className="flex items-center gap-1.5 px-3.5 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all text-xs font-bold shadow-sm shadow-blue-500/10"
          id={`btn-publish-fb-${post.id}`}
        >
          <Share2 className="w-3.5 h-3.5" />
          <span>Đăng bài</span>
        </button>
      </div>
    </div>
  );
};
