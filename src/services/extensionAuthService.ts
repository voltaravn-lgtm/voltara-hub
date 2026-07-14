import { ExtensionConnectionConfig } from '../types/extensionImportTypes';

const CONFIG_KEY = 'voltara_extension_config';

const getInitialConfig = (): ExtensionConnectionConfig => ({
  isConnected: false,
  token: null,
  extensionName: "Voltara Product Importer",
  lastConnectedAt: null,
  productsSentCount: 0
});

export const extensionAuthService = {
  async getStatus(): Promise<ExtensionConnectionConfig> {
    try {
      const response = await fetch('/api/extensions/auth/status');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data;
    } catch (err) {
      console.error('Error fetching extension status from server:', err);
      const stored = localStorage.getItem(CONFIG_KEY);
      if (!stored) {
        const initial = getInitialConfig();
        localStorage.setItem(CONFIG_KEY, JSON.stringify(initial));
        return initial;
      }
      try {
        return JSON.parse(stored);
      } catch (err) {
        return getInitialConfig();
      }
    }
  },

  async generateToken(): Promise<ExtensionConnectionConfig> {
    try {
      const response = await fetch('/api/extensions/auth/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      if (data.success && data.config) {
        localStorage.setItem(CONFIG_KEY, JSON.stringify(data.config));
        return data.config;
      }
      throw new Error(data.message || 'Failed to generate token');
    } catch (err) {
      console.error('Error generating token on server:', err);
      // Fallback
      const config = await this.getStatus();
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      const rand4 = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
      const token = `VOLTARA-${rand4()}-${rand4()}`;
      
      config.isConnected = true;
      config.token = token;
      config.lastConnectedAt = new Date().toISOString();
      
      localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
      return config;
    }
  },

  async disconnect(): Promise<ExtensionConnectionConfig> {
    try {
      const response = await fetch('/api/extensions/auth/disconnect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      if (data.success && data.config) {
        localStorage.setItem(CONFIG_KEY, JSON.stringify(data.config));
        return data.config;
      }
      throw new Error(data.message || 'Failed to disconnect');
    } catch (err) {
      console.error('Error disconnecting from server:', err);
      const config = await this.getStatus();
      config.isConnected = false;
      config.token = null;
      localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
      return config;
    }
  },

  async incrementSentCount(): Promise<void> {
    const config = await this.getStatus();
    config.productsSentCount += 1;
    config.lastConnectedAt = new Date().toISOString();
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  }
};
