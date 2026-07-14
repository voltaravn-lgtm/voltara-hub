import { FacebookPage } from '../types/facebookTypes';

interface FacebookConfigResponse {
  configured: boolean;
  redirectUri: string;
  graphVersion: string;
}

const readApiResponse = async <T>(response: Response): Promise<T> => {
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data?.success === false) {
    throw new Error(data?.error || `Máy chủ trả về HTTP ${response.status}`);
  }
  return data as T;
};

export const facebookPageService = {
  async getConfig(): Promise<FacebookConfigResponse> {
    return readApiResponse<FacebookConfigResponse>(await fetch('/api/facebook/config'));
  },

  async getPages(): Promise<FacebookPage[]> {
    const data = await readApiResponse<{ success: boolean; pages: FacebookPage[] }>(
      await fetch('/api/facebook/pages')
    );
    return data.pages || [];
  },

  async getOAuthUrl(): Promise<string> {
    const data = await readApiResponse<{ success: boolean; authUrl: string }>(
      await fetch('/api/facebook/oauth/start')
    );
    return data.authUrl;
  },

  async disconnectPage(id: string): Promise<void> {
    await readApiResponse<{ success: boolean }>(
      await fetch(`/api/facebook/pages/${encodeURIComponent(id)}`, { method: 'DELETE' })
    );
  }
};
