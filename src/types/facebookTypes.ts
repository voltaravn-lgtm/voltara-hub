export interface FacebookMediaItem {
  type: 'image' | 'video';
  url: string;
  audioUrl?: string;
  thumbnail?: string;
}

export type FacebookPostStatus = 'draft' | 'published' | 'failed';

export interface FacebookPost {
  id: string;
  fbPostId?: string;
  pageName?: string;
  postUrl: string;
  originalCaption: string;
  editedCaption: string;
  media: FacebookMediaItem[];
  status: FacebookPostStatus;
  scheduledAt?: string;
  publishedAt?: string;
  targetPages?: string[];
  errorLog?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FacebookPage {
  id: string;
  name: string;
  category?: string;
  picture?: string;
  status: 'connected' | 'disconnected';
  accessToken?: string;
  tasks?: string[];
}

export interface FacebookLog {
  id: string;
  postId?: string;
  postTitle: string;
  postUrl?: string;
  targetPage: string;
  status: 'success' | 'failed';
  message: string;
  timestamp: string;
}
