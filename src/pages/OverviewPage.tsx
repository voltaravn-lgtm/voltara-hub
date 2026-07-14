import React from 'react';
import { Product, Category } from '../types';
import { Package, CheckCircle2, FileText, BarChart3, AlertCircle, ArrowUpRight, Plus, Eye, Edit, Copy } from 'lucide-react';

interface OverviewPageProps {
  products: Product[];
  categories: Category[];
  onNavigate: (tab: string, param?: string) => void;
  onDuplicate: (product: Product) => void;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({
  products,
  categories,
  onNavigate,
  onDuplicate,
}) => {
  // Tính toán chỉ số thống kê
  const totalProducts = products.length;
  const activeProducts = products.filter((p) => p.status === 'active').length;
  const draftProducts = products.filter((p) => p.status === 'draft').length;
  const discontinuedProducts = products.filter((p) => p.status === 'discontinued').length;
  
  const totalStock = products.reduce((sum, p) => sum + p.stock, 0);
  const lowStockProducts = products.filter((p) => p.stock <= 5);
  const lowStockCount = lowStockProducts.length;

  // Lấy 5 sản phẩm cập nhật mới nhất
  const recentlyUpdated = [...products]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Đang hoạt động
          </span>
        );
      case 'draft':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            Bản nháp
          </span>
        );
      case 'discontinued':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            Ngừng bán
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Title */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Tổng quan hệ thống</h1>
          <p className="text-sm text-slate-500">
            Báo cáo tóm tắt trạng thái kho hàng và sản phẩm hiện tại của thương hiệu Voltara.
          </p>
        </div>
        <button
          onClick={() => onNavigate('add-product')}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-sm transition-all focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 hover:shadow"
        >
          <Plus className="w-4 h-4" />
          Thêm sản phẩm mới
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Products */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between hover:border-slate-200 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">Tổng sản phẩm</span>
            <div className="p-2 bg-blue-50 rounded-xl text-blue-600">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-bold text-slate-950">{totalProducts}</h3>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
              <span>{categories.length} danh mục</span>
            </p>
          </div>
        </div>

        {/* Active Products */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between hover:border-slate-200 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">Đang hoạt động</span>
            <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-bold text-slate-950">{activeProducts}</h3>
            <p className="text-xs text-slate-400 mt-1">
              Ngừng bán: {discontinuedProducts}
            </p>
          </div>
        </div>

        {/* Draft Products */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between hover:border-slate-200 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">Bản nháp</span>
            <div className="p-2 bg-slate-50 rounded-xl text-slate-600">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-bold text-slate-950">{draftProducts}</h3>
            <p className="text-xs text-slate-400 mt-1">
              Sản phẩm chưa đăng tải
            </p>
          </div>
        </div>

        {/* Total Stock */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between hover:border-slate-200 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">Tổng tồn kho</span>
            <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600">
              <BarChart3 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-bold text-slate-950">{totalStock}</h3>
            <p className="text-xs text-slate-400 mt-1">
              Đơn vị máy móc trong kho
            </p>
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between hover:border-slate-200 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">Sắp hết hàng</span>
            <div className={`p-2 rounded-xl ${lowStockCount > 0 ? 'bg-amber-50 text-amber-600' : 'bg-slate-50 text-slate-400'}`}>
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className={`text-3xl font-bold ${lowStockCount > 0 ? 'text-amber-600' : 'text-slate-950'}`}>
              {lowStockCount}
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Tồn kho tối thiểu dưới 5 cái
            </p>
          </div>
        </div>
      </div>

      {/* Grid Bottom: Low stock alert sidebar & Recently Updated */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Recently Updated Table (2/3 width) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Cập nhật gần đây</h2>
              <p className="text-xs text-slate-500 mt-0.5">Danh sách 5 sản phẩm vừa thay đổi thông tin</p>
            </div>
            <button
              onClick={() => onNavigate('products')}
              className="flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors"
            >
              Xem tất cả
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-[11px] font-bold uppercase tracking-wider border-b border-slate-100">
                  <th className="py-3 px-6">Sản phẩm</th>
                  <th className="py-3 px-6">SKU</th>
                  <th className="py-3 px-6">Giá bán</th>
                  <th className="py-3 px-6">Tồn kho</th>
                  <th className="py-3 px-6">Trạng thái</th>
                  <th className="py-3 px-6 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {recentlyUpdated.map((product) => (
                  <tr key={product.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="py-3.5 px-6">
                      <div className="flex items-center gap-3">
                        <img
                          src={product.mainImage || 'https://images.unsplash.com/photo-1530124566582-ab05104a0c8b?auto=format&fit=crop&q=80&w=100'}
                          alt={product.name}
                          referrerPolicy="no-referrer"
                          className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0 bg-slate-50"
                        />
                        <div className="min-w-0">
                          <h4 className="font-semibold text-slate-800 truncate max-w-[180px] group-hover:text-blue-600 transition-colors">
                            {product.name}
                          </h4>
                          <p className="text-xs text-slate-400 truncate max-w-[180px]">{product.category}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-6 font-mono text-xs text-slate-600">{product.sku}</td>
                    <td className="py-3.5 px-6 text-slate-900 font-medium">
                      {product.promoPrice ? (
                        <div className="flex flex-col">
                          <span className="text-rose-600 font-bold">{formatCurrency(product.promoPrice)}</span>
                          <span className="text-xs text-slate-400 line-through">{formatCurrency(product.price)}</span>
                        </div>
                      ) : (
                        <span>{formatCurrency(product.price)}</span>
                      )}
                    </td>
                    <td className="py-3.5 px-6">
                      <span className={`font-semibold ${product.stock <= 5 ? 'text-amber-600 font-bold' : 'text-slate-700'}`}>
                        {product.stock}
                      </span>
                    </td>
                    <td className="py-3.5 px-6">{getStatusBadge(product.status)}</td>
                    <td className="py-3.5 px-6 text-right">
                      <div className="flex items-center justify-end gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => onNavigate('products', `view-${product.id}`)}
                          className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition-all"
                          title="Xem chi tiết"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onNavigate('edit-product', product.id)}
                          className="p-1.5 hover:bg-slate-100 rounded-lg text-blue-500 hover:text-blue-700 transition-all"
                          title="Chỉnh sửa"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onDuplicate(product)}
                          className="p-1.5 hover:bg-slate-100 rounded-lg text-amber-500 hover:text-amber-700 transition-all"
                          title="Nhân bản"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {recentlyUpdated.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-slate-400">
                      Chưa có sản phẩm nào trong hệ thống.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Low Stock Alert Panels (1/3 width) */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col justify-between">
          <div>
            <div className="px-6 py-5 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
                Cảnh báo hết hàng
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">Sản phẩm có mức tồn kho báo động (≤ 5)</p>
            </div>
            <div className="p-4 divide-y divide-slate-100 max-h-[340px] overflow-y-auto">
              {lowStockProducts.map((product) => (
                <div key={product.id} className="py-3 flex items-start gap-3 first:pt-0 last:pb-0">
                  <img
                    src={product.mainImage || 'https://images.unsplash.com/photo-1530124566582-ab05104a0c8b?auto=format&fit=crop&q=80&w=100'}
                    alt={product.name}
                    referrerPolicy="no-referrer"
                    className="w-12 h-12 rounded-lg object-cover border border-slate-200 shrink-0 bg-slate-50"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-slate-800 text-sm truncate">{product.name}</h4>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">SKU: {product.sku}</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded ${product.stock === 0 ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'}`}>
                        {product.stock === 0 ? 'Hết hàng hoàn toàn' : `Chỉ còn ${product.stock} máy`}
                      </span>
                      <button
                        onClick={() => onNavigate('edit-product', product.id)}
                        className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline transition-all"
                      >
                        Nhập thêm
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {lowStockCount === 0 && (
                <div className="py-8 text-center text-slate-400 text-sm">
                  Tồn kho an toàn, không có sản phẩm báo động.
                </div>
              )}
            </div>
          </div>
          <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-center">
            <button
              onClick={() => onNavigate('products')}
              className="text-xs font-bold text-slate-600 hover:text-slate-800 uppercase tracking-wider"
            >
              Quản lý toàn bộ tồn kho
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
