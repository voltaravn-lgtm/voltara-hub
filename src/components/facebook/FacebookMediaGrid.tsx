import React, { useState } from 'react';
import { FacebookMediaItem } from '../../types/facebookTypes';
import { Trash2, Plus, Image as ImageIcon, Video, X } from 'lucide-react';
import { FacebookDashVideo } from './FacebookDashVideo';

interface FacebookMediaGridProps {
  mediaList: FacebookMediaItem[];
  onMediaChange: (updated: FacebookMediaItem[]) => void;
}

export const FacebookMediaGrid: React.FC<FacebookMediaGridProps> = ({
  mediaList,
  onMediaChange,
}) => {
  const [newUrl, setNewUrl] = useState('');
  const [newType, setNewType] = useState<'image' | 'video'>('image');
  const [showAddForm, setShowAddForm] = useState(false);
  const [videoStatus, setVideoStatus] = useState<Record<string, 'loading' | 'ready' | 'audio' | 'error'>>({});
  const isDirectVideoUrl = (url: string) =>
    /^https?:\/\//i.test(url) &&
    !/(?:facebook\.com|fb\.watch)\/(?:reel|reels|posts|videos)?/i.test(url);

  const handleRemove = (index: number) => {
    const updated = mediaList.filter((_, i) => i !== index);
    onMediaChange(updated);
  };

  const handleAddMedia = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUrl.trim()) return;

    const newItem: FacebookMediaItem = {
      type: newType,
      url: newUrl.trim(),
      ...(newType === 'video' ? { thumbnail: 'https://images.unsplash.com/photo-1534224039826-c7a0dea0e66a?auto=format&fit=crop&q=80&w=400' } : {})
    };

    onMediaChange([...mediaList, newItem]);
    setNewUrl('');
    setShowAddForm(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
          Danh sách hình ảnh / Video ({mediaList.length})
        </label>
        
        <button
          type="button"
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors"
          id="btn-toggle-add-media"
        >
          {showAddForm ? (
            <>
              <X className="w-3.5 h-3.5" />
              <span>Hủy bỏ</span>
            </>
          ) : (
            <>
              <Plus className="w-3.5 h-3.5" />
              <span>Thêm ảnh/link video</span>
            </>
          )}
        </button>
      </div>

      {/* Add Media URL Form */}
      {showAddForm && (
        <form onSubmit={handleAddMedia} className="bg-slate-50 border border-slate-200 p-3 rounded-xl space-y-3 shadow-inner">
          <div className="flex gap-4">
            <label className="flex items-center gap-1.5 text-xs font-medium text-slate-700 cursor-pointer">
              <input
                type="radio"
                name="mediaType"
                checked={newType === 'image'}
                onChange={() => setNewType('image')}
                className="text-blue-600 focus:ring-blue-500"
              />
              <span>Hình ảnh</span>
            </label>
            <label className="flex items-center gap-1.5 text-xs font-medium text-slate-700 cursor-pointer">
              <input
                type="radio"
                name="mediaType"
                checked={newType === 'video'}
                onChange={() => setNewType('video')}
                className="text-blue-600 focus:ring-blue-500"
              />
              <span>Video clip</span>
            </label>
          </div>

          <div className="flex gap-2">
            <input
              type="url"
              placeholder="Nhập link ảnh hoặc thumbnail video (HTTP/HTTPS)..."
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-500 shadow-sm"
              required
            />
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-3.5 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
              id="btn-confirm-add-media"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Thêm</span>
            </button>
          </div>
        </form>
      )}

      {/* Media Items List/Grid */}
      {mediaList.length === 0 ? (
        <div className="border-2 border-dashed border-slate-200 rounded-xl py-6 text-center text-slate-400 text-xs">
          Chưa có hình ảnh hay video nào cho bài viết này.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {mediaList.map((item, index) => (
            <div key={index} className="group relative aspect-square bg-slate-100 rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              {item.type === 'video' && isDirectVideoUrl(item.url) ? (
                <FacebookDashVideo
                  src={item.url}
                  audioUrl={item.audioUrl}
                  poster={item.thumbnail}
                  controls
                  playsInline
                  preload="metadata"
                  onLoadStart={() => setVideoStatus(current => ({ ...current, [item.url]: 'loading' }))}
                  onLoadedMetadata={(event) => {
                    const player = event.currentTarget;
                    const status = player.videoWidth > 0 && player.videoHeight > 0 ? 'ready' : 'audio';
                    setVideoStatus(current => ({ ...current, [item.url]: status }));
                  }}
                  onCanPlay={(event) => {
                    const player = event.currentTarget;
                    const status = player.videoWidth > 0 && player.videoHeight > 0 ? 'ready' : 'audio';
                    setVideoStatus(current => ({ ...current, [item.url]: status }));
                  }}
                  onError={() => setVideoStatus(current => ({ ...current, [item.url]: 'error' }))}
                  className="w-full h-full object-cover bg-black"
                />
              ) : item.type === 'video' ? (
                item.thumbnail ? (
                  <img
                    src={item.thumbnail}
                    alt={`Video ${index}`}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full bg-slate-900 text-slate-300 flex flex-col items-center justify-center gap-2 text-[10px] text-center p-3">
                    <Video className="w-8 h-8" />
                    <span>Video Facebook</span>
                  </div>
                )
              ) : (
                <img
                  src={item.url}
                  alt={`Media ${index}`}
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  referrerPolicy="no-referrer"
                />
              )}
              
              {/* Overlay with Type Icon */}
              <div className={`absolute top-2 left-2 text-white px-1.5 py-1 rounded-md flex items-center gap-1 text-[9px] font-bold ${
                item.type !== 'video' ? 'bg-black/60' :
                !isDirectVideoUrl(item.url) ? 'bg-amber-600/90' :
                videoStatus[item.url] === 'ready' ? 'bg-emerald-600/90' :
                videoStatus[item.url] === 'audio' ? 'bg-amber-600/90' :
                videoStatus[item.url] === 'error' ? 'bg-rose-600/90' : 'bg-slate-700/90'
              }`}>
                {item.type === 'video' ? (
                  <>
                    <Video className="w-3.5 h-3.5" />
                    <span>
                      {!isDirectVideoUrl(item.url)
                        ? 'Chỉ có link/ảnh'
                        : videoStatus[item.url] === 'ready'
                          ? (item.audioUrl ? 'Video + tiếng' : 'Video xem được')
                          : videoStatus[item.url] === 'audio'
                            ? 'Chỉ có âm thanh'
                          : videoStatus[item.url] === 'error'
                            ? 'Link lỗi/hết hạn'
                            : 'Đang kiểm tra'}
                    </span>
                  </>
                ) : (
                  <ImageIcon className="w-3.5 h-3.5" />
                )}
              </div>

              {/* Action Overlay */}
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={() => handleRemove(index)}
                  className="bg-white hover:bg-rose-600 hover:text-white text-slate-700 p-2 rounded-xl transition-all shadow-md"
                  title="Xóa hình ảnh này"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
