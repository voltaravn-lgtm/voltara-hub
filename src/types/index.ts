export interface ProductSpec {
  name: string;
  value: string;
}

export type ProductStatus = 'active' | 'draft' | 'discontinued';

export interface Product {
  id: string;
  name: string;
  sku: string;
  brand: string;
  category: string; // Tên hoặc ID của danh mục
  shortDescription: string;
  description: string;
  costPrice: number;     // Giá vốn
  price: number;         // Giá bán
  promoPrice: number | null; // Giá khuyến mãi (có thể null nếu không sale)
  stock: number;         // Tồn kho
  specs: ProductSpec[];  // Thông số kỹ thuật
  images: string[];      // Danh sách URL ảnh
  mainImage: string;     // Ảnh đại diện (phải có trong danh sách images hoặc riêng)
  status: ProductStatus;
  weight?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  description: string;
  slug: string;
}
