import React, { useState } from 'react';
import { Category, Product } from '../types';
import { 
  Plus, Tag, Trash2, FolderHeart, AlertCircle, Sparkles, Check, 
  HelpCircle, ChevronRight, Eye, Layers, FileText
} from 'lucide-react';

interface CategoriesPageProps {
  categories: Category[];
  products: Product[];
  onAddCategory: (category: Omit<Category, 'id' | 'slug'>) => void;
  onDeleteCategory: (id: string) => void;
  onNavigateToProducts: (categoryName: string) => void;
}

export const CategoriesPage: React.FC<CategoriesPageProps> = ({
  categories,
  products,
  onAddCategory,
  onDeleteCategory,
  onNavigateToProducts,
}) => {
  // State form danh mục mới
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  // Đếm số sản phẩm thuộc từng danh mục
  const getProductCount = (categoryName: string) => {
    return products.filter((p) => p.category === categoryName).length;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Tên danh mục không được bỏ trống.');
      return;
    }

    // Kiểm tra trùng lặp
    const isDuplicate = categories.some(
      (c) => c.name.toLowerCase().trim() === name.toLowerCase().trim()
    );
    if (isDuplicate) {
      setError(`Danh mục "${name}" đã tồn tại trong hệ thống.`);
      return;
    }

    onAddCategory({
      name: name.trim(),
      description: description.trim(),
    });

    // Reset Form
    setName('');
    setDescription('');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Danh mục sản phẩm</h1>
        <p className="text-sm text-slate-500 font-normal">
          Phân loại máy móc Voltara theo nhóm chức năng để dễ dàng đồng bộ đa sàn và quản lý bộ lọc.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form thêm mới danh mục (1/3 width) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4 h-fit">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 pb-2 border-b border-slate-100">
            <Plus className="w-4 h-4 text-blue-600" />
            Tạo danh mục mới
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Tên danh mục */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Tên nhóm danh mục *</label>
              <input
                type="text"
                placeholder="Ví dụ: Máy cưa cầm tay, Thiết bị pin..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={`w-full px-4 py-2 text-sm rounded-xl border ${
                  error ? 'border-rose-400 bg-rose-50/10 focus:border-rose-400' : 'border-slate-200 focus:border-blue-500'
                } focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all font-medium text-slate-800`}
              />
              {error && <p className="text-xs text-rose-500 font-semibold">{error}</p>}
            </div>

            {/* Mô tả danh mục */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Mô tả tóm tắt</label>
              <textarea
                placeholder="Ghi chú về dòng sản phẩm trong danh mục này (mục đích sử dụng, ưu điểm)..."
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all text-slate-800"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Lưu danh mục
            </button>
          </form>
        </div>

        {/* Danh sách danh mục hiện tại (2/3 width) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">Danh mục hiện có</h2>
                <p className="text-xs text-slate-400 mt-0.5">Quản lý và xem thống kê sản phẩm trong từng nhóm</p>
              </div>
              <span className="text-xs font-bold text-blue-600 bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-full">
                Tổng cộng: {categories.length} nhóm
              </span>
            </div>

            <div className="divide-y divide-slate-100">
              {categories.map((category) => {
                const count = getProductCount(category.name);
                return (
                  <div key={category.id} className="p-6 flex items-start justify-between gap-4 group hover:bg-slate-50/30 transition-colors">
                    <div className="flex items-start gap-3.5">
                      <div className="p-2.5 bg-slate-100 rounded-xl text-slate-600 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors shrink-0">
                        <Layers className="w-5 h-5" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                          {category.name}
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                            count > 0 ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'bg-slate-100 text-slate-400'
                          }`}>
                            {count} sản phẩm
                          </span>
                        </h4>
                        <p className="text-slate-500 text-xs leading-relaxed max-w-lg">
                          {category.description || 'Chưa có mô tả tóm tắt cho nhóm danh mục này.'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => onNavigateToProducts(category.name)}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold bg-white text-slate-700 hover:text-blue-600 border border-slate-200 hover:border-blue-100 rounded-lg transition-colors"
                        title="Xem danh sách sản phẩm trong danh mục"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Xem lọc
                      </button>
                      <button
                        disabled={count > 0}
                        onClick={() => onDeleteCategory(category.id)}
                        className={`p-1.5 rounded-lg border transition-all ${
                          count > 0 
                            ? 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed' 
                            : 'bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 border-slate-200 hover:border-rose-100'
                        }`}
                        title={count > 0 ? 'Không thể xóa danh mục đang có sản phẩm' : 'Xóa danh mục'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}

              {categories.length === 0 && (
                <div className="text-center py-16 text-slate-400">
                  <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="font-semibold text-slate-500">Chưa có danh mục nào</p>
                  <p className="text-xs text-slate-400 mt-1">Sử dụng biểu mẫu bên trái để khởi tạo danh mục đầu tiên.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
