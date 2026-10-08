import React, { useState, useEffect } from 'react';
import { FacebookPost, FacebookPage } from '../types/facebookTypes';
import { facebookImportService } from '../services/facebookImportService';
import { facebookPageService } from '../services/facebookPageService';
import { facebookPublishingService } from '../services/facebookPublishingService';
import { FacebookPostEditor } from '../components/facebook/FacebookPostEditor';

interface FacebookPostEditorPageProps {
  post: FacebookPost;
  onNavigateBack: () => void;
  addToast: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

export const FacebookPostEditorPage: React.FC<FacebookPostEditorPageProps> = ({
  post,
  onNavigateBack,
  addToast,
}) => {
  const [pages, setPages] = useState<FacebookPage[]>([]);

  useEffect(() => {
    facebookPageService.getPages()
      .then(setPages)
      .catch((error) => {
        console.warn('Facebook Page sync failed:', error);
        addToast('Không tải được danh sách Fanpage đã kết nối.', 'error');
      });
  }, []);

  const handleSaveDraft = (updatedPost: FacebookPost) => {
    facebookImportService.savePost(updatedPost);
    addToast(`Đã lưu bản nháp bài viết thành công.`, 'success');
    onNavigateBack();
  };

  const handlePublishNow = async (updatedPost: FacebookPost, pageIds: string[]) => {
    const res = await facebookPublishingService.publishPost(updatedPost, pageIds);
    if (res.success) {
      addToast(`Đăng bài viết lên Fanpage thành công!`, 'success');
      onNavigateBack();
    } else {
      addToast(res.error || 'Có lỗi xảy ra khi đăng bài.', 'error');
    }
  };

  const handleSchedule = async (updatedPost: FacebookPost, pageIds: string[], time: string) => {
    const res = await facebookPublishingService.schedulePost(updatedPost, pageIds, time);
    if (res.success) {
      addToast(`Đã lên lịch đăng bài viết thành công lúc ${new Date(time).toLocaleString('vi-VN')}!`, 'success');
      onNavigateBack();
    } else {
      addToast(res.error || 'Có lỗi xảy ra khi lên lịch đăng bài.', 'error');
    }
  };

  const handleManualPublish = async (updatedPost: FacebookPost, pageId: string) => {
    const page = pages.find(item => item.id === pageId);
    if (!page) {
      addToast('Không tìm thấy Fanpage đã chọn.', 'error');
      return;
    }
    const res = await facebookPublishingService.prepareManualPost(updatedPost, page);
    addToast(
      res.success ? 'Đã mở Facebook. Dùng bảng Voltara để điền bài rồi tự bấm Đăng.' : (res.error || 'Không mở được Facebook.'),
      res.success ? 'info' : 'error'
    );
  };

  return (
    <FacebookPostEditor
      post={post}
      pages={pages}
      onSaveDraft={handleSaveDraft}
      onPublishNow={handlePublishNow}
      onManualPublish={handleManualPublish}
      onSchedule={handleSchedule}
      onCancel={onNavigateBack}
    />
  );
};
