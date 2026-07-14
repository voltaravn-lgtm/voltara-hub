import { ExtensionProductPending, ExtensionProductImportRequest } from '../types/extensionImportTypes';
import { extensionAuthService } from './extensionAuthService';

const IMPORTS_KEY = 'voltara_extension_imports';

export const extensionImportService = {
  async getPendingProducts(): Promise<ExtensionProductPending[]> {
    try {
      const response = await fetch('/api/extensions/products');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data;
    } catch (err) {
      console.error('Error fetching pending products from server:', err);
      const stored = localStorage.getItem(IMPORTS_KEY);
      if (!stored) {
        return [];
      }
      try {
        return JSON.parse(stored);
      } catch (err) {
        return [];
      }
    }
  },

  async getPendingProductById(id: string): Promise<ExtensionProductPending | null> {
    try {
      const response = await fetch(`/api/extensions/products/${id}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data;
    } catch (err) {
      console.error(`Error fetching pending product ${id} from server:`, err);
      const products = await this.getPendingProducts();
      return products.find(p => p.id === id) || null;
    }
  },

  async updateStatus(id: string, status: 'pending_review' | 'imported' | 'rejected'): Promise<boolean> {
    try {
      const response = await fetch(`/api/extensions/products/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data.success;
    } catch (err) {
      console.error(`Error updating status for ${id} on server:`, err);
      try {
        const products = await this.getPendingProducts();
        const index = products.findIndex(p => p.id === id);
        if (index === -1) return false;
        
        products[index].status = status;
        localStorage.setItem(IMPORTS_KEY, JSON.stringify(products));
        return true;
      } catch (err) {
        return false;
      }
    }
  },

  async deletePendingProduct(id: string): Promise<boolean> {
    try {
      const response = await fetch(`/api/extensions/products/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data.success;
    } catch (err) {
      console.error(`Error deleting product ${id} on server:`, err);
      try {
        const products = await this.getPendingProducts();
        const filtered = products.filter(p => p.id !== id);
        if (filtered.length === products.length) return false;
        
        localStorage.setItem(IMPORTS_KEY, JSON.stringify(filtered));
        return true;
      } catch (err) {
        return false;
      }
    }
  },

  // Import flow that has validation (matches the requested validation & structure)
  async importProductViaExtension(
    body: ExtensionProductImportRequest,
    token: string
  ): Promise<{ success: boolean; importId?: string; message?: string; error?: string }> {
    try {
      const response = await fetch('/api/extensions/products/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });
      
      const data = await response.json();
      if (!response.ok) {
        return { success: false, error: data.error || data.message || `Lỗi máy chủ: ${response.status}` };
      }
      return data;
    } catch (err) {
      console.error('Error importing product via API:', err);
      // Fallback
      // 1. Check token & isConnected
      const config = await extensionAuthService.getStatus();
      if (!config.isConnected || !config.token || config.token !== token) {
        return { success: false, error: "Mã kết nối (Connection token) không hợp lệ hoặc đã bị vô hiệu hóa." };
      }

      // 2. Tên sản phẩm không được trống
      if (!body.name || typeof body.name !== "string" || body.name.trim() === "") {
        return { success: false, error: "Tên sản phẩm không được để trống." };
      }

      // 3. URL phải hợp lệ
      if (!body.sourceUrl || typeof body.sourceUrl !== "string" || !body.sourceUrl.startsWith("http")) {
        return { success: false, error: "Đường dẫn URL sản phẩm nguồn không hợp lệ." };
      }

      // 4. Giá không được âm
      const price = body.price !== undefined ? Number(body.price) : undefined;
      const originalPrice = body.originalPrice !== undefined ? Number(body.originalPrice) : undefined;
      if (price !== undefined && (isNaN(price) || price < 0)) {
        return { success: false, error: "Giá sản phẩm bán không hợp lệ (không được nhỏ hơn 0)." };
      }
      if (originalPrice !== undefined && (isNaN(originalPrice) || originalPrice < 0)) {
        return { success: false, error: "Giá gốc sản phẩm không hợp lệ." };
      }

      // Generate new pending product
      const importId = "imp_" + Math.random().toString(36).substring(2, 11);
      const newPendingProduct: ExtensionProductPending = {
        id: importId,
        source: "shopee",
        sourceUrl: body.sourceUrl.substring(0, 1000),
        externalProductId: body.externalProductId ? String(body.externalProductId).substring(0, 100) : undefined,
        name: body.name.substring(0, 255),
        sku: body.sku ? String(body.sku).substring(0, 100) : undefined,
        price: price,
        originalPrice: originalPrice,
        description: body.description ? String(body.description).substring(0, 15000) : "",
        images: Array.isArray(body.images) ? body.images.filter(img => typeof img === "string" && img.startsWith("http")).slice(0, 10) : [],
        category: body.category ? String(body.category).substring(0, 100) : undefined,
        variants: Array.isArray(body.variants) ? body.variants.slice(0, 5).map(v => ({
          name: String(v.name).substring(0, 100),
          options: Array.isArray(v.options) ? v.options.slice(0, 20).map(o => String(o).substring(0, 100)) : []
        })) : [],
        specifications: Array.isArray(body.specifications) ? body.specifications.slice(0, 10).map(s => ({
          name: String(s.name).substring(0, 100),
          value: String(s.value).substring(0, 500)
        })) : [],
        seller: body.seller ? {
          name: body.seller.name ? String(body.seller.name).substring(0, 100) : undefined,
          shopUrl: body.seller.shopUrl ? String(body.seller.shopUrl).substring(0, 500) : undefined
        } : undefined,
        importedAt: body.importedAt ? String(body.importedAt) : new Date().toISOString(),
        status: "pending_review"
      };

      // Save
      const products = await this.getPendingProducts();
      products.push(newPendingProduct);
      localStorage.setItem(IMPORTS_KEY, JSON.stringify(products));

      // Update stats
      await extensionAuthService.incrementSentCount();

      return {
        success: true,
        importId: importId,
        message: "Đã gửi sản phẩm về Voltara Product Hub"
      };
    }
  },

  // Mock gửi dữ liệu từ Extension (Shopee mẫu theo yêu cầu chi tiết)
  async mockExtensionImport(token: string): Promise<{ success: boolean; importId?: string; message?: string; error?: string }> {
    const mockShopeeData: ExtensionProductImportRequest = {
      source: "shopee",
      sourceUrl: "https://shopee.vn/product-demo",
      externalProductId: "SHOPEE-123456",
      name: "Máy siết bu lông Voltara 21V VT-IW1000",
      sku: "VT-IW1000",
      price: 2490000,
      originalPrice: 2890000,
      description: "Máy siết bu lông dùng pin Voltara 21V, động cơ không chổi than, lực siết mạnh.",
      images: [
        "https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&q=80&w=800",
        "https://images.unsplash.com/photo-1581147036324-c17ac41dfa6c?auto=format&fit=crop&q=80&w=800",
        "https://images.unsplash.com/photo-1534224039826-c7a0dea0e66a?auto=format&fit=crop&q=80&w=800"
      ],
      category: "Máy siết bu lông",
      variants: [
        {
          name: "Phiên bản",
          options: ["Thân máy", "Bộ 1 pin", "Bộ 2 pin"]
        }
      ],
      specifications: [
        {
          name: "Điện áp",
          value: "21V"
        },
        {
          name: "Động cơ",
          value: "Không chổi than"
        },
        {
          name: "Lực siết",
          value: "1000 Nm"
        }
      ],
      seller: {
        name: "Voltara Official",
        shopUrl: "https://shopee.vn/voltara"
      },
      importedAt: new Date().toISOString()
    };

    return this.importProductViaExtension(mockShopeeData, token);
  }
};
