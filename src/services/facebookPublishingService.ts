import { FacebookLog, FacebookMediaItem, FacebookPost } from '../types/facebookTypes';
import { facebookImportService } from './facebookImportService';

const LOGS_STORAGE_KEY = 'voltara_facebook_publish_logs';

interface PublishTargetResult {
  pageId: string;
  pageName?: string;
  success: boolean;
  postId?: string;
  permalink?: string;
  error?: string;
}

interface PublishApiResponse {
  success: boolean;
  partial?: boolean;
  results?: PublishTargetResult[];
  error?: string;
}

export const facebookPublishingService = {
  getLogs(): FacebookLog[] {
    const stored = localStorage.getItem(LOGS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  },

  addLog(log: Omit<FacebookLog, 'id' | 'timestamp'>): FacebookLog {
    const logs = this.getLogs();
    const newLog: FacebookLog = {
      ...log,
      id: `log-${Math.random().toString(36).slice(2, 11)}`,
      timestamp: new Date().toISOString()
    };
    logs.unshift(newLog);
    localStorage.setItem(LOGS_STORAGE_KEY, JSON.stringify(logs));
    return newLog;
  },

  clearLogs(): boolean {
    localStorage.setItem(LOGS_STORAGE_KEY, JSON.stringify([]));
    return true;
  },

  async prepareManualPost(
    post: FacebookPost,
    page: { id: string; name?: string }
  ): Promise<{ success: boolean; error?: string }> {
    // Open synchronously from the user's click so browser popup protection does
    // not block the Facebook tab while the handoff API is being prepared.
    const facebookTab = window.open('about:blank', '_blank');
    if (!facebookTab) {
      return { success: false, error: 'Trình duyệt đang chặn cửa sổ Facebook. Hãy cho phép popup rồi thử lại.' };
    }
    facebookTab.document.title = 'Đang chuẩn bị bài đăng Facebook...';
    facebookTab.document.body.innerHTML = '<p style="font:16px Arial;padding:24px">Đang chuẩn bị nội dung và media...</p>';

    try {
      const response = await fetch('/api/facebook/manual-publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ post, pageId: page.id, pageName: page.name })
      });
      const data = await response.json().catch(() => ({ success: false, error: `Máy chủ trả về HTTP ${response.status}` }));
      if (!response.ok || !data.success || !data.facebookUrl) {
        facebookTab.close();
        return { success: false, error: data.error || 'Không chuẩn bị được bài đăng thủ công.' };
      }
      facebookTab.location.replace(data.facebookUrl);
      return { success: true };
    } catch (error: any) {
      facebookTab.close();
      return { success: false, error: error?.message || 'Không kết nối được máy chủ để chuẩn bị bài đăng.' };
    }
  },

  async uploadScheduleMedia(file: File): Promise<FacebookMediaItem> {
    const response = await fetch('/api/facebook/media/upload', {
      method: 'POST',
      headers: { 'Content-Type': file.type || 'application/octet-stream' },
      body: file
    });
    const data = await response.json().catch(() => ({ success: false, error: `Máy chủ trả về HTTP ${response.status}` }));
    if (!response.ok || !data.success || !data.media?.url) {
      throw new Error(data.error || `Không tải được tệp ${file.name}.`);
    }
    return data.media as FacebookMediaItem;
  },

  async prepareManualScheduledPost(
    post: FacebookPost,
    page: { id: string; name?: string },
    scheduledAt: string
  ): Promise<{ success: boolean; error?: string }> {
    const facebookTab = window.open('about:blank', '_blank');
    if (!facebookTab) {
      return { success: false, error: 'Trình duyệt đang chặn cửa sổ Facebook. Hãy cho phép popup rồi thử lại.' };
    }
    facebookTab.document.title = 'Đang chuẩn bị bài hẹn lịch Facebook...';
    facebookTab.document.body.innerHTML = '<p style="font:16px Arial;padding:24px">Đang chuẩn bị nội dung và media để hẹn lịch...</p>';
    try {
      const response = await fetch('/api/facebook/manual-publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          post,
          pageId: page.id,
          pageName: page.name,
          scheduleMode: true,
          scheduledAt
        })
      });
      const data = await response.json().catch(() => ({ success: false, error: `Máy chủ trả về HTTP ${response.status}` }));
      if (!response.ok || !data.success || !data.facebookUrl) {
        facebookTab.close();
        return { success: false, error: data.error || 'Không chuẩn bị được bài hẹn lịch.' };
      }
      facebookTab.location.replace(data.facebookUrl);
      return { success: true };
    } catch (error: any) {
      facebookTab.close();
      return { success: false, error: error?.message || 'Không kết nối được máy chủ để chuẩn bị bài hẹn lịch.' };
    }
  },

  async prepareManualBatch(
    posts: FacebookPost[],
    page: { id: string; name?: string }
  ): Promise<{ success: boolean; count?: number; error?: string }> {
    const facebookTab = window.open('about:blank', '_blank');
    if (!facebookTab) {
      return { success: false, error: 'Trình duyệt đang chặn cửa sổ Facebook. Hãy cho phép popup rồi thử lại.' };
    }
    facebookTab.document.title = 'Đang chuẩn bị hàng đợi Facebook...';
    facebookTab.document.body.innerHTML = '<p style="font:16px Arial;padding:24px">Đang chuẩn bị các bài đăng tuần tự...</p>';

    try {
      const response = await fetch('/api/facebook/manual-publish-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ posts, pageId: page.id, pageName: page.name })
      });
      const data = await response.json().catch(() => ({ success: false, error: `Máy chủ trả về HTTP ${response.status}` }));
      if (!response.ok || !data.success || !data.facebookUrl) {
        facebookTab.close();
        return { success: false, error: data.error || 'Không chuẩn bị được hàng đợi Facebook.' };
      }
      facebookTab.location.replace(data.facebookUrl);
      return { success: true, count: data.count };
    } catch (error: any) {
      facebookTab.close();
      return { success: false, error: error?.message || 'Không kết nối được máy chủ để chuẩn bị hàng đợi.' };
    }
  },

  async publishPost(post: FacebookPost, pageIds: string[]): Promise<{ success: boolean; error?: string }> {
    if (pageIds.length === 0) {
      return { success: false, error: 'Chưa chọn Fanpage đích để đăng bài.' };
    }

    try {
      const response = await fetch('/api/facebook/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ post, pageIds })
      });
      const data: PublishApiResponse = await response.json().catch(() => ({
        success: false,
        error: `Máy chủ trả về HTTP ${response.status}`
      }));

      for (const result of data.results || []) {
        this.addLog({
          postId: post.id,
          postTitle: (post.editedCaption || post.originalCaption).slice(0, 60),
          postUrl: result.permalink || post.postUrl,
          targetPage: result.pageName || `Fanpage ${result.pageId}`,
          status: result.success ? 'success' : 'failed',
          message: result.success
            ? `Đăng bài thành công. ID Facebook: ${result.postId || 'không xác định'}`
            : (result.error || 'Facebook từ chối đăng bài.')
        });
      }

      if (!response.ok || !data.success) {
        const error = data.error || 'Đăng bài lên Facebook thất bại.';
        facebookImportService.savePost({ ...post, status: 'failed', errorLog: error });
        return { success: false, error };
      }

      facebookImportService.savePost({
        ...post,
        status: data.partial ? 'failed' : 'published',
        publishedAt: new Date().toISOString(),
        targetPages: pageIds,
        errorLog: data.partial ? 'Một số Fanpage đăng thất bại. Hãy xem Nhật ký đăng.' : undefined
      });
      return data.partial
        ? { success: false, error: 'Bài đã đăng lên một số Fanpage, nhưng có Fanpage bị lỗi. Hãy xem Nhật ký đăng.' }
        : { success: true };
    } catch (error: any) {
      const message = error?.message || 'Không kết nối được máy chủ đăng Facebook.';
      facebookImportService.savePost({ ...post, status: 'failed', errorLog: message });
      return { success: false, error: message };
    }
  },

  async schedulePost(_post: FacebookPost, _pageIds: string[], _scheduleTime: string): Promise<{ success: boolean; error?: string }> {
    return {
      success: false,
      error: 'Lên lịch qua Facebook API chưa được bật. Hãy chọn “Đăng tải ngay lập tức”.'
    };
  }
};
