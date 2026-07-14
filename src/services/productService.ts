import { Product, Category } from '../types';
import { mockProducts, mockCategories } from '../data/mockProducts';

const PRODUCTS_KEY = 'voltara_products';
const CATEGORIES_KEY = 'voltara_categories';

export const productService = {
  // --- PRODUCT OPERATIONS ---
  
  getProducts(): Product[] {
    const stored = localStorage.getItem(PRODUCTS_KEY);
    if (!stored) {
      // Khởi tạo dữ liệu mẫu nếu chưa có trong localStorage
      localStorage.setItem(PRODUCTS_KEY, JSON.stringify(mockProducts));
      return mockProducts;
    }
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error('Lỗi khi đọc sản phẩm từ localStorage, khôi phục dữ liệu mẫu', e);
      return mockProducts;
    }
  },

  getProductById(id: string): Product | undefined {
    const products = this.getProducts();
    return products.find(p => p.id === id);
  },

  saveProduct(product: Product): Product {
    const products = this.getProducts();
    const index = products.findIndex(p => p.id === product.id);
    
    const updatedProduct = {
      ...product,
      updatedAt: new Date().toISOString()
    };

    if (index >= 0) {
      products[index] = updatedProduct;
    } else {
      updatedProduct.id = Math.random().toString(36).substr(2, 9);
      updatedProduct.createdAt = new Date().toISOString();
      products.push(updatedProduct);
    }

    localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
    return updatedProduct;
  },

  deleteProduct(id: string): boolean {
    const products = this.getProducts();
    const filtered = products.filter(p => p.id !== id);
    if (filtered.length === products.length) return false;
    
    localStorage.setItem(PRODUCTS_KEY, JSON.stringify(filtered));
    return true;
  },

  deleteMultipleProducts(ids: string[]): boolean {
    const products = this.getProducts();
    const filtered = products.filter(p => !ids.includes(p.id));
    if (filtered.length === products.length) return false;
    
    localStorage.setItem(PRODUCTS_KEY, JSON.stringify(filtered));
    return true;
  },

  // Tạo một bản sao sẵn sàng cho form
  prepareDuplicate(product: Product): Omit<Product, 'id' | 'createdAt' | 'updatedAt'> {
    return {
      name: `${product.name} (Bản sao)`,
      sku: `${product.sku}-COPY`,
      brand: product.brand,
      category: product.category,
      shortDescription: product.shortDescription,
      description: product.description,
      costPrice: product.costPrice,
      price: product.price,
      promoPrice: product.promoPrice,
      stock: product.stock,
      specs: product.specs ? [...product.specs] : [],
      images: product.images ? [...product.images] : [],
      mainImage: product.mainImage,
      weight: product.weight !== undefined ? product.weight : 500,
      status: 'draft' // Nhân bản mặc định thành bản nháp
    };
  },

  // --- CATEGORY OPERATIONS ---

  getCategories(): Category[] {
    const stored = localStorage.getItem(CATEGORIES_KEY);
    if (!stored) {
      localStorage.setItem(CATEGORIES_KEY, JSON.stringify(mockCategories));
      return mockCategories;
    }
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error('Lỗi khi đọc danh mục từ localStorage, khôi phục dữ liệu mẫu', e);
      return mockCategories;
    }
  },

  saveCategory(category: Category): Category {
    const categories = this.getCategories();
    const index = categories.findIndex(c => c.id === category.id);

    if (index >= 0) {
      categories[index] = category;
    } else {
      category.id = Math.random().toString(36).substr(2, 9);
      categories.push(category);
    }

    localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories));
    return category;
  },

  deleteCategory(id: string): boolean {
    const categories = this.getCategories();
    const filtered = categories.filter(c => c.id !== id);
    if (filtered.length === categories.length) return false;

    localStorage.setItem(CATEGORIES_KEY, JSON.stringify(filtered));
    return true;
  }
};
