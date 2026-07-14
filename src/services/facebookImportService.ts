import { FacebookPost } from '../types/facebookTypes';

const STORAGE_KEY = 'voltara_facebook_posts';

const MOCK_FACEBOOK_POSTS: FacebookPost[] = [
  {
    id: 'fb-post-1',
    fbPostId: '102293849102938',
    pageName: 'Điện máy & Cơ khí Xanh',
    postUrl: 'https://www.facebook.com/dienmaycohkixanh/posts/102293849102938',
    originalCaption: 'Siêu phẩm máy siết bu lông Voltara 21V lực siết cực khủng 350Nm đã cập bến. Hàng chính hãng bảo hành 12 tháng, free ship toàn quốc.',
    editedCaption: 'Siêu phẩm máy siết bu lông Voltara 21V lực siết cực khủng 350Nm đã cập bến. Hàng chính hãng bảo hành 12 tháng, free ship toàn quốc. Liên hệ ngay Voltara Việt Nam để nhận giá ưu đãi đầu tháng!',
    media: [
      { type: 'image', url: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&q=80&w=600' },
      { type: 'image', url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&q=80&w=600' }
    ],
    status: 'published',
    publishedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    targetPages: ['page-1'],
    createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 24).toISOString()
  },
  {
    id: 'fb-post-2',
    fbPostId: '201938475910293',
    pageName: 'Cơ Khí Cầm Tay Việt Nam',
    postUrl: 'https://www.facebook.com/permalink.php?story_fbid=201938475910293&id=100063920192',
    originalCaption: 'Đánh giá chi tiết máy mài góc Voltara dùng pin 21V siêu khỏe, có điều tốc 3 cấp độ. Cầm đầm tay, chạy êm ru, cốt máy 100mm chuẩn mực.',
    editedCaption: 'Đánh giá chi tiết máy mài góc Voltara dùng pin 21V siêu khỏe, có điều tốc 3 cấp độ. Cầm đầm tay, chạy êm ru, cốt máy 100mm chuẩn mực.',
    media: [
      { type: 'image', url: 'https://images.unsplash.com/photo-1534224039826-c7a0dea0e66a?auto=format&fit=crop&q=80&w=600' }
    ],
    status: 'draft',
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 2).toISOString()
  },
  {
    id: 'fb-post-3',
    fbPostId: '302938491029381',
    pageName: 'Đồ Nghề Chất Lượng Cao',
    postUrl: 'https://www.facebook.com/donghechat/posts/302938491029381',
    originalCaption: 'Bộ combo khoan pin Voltara 21V đi kèm 24 phụ kiện đầy đủ hộp đựng giá chỉ còn 799k. Số lượng có hạn anh em nhanh tay.',
    editedCaption: 'Bộ combo khoan pin Voltara 21V đi kèm 24 phụ kiện đầy đủ hộp đựng giá chỉ còn 799k. Số lượng có hạn anh em nhanh tay.',
    media: [
      { type: 'image', url: 'https://images.unsplash.com/photo-1572981779307-38b8cabb2407?auto=format&fit=crop&q=80&w=600' }
    ],
    status: 'failed',
    errorLog: 'OAuth Token Expired: Mã truy cập của Fanpage Đồ Nghề Cầm Tay đã hết hạn sử dụng. Vui lòng kết nối lại.',
    createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 12).toISOString()
  }
];

export const facebookImportService = {
  getPosts(): FacebookPost[] {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(MOCK_FACEBOOK_POSTS));
      return MOCK_FACEBOOK_POSTS;
    }
    const posts: FacebookPost[] = JSON.parse(stored);
    let changed = false;
    const normalized = posts.map(post => {
      const isReel = /\/(reel|reels)\//i.test(post.postUrl || '');
      const hasVideo = post.media?.some(item => item.type === 'video');
      if (!isReel || !hasVideo) return post;
      const videosOnly = post.media.filter(item => item.type === 'video');
      if (videosOnly.length === post.media.length) return post;
      changed = true;
      return { ...post, media: videosOnly };
    });
    if (changed) localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    return normalized;
  },

  savePost(post: FacebookPost): FacebookPost {
    const posts = this.getPosts();
    const index = posts.findIndex(p => p.id === post.id);
    
    const updatedPost = {
      ...post,
      updatedAt: new Date().toISOString()
    };

    if (index >= 0) {
      posts[index] = updatedPost;
    } else {
      posts.unshift(updatedPost);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
    return updatedPost;
  },

  deletePost(id: string): boolean {
    const posts = this.getPosts();
    const filtered = posts.filter(p => p.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    return true;
  },

  importPostFromExtension(postData: Omit<FacebookPost, 'id' | 'status' | 'createdAt' | 'updatedAt'>): FacebookPost {
    const newPost: FacebookPost = {
      ...postData,
      id: `fb-${Math.random().toString(36).substr(2, 9)}`,
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    return this.savePost(newPost);
  }
};
