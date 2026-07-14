import React, { useState, useMemo } from 'react';
import { Product, Category, ProductStatus } from '../types';
import { 
  Search, Filter, ArrowUpDown, Plus, Eye, Edit, Copy, Trash2, 
  ChevronDown, ArrowUp, ArrowDown, Check, X, FileSpreadsheet, AlertCircle, Sparkles, ChevronLeft, ChevronRight
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface ProductsPageProps {
  products: Product[];
  categories: Category[];
  onNavigate: (tab: string, param?: string) => void;
  onDuplicate: (product: Product) => void;
  onDeleteSingle: (product: Product) => void;
  onDeleteMultiple: (ids: string[]) => void;
  // If we came with a deep-link view parameter (e.g., 'view-123')
  initialViewProductId?: string;
  clearInitialViewProductId?: () => void;
}

type SortField = 'price' | 'stock' | 'updatedAt' | 'none';
type SortOrder = 'asc' | 'desc';

export const ProductsPage: React.FC<ProductsPageProps> = ({
  products,
  categories,
  onNavigate,
  onDuplicate,
  onDeleteSingle,
  onDeleteMultiple,
  initialViewProductId,
  clearInitialViewProductId,
}) => {
  // State tìm kiếm & lọc
  const [searchTerm, setSearchTerm] = useState('');
  const [skuSearchTerm, setSkuSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  
  // State sắp xếp
  const [sortField, setSortField] = useState<SortField>('updatedAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // State chọn nhiều
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // State xem chi tiết sản phẩm trong Modal
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);

  // Phân trang đơn giản
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Xử lý deep link để xem trực tiếp nếu có từ trang tổng quan
  React.useEffect(() => {
    if (initialViewProductId) {
      const found = products.find(p => p.id === initialViewProductId);
      if (found) {
        setViewingProduct(found);
      }
      if (clearInitialViewProductId) {
        clearInitialViewProductId();
      }
    }
  }, [initialViewProductId, products, clearInitialViewProductId]);

  // Bộ lọc dữ liệu sản phẩm
  const filteredProducts = useMemo(() => {
    let result = [...products];

    // Lọc theo tên sản phẩm
    if (searchTerm.trim() !== '') {
      result = result.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }

    // Lọc theo SKU
    if (skuSearchTerm.trim() !== '') {
      result = result.filter(p => p.sku.toLowerCase().includes(skuSearchTerm.toLowerCase()));
    }

    // Lọc theo danh mục
    if (selectedCategory !== 'all') {
      result = result.filter(p => p.category === selectedCategory);
    }

    // Lọc theo trạng thái
    if (selectedStatus !== 'all') {
      result = result.filter(p => p.status === selectedStatus);
    }

    // Sắp xếp
    if (sortField !== 'none') {
      result.sort((a, b) => {
        let valA: any = a[sortField === 'price' ? 'price' : sortField === 'stock' ? 'stock' : 'updatedAt'];
        let valB: any = b[sortField === 'price' ? 'price' : sortField === 'stock' ? 'stock' : 'updatedAt'];

        // Ưu tiên giá khuyến mãi nếu có trong sắp xếp giá
        if (sortField === 'price') {
          valA = a.promoPrice !== null ? a.promoPrice : a.price;
          valB = b.promoPrice !== null ? b.promoPrice : b.price;
        }

        if (sortField === 'updatedAt') {
          valA = new Date(valA).getTime();
          valB = new Date(valB).getTime();
        }

        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [products, searchTerm, skuSearchTerm, selectedCategory, selectedStatus, sortField, sortOrder]);

  // Phân trang sản phẩm
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredProducts.slice(start, start + itemsPerPage);
  }, [filteredProducts, currentPage]);

  // Reset trang về 1 khi tìm kiếm / lọc thay đổi
  React.useEffect(() => {
    setCurrentPage(1);
    setSelectedIds([]); // Reset chọn nhiều
  }, [searchTerm, skuSearchTerm, selectedCategory, selectedStatus, sortField, sortOrder]);

  // Chọn toàn bộ hoặc bỏ chọn toàn bộ sản phẩm ở trang hiện tại
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const currentIds = paginatedProducts.map(p => p.id);
      setSelectedIds(prev => Array.from(new Set([...prev, ...currentIds])));
    } else {
      const currentIds = paginatedProducts.map(p => p.id);
      setSelectedIds(prev => prev.filter(id => !currentIds.includes(id)));
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => [...prev, id]);
    } else {
      setSelectedIds(prev => prev.filter(item => item !== id));
    }
  };

  const isAllCurrentPageSelected = useMemo(() => {
    if (paginatedProducts.length === 0) return false;
    return paginatedProducts.every(p => selectedIds.includes(p.id));
  }, [paginatedProducts, selectedIds]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('desc'); // Sắp xếp giảm dần làm mặc định
    }
  };

  const handleExportExcel = () => {
    if (filteredProducts.length === 0) {
      alert('Không có sản phẩm nào để xuất Excel');
      return;
    }

    try {
      const excelData = filteredProducts.map((p) => {
        const specStr = p.specs && Array.isArray(p.specs)
          ? p.specs.map(s => `${s.name}: ${s.value}`).join(' | ')
          : '';

        let statusText = 'Hoạt động';
        if (p.status === 'draft') statusText = 'Bản nháp';
        if (p.status === 'discontinued') statusText = 'Ngừng bán';

        return {
          'Mã Sản Phẩm': p.id,
          'Tên Sản Phẩm': p.name,
          'Mã SKU': p.sku,
          'Thương Hiệu': p.brand,
          'Danh Mục': p.category,
          'Giá Vốn (đ)': p.costPrice || 0,
          'Giá Bán (đ)': p.price || 0,
          'Giá Khuyến Mãi (đ)': p.promoPrice || '',
          'Tồn Kho': p.stock || 0,
          'Cân Nặng (g)': p.weight !== undefined ? p.weight : 500,
          'Trạng Thượng': statusText,
          'Mô Tả Ngắn': p.shortDescription || '',
          'Thông Số Kỹ Thuật': specStr,
          'Số Lượng Ảnh': p.images ? p.images.length : 0,
          'Ngày Tạo': p.createdAt ? new Date(p.createdAt).toLocaleString('vi-VN') : '',
          'Ngày Cập Nhật': p.updatedAt ? new Date(p.updatedAt).toLocaleString('vi-VN') : '',
          'Mô Tả Chi Tiết': p.description || ''
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const maxLens = excelData.reduce((acc, row) => {
        Object.keys(row).forEach((key, colIndex) => {
          const cellVal = String(row[key as keyof typeof row] || '');
          const len = cellVal.length;
          acc[colIndex] = Math.max(acc[colIndex] || 10, Math.min(len, 40));
        });
        return acc;
      }, [] as number[]);
      
      worksheet['!cols'] = maxLens.map(w => ({ wch: w + 2 }));

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Danh Sách Sản Phẩm');

      const filename = `Voltara_Danh_Sach_San_Pham_${new Date().toISOString().slice(0,10)}.xlsx`;
      XLSX.writeFile(workbook, filename);
    } catch (err) {
      console.error(err);
      alert('Có lỗi xảy ra khi xuất file Excel');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  const getStatusBadge = (status: ProductStatus) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Hoạt động
          </span>
        );
      case 'draft':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            Bản nháp
          </span>
        );
      case 'discontinued':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            Ngừng bán
          </span>
        );
      default:
        return null;
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="w-3.5 h-3.5 ml-1 inline text-slate-400" />;
    return sortOrder === 'asc' ? (
      <ArrowUp className="w-3.5 h-3.5 ml-1 inline text-blue-600 font-bold" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 ml-1 inline text-blue-600 font-bold" />
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Title block */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Danh sách sản phẩm</h1>
          <p className="text-sm text-slate-500">Quản lý kho hàng sản phẩm, sửa đổi, thêm mới và đồng bộ dữ liệu.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-sm transition-all hover:shadow cursor-pointer"
            title="Xuất file Excel toàn bộ sản phẩm đã lọc"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Xuất Excel
          </button>
          <button
            onClick={() => onNavigate('add-product')}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-sm transition-all focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 hover:shadow"
          >
            <Plus className="w-4 h-4" />
            Thêm sản phẩm
          </button>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Search Tên */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm kiếm theo tên sản phẩm..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 hover:bg-slate-100/50 focus:bg-white rounded-xl border border-slate-200 focus:border-blue-500 focus:outline-none transition-all placeholder:text-slate-400"
            />
          </div>

          {/* Search SKU */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm kiếm mã SKU..."
              value={skuSearchTerm}
              onChange={(e) => setSkuSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 hover:bg-slate-100/50 focus:bg-white rounded-xl border border-slate-200 focus:border-blue-500 focus:outline-none transition-all placeholder:text-slate-400 font-mono"
            />
          </div>

          {/* Lọc danh mục */}
          <div className="relative">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full pl-4 pr-10 py-2 text-sm bg-slate-50 hover:bg-slate-100/50 focus:bg-white rounded-xl border border-slate-200 focus:border-blue-500 focus:outline-none transition-all appearance-none cursor-pointer text-slate-700"
            >
              <option value="all">Tất cả danh mục ({categories.length})</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.name}>
                  {cat.name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>

          {/* Lọc trạng thái */}
          <div className="relative">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full pl-4 pr-10 py-2 text-sm bg-slate-50 hover:bg-slate-100/50 focus:bg-white rounded-xl border border-slate-200 focus:border-blue-500 focus:outline-none transition-all appearance-none cursor-pointer text-slate-700"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="active">Đang hoạt động</option>
              <option value="draft">Bản nháp</option>
              <option value="discontinued">Ngừng bán</option>
            </select>
            <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* Selected Items Controls */}
        {selectedIds.length > 0 && (
          <div className="bg-rose-50 border border-rose-100 px-4 py-3 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 animate-fade-in">
            <span className="text-sm font-semibold text-rose-800">
              Đang chọn <strong className="font-bold">{selectedIds.length}</strong> sản phẩm trên toàn bộ trang.
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedIds([])}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Bỏ chọn tất cả
              </button>
              <button
                onClick={() => onDeleteMultiple(selectedIds)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-rose-500"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Xóa {selectedIds.length} sản phẩm đã chọn
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Table Panel */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-[11px] font-bold uppercase tracking-wider border-b border-slate-100 select-none">
                <th className="py-4 px-6 w-12 text-center">
                  <input
                    type="checkbox"
                    checked={isAllCurrentPageSelected}
                    onChange={handleSelectAll}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer w-4 h-4"
                  />
                </th>
                <th className="py-4 px-4 w-16">Hình ảnh</th>
                <th className="py-4 px-6">Tên sản phẩm</th>
                <th className="py-4 px-6">Mã SKU</th>
                <th className="py-4 px-6">Danh mục</th>
                <th className="py-4 px-6 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('price')}>
                  <span className="flex items-center">
                    Giá bán
                    {getSortIcon('price')}
                  </span>
                </th>
                <th className="py-4 px-6 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('stock')}>
                  <span className="flex items-center">
                    Tồn kho
                    {getSortIcon('stock')}
                  </span>
                </th>
                <th className="py-4 px-6">Trạng thái</th>
                <th className="py-4 px-6 text-right w-36">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {paginatedProducts.map((product) => {
                const isSelected = selectedIds.includes(product.id);
                return (
                  <tr 
                    key={product.id} 
                    className={`hover:bg-slate-50/50 transition-colors group ${isSelected ? 'bg-blue-50/30' : ''}`}
                  >
                    <td className="py-3.5 px-6 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => handleSelectOne(product.id, e.target.checked)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer w-4 h-4"
                      />
                    </td>
                    <td className="py-3.5 px-4">
                      <img
                        src={product.mainImage || 'https://images.unsplash.com/photo-1530124566582-ab05104a0c8b?auto=format&fit=crop&q=80&w=100'}
                        alt={product.name}
                        referrerPolicy="no-referrer"
                        className="w-12 h-12 rounded-xl object-cover border border-slate-200 bg-slate-50 cursor-zoom-in"
                        onClick={() => setViewingProduct(product)}
                      />
                    </td>
                    <td className="py-3.5 px-6 font-semibold text-slate-800">
                      <button
                        onClick={() => setViewingProduct(product)}
                        className="hover:text-blue-600 text-left transition-colors font-semibold outline-none focus:underline max-w-[220px] block truncate"
                      >
                        {product.name}
                      </button>
                      <span className="text-[10px] text-slate-400 block font-normal mt-0.5">
                        Cập nhật: {new Date(product.updatedAt).toLocaleDateString('vi-VN')}
                      </span>
                    </td>
                    <td className="py-3.5 px-6 font-mono text-xs text-slate-600">{product.sku}</td>
                    <td className="py-3.5 px-6 text-slate-500">{product.category}</td>
                    <td className="py-3.5 px-6 font-medium text-slate-900">
                      {product.promoPrice !== null ? (
                        <div className="flex flex-col">
                          <span className="text-rose-600 font-bold">{formatCurrency(product.promoPrice)}</span>
                          <span className="text-xs text-slate-400 line-through font-normal">{formatCurrency(product.price)}</span>
                        </div>
                      ) : (
                        <span>{formatCurrency(product.price)}</span>
                      )}
                    </td>
                    <td className="py-3.5 px-6">
                      <span className={`font-semibold ${product.stock <= 5 ? 'text-amber-600 font-bold' : 'text-slate-700'}`}>
                        {product.stock}
                      </span>
                      {product.stock <= 5 && (
                        <span className="text-[10px] block text-amber-500 mt-0.5 font-medium">Báo động</span>
                      )}
                    </td>
                    <td className="py-3.5 px-6">{getStatusBadge(product.status)}</td>
                    <td className="py-3.5 px-6 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setViewingProduct(product)}
                          className="p-2 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-lg transition-colors"
                          title="Xem chi tiết"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onNavigate('edit-product', product.id)}
                          className="p-2 hover:bg-slate-100 text-blue-500 hover:text-blue-700 rounded-lg transition-colors"
                          title="Chỉnh sửa"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onDuplicate(product)}
                          className="p-2 hover:bg-slate-100 text-amber-500 hover:text-amber-700 rounded-lg transition-colors"
                          title="Nhân bản"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onDeleteSingle(product)}
                          className="p-2 hover:bg-rose-50 text-rose-500 hover:text-rose-700 rounded-lg transition-colors"
                          title="Xóa sản phẩm"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center py-16 text-slate-400">
                    <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-500">Không tìm thấy sản phẩm</p>
                    <p className="text-xs text-slate-400 mt-1">Vui lòng điều chỉnh lại từ khóa hoặc bộ lọc của bạn.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination controls */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 bg-slate-50 border-t border-slate-100">
            <span className="text-xs text-slate-500 text-center sm:text-left">
              Hiển thị <strong className="text-slate-800 font-semibold">{paginatedProducts.length}</strong> trên{' '}
              <strong className="text-slate-800 font-semibold">{filteredProducts.length}</strong> sản phẩm
            </span>
            <div className="flex items-center gap-1.5">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                className="p-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: totalPages }).map((_, index) => {
                const pageNumber = index + 1;
                return (
                  <button
                    key={pageNumber}
                    onClick={() => setCurrentPage(pageNumber)}
                    className={`w-9 h-9 text-xs font-bold rounded-lg transition-all ${
                      currentPage === pageNumber
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'border border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    {pageNumber}
                  </button>
                );
              })}
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                className="p-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* DETAILED READ-ONLY MODAL (Xem chi tiết sản phẩm) */}
      {viewingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            onClick={() => setViewingProduct(null)}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
          />

          {/* Modal body */}
          <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-3xl w-full max-h-[85vh] flex flex-col z-10 animate-scale-in overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="min-w-0">
                <span className="text-[10px] uppercase font-bold tracking-wider text-blue-600">Chi tiết sản phẩm Voltara</span>
                <h3 className="text-lg font-bold text-slate-900 truncate">{viewingProduct.name}</h3>
              </div>
              <button
                onClick={() => setViewingProduct(null)}
                className="text-slate-400 hover:text-slate-600 rounded-lg p-1 hover:bg-slate-50 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Images View */}
                <div className="space-y-3">
                  <div className="aspect-square bg-slate-50 border border-slate-100 rounded-2xl overflow-hidden flex items-center justify-center relative">
                    <img
                      src={viewingProduct.mainImage || 'https://images.unsplash.com/photo-1530124566582-ab05104a0c8b?auto=format&fit=crop&q=80&w=500'}
                      alt={viewingProduct.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-3 left-3">
                      {getStatusBadge(viewingProduct.status)}
                    </div>
                  </div>
                  {viewingProduct.images && viewingProduct.images.length > 1 && (
                    <div className="grid grid-cols-4 gap-2">
                      {viewingProduct.images.map((url, index) => (
                        <div 
                          key={index} 
                          className={`aspect-square rounded-lg overflow-hidden border bg-slate-50 ${
                            url === viewingProduct.mainImage ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-slate-200'
                          }`}
                        >
                          <img
                            src={url}
                            alt={`${viewingProduct.name} ${index + 1}`}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Key specs and Pricing */}
                <div className="space-y-4">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3.5">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-slate-400 block">Mã SKU:</span>
                        <strong className="font-mono text-sm text-slate-800">{viewingProduct.sku}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Thương hiệu:</span>
                        <strong className="text-sm text-slate-800">{viewingProduct.brand || 'Voltara'}</strong>
                      </div>
                    </div>
                    <div className="border-t border-slate-200/60 pt-3.5">
                      <span className="text-slate-400 text-xs block">Danh mục:</span>
                      <strong className="text-sm text-slate-800">{viewingProduct.category}</strong>
                    </div>
                  </div>

                  {/* Pricing block */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl">
                      <span className="text-slate-400 text-xs block">Giá niêm yết:</span>
                      <strong className="text-lg font-bold text-slate-800">{formatCurrency(viewingProduct.price)}</strong>
                    </div>
                    <div className="p-3.5 bg-rose-50 border border-rose-100 rounded-xl">
                      <span className="text-rose-600 text-xs block font-semibold">Giá khuyến mãi:</span>
                      <strong className="text-lg font-bold text-rose-700">
                        {viewingProduct.promoPrice ? formatCurrency(viewingProduct.promoPrice) : 'Không có'}
                      </strong>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                      <span className="text-slate-400 block">Giá vốn nhập hàng:</span>
                      <strong className="font-semibold text-slate-800">{formatCurrency(viewingProduct.costPrice)}</strong>
                    </div>
                    <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                      <span className="text-slate-400 block">Mức tồn kho:</span>
                      <strong className={`font-bold ${viewingProduct.stock <= 5 ? 'text-amber-600' : 'text-slate-800'}`}>
                        {viewingProduct.stock} cái
                      </strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Descriptions */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-800 text-sm">Mô tả ngắn</h4>
                <p className="text-slate-600 text-sm bg-slate-50 p-3 rounded-xl border border-slate-100">
                  {viewingProduct.shortDescription || 'Chưa có mô tả ngắn.'}
                </p>
              </div>

              {viewingProduct.description && (
                <div className="space-y-2">
                  <h4 className="font-bold text-slate-800 text-sm">Mô tả chi tiết</h4>
                  <div className="text-slate-600 text-sm bg-slate-50 p-4 rounded-xl border border-slate-100 whitespace-pre-line leading-relaxed max-h-[160px] overflow-y-auto">
                    {viewingProduct.description}
                  </div>
                </div>
              )}

              {/* Technical specs */}
              <div className="space-y-2.5">
                <h4 className="font-bold text-slate-800 text-sm">Thông số kỹ thuật</h4>
                {viewingProduct.specs && viewingProduct.specs.length > 0 ? (
                  <div className="border border-slate-100 rounded-xl overflow-hidden divide-y divide-slate-100">
                    {viewingProduct.specs.map((spec, index) => (
                      <div key={index} className="grid grid-cols-3 text-sm py-2.5 px-4 bg-slate-50/50">
                        <span className="text-slate-500 font-medium col-span-1">{spec.name}</span>
                        <span className="text-slate-800 font-semibold col-span-2">{spec.value}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400 text-xs italic">Chưa cấu hình thông số kỹ thuật cho sản phẩm này.</p>
                )}
              </div>
            </div>

            {/* Footer buttons */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50 border-t border-slate-100">
              <button
                onClick={() => setViewingProduct(null)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
              >
                Đóng
              </button>
              <button
                onClick={() => {
                  setViewingProduct(null);
                  onNavigate('edit-product', viewingProduct.id);
                }}
                className="px-4 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-colors"
              >
                Chỉnh sửa sản phẩm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
