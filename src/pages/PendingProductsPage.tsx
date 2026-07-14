import React, { useState, useEffect } from 'react';
import { 
  Package, ExternalLink, Eye, Edit3, CheckCircle, XCircle, Trash2, 
  Clock, Store, ChevronDown, ChevronUp, AlertCircle, ShoppingBag, 
  HelpCircle, RefreshCw, FileJson, FileSpreadsheet, ChevronLeft, ChevronRight
} from 'lucide-react';
import { ExtensionProductPending } from '../types/extensionImportTypes';
import { extensionImportService } from '../services/extensionImportService';
import * as XLSX from 'xlsx';

interface PendingProductsPageProps {
  onNavigateToImport: (product: ExtensionProductPending) => void;
  addToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

export const PendingProductsPage: React.FC<PendingProductsPageProps> = ({
  onNavigateToImport,
  addToast
}) => {
  const [pendingProducts, setPendingProducts] = useState<ExtensionProductPending[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedProduct, setSelectedProduct] = useState<ExtensionProductPending | null>(null);
  const [isRawDataOpen, setIsRawDataOpen] = useState<boolean>(false);
  const [filterStatus, setFilterStatus] = useState<string>('pending_review');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 10;

  const fetchPendingProducts = async () => {
    setIsLoading(true);
    try {
      const prods = await extensionImportService.getPendingProducts();
      setPendingProducts(prods);
    } catch (err) {
      addToast('Không thể tải danh sách sản phẩm chờ nhập', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingProducts();
  }, []);

  const handleUpdateStatus = async (id: string, status: 'pending_review' | 'imported' | 'rejected') => {
    const success = await extensionImportService.updateStatus(id, status);
    if (success) {
      addToast(
        status === 'rejected' ? 'Đã từ chối nhập sản phẩm này.' : 'Đã cập nhật trạng thái thành công.', 
        status === 'rejected' ? 'warning' : 'success'
      );
      fetchPendingProducts();
      if (selectedProduct?.id === id) {
        setSelectedProduct(null);
      }
    } else {
      addToast('Có lỗi xảy ra khi cập nhật trạng thái', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    const success = await extensionImportService.deletePendingProduct(id);
    if (success) {
      addToast('Đã xóa sản phẩm khỏi danh sách chờ nhập', 'success');
      fetchPendingProducts();
      if (selectedProduct?.id === id) {
        setSelectedProduct(null);
      }
    } else {
      addToast('Có lỗi xảy ra khi xóa sản phẩm', 'error');
    }
  };

  // Lọc sản phẩm theo trạng thái được chọn và sắp xếp cái mới nhất (cập nhật sau) lên đầu tiên
  const filteredProducts = pendingProducts
    .filter(p => {
      if (filterStatus === 'all') return true;
      return p.status === filterStatus;
    })
    .sort((a, b) => {
      const timeA = a.importedAt ? new Date(a.importedAt).getTime() : 0;
      const timeB = b.importedAt ? new Date(b.importedAt).getTime() : 0;
      return timeB - timeA; // Newest / recently imported first
    });

  // Reset trang về 1 khi đổi bộ lọc
  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus]);

  // Phân trang
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleExportExcel = () => {
    if (filteredProducts.length === 0) {
      addToast('Không có sản phẩm nào để xuất Excel', 'warning');
      return;
    }

    try {
      const excelData = filteredProducts.map((p) => {
        const specStr = p.specifications && Array.isArray(p.specifications)
          ? p.specifications.map(s => `${s.name}: ${s.value}`).join(' | ')
          : '';
          
        const variantStr = p.variants && Array.isArray(p.variants)
          ? p.variants.map(v => `${v.name} (${v.options.join(', ')})`).join(' | ')
          : '';

        let statusText = 'Chờ duyệt';
        if (p.status === 'imported') statusText = 'Đã nhập kho';
        if (p.status === 'rejected') statusText = 'Từ chối';

        return {
          'Mã Thu Thập': p.id,
          'Mã Sản Phẩm Shopee': p.externalProductId || '',
          'Tên Sản Phẩm': p.name,
          'Đường Dẫn Shopee': p.sourceUrl,
          'Giá Bán (đ)': p.price || 0,
          'Giá Gốc (đ)': p.originalPrice || '',
          'Danh Mục Gợi Ý': p.category || 'Mặc định',
          'Cân Nặng (g)': p.weight !== undefined ? p.weight : 500,
          'Cửa Hàng (Seller)': p.seller?.name || 'Cửa hàng Shopee',
          'Đường Dẫn Cửa Hàng': p.seller?.shopUrl || '',
          'Trạng Thái': statusText,
          'Ngày Thu Thập': p.importedAt ? new Date(p.importedAt).toLocaleString('vi-VN') : '',
          'Thông Số Kỹ Thuật': specStr,
          'Phân Loại Biến Thể': variantStr,
          'Số Lượng Ảnh': p.images ? p.images.length : 0,
          'Mô Tả Sản Phẩm': p.description || ''
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
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Sản Phẩm Chờ Duyệt');

      let statusLabel = 'tat_ca';
      if (filterStatus === 'pending_review') statusLabel = 'cho_duyet';
      if (filterStatus === 'imported') statusLabel = 'da_nhap_kho';
      if (filterStatus === 'rejected') statusLabel = 'bi_tu_choi';

      const filename = `Voltara_SP_Cho_Nhap_${statusLabel}_${new Date().toISOString().slice(0,10)}.xlsx`;

      XLSX.writeFile(workbook, filename);
      addToast('Xuất file Excel thành công!', 'success');
    } catch (err) {
      console.error(err);
      addToast('Có lỗi xảy ra khi xuất file Excel', 'error');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending_review':
        return (
          <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full text-xs font-semibold border border-amber-100">
            <Clock className="w-3.5 h-3.5" />
            Chờ duyệt
          </span>
        );
      case 'imported':
        return (
          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full text-xs font-semibold border border-emerald-100">
            <CheckCircle className="w-3.5 h-3.5" />
            Đã nhập kho
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 px-2.5 py-1 rounded-full text-xs font-semibold border border-rose-100">
            <XCircle className="w-3.5 h-3.5" />
            Từ chối
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Page Title & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <ShoppingBag className="w-6.5 h-6.5 text-blue-600" />
            Sản phẩm chờ nhập từ Extension
          </h1>
          <p className="text-sm text-slate-500 font-normal">
            Dữ liệu sản phẩm được người dùng lấy trực tiếp từ các sàn thương mại điện tử qua Chrome Extension Voltara.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <button
            onClick={handleExportExcel}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold flex items-center gap-2 transition-colors shadow-sm cursor-pointer"
            title="Xuất file Excel danh sách sản phẩm"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Xuất Excel
          </button>

          <button
            onClick={fetchPendingProducts}
            className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold flex items-center gap-2 transition-colors shadow-sm"
            title="Làm mới danh sách"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Tải lại dữ liệu
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200/80 pb-px">
        {[
          { id: 'pending_review', label: 'Chờ duyệt' },
          { id: 'imported', label: 'Đã nhập kho' },
          { id: 'rejected', label: 'Bị từ chối' },
          { id: 'all', label: 'Tất cả' }
        ].map((tab) => {
          const count = pendingProducts.filter(p => tab.id === 'all' ? true : p.status === tab.id).length;
          const isActive = filterStatus === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setFilterStatus(tab.id)}
              className={`px-4 py-2.5 text-sm font-bold transition-all relative -mb-px ${
                isActive 
                  ? 'text-blue-600 border-b-2 border-blue-600 font-bold' 
                  : 'text-slate-500 hover:text-slate-900 font-semibold'
              }`}
            >
              {tab.label}
              <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-bold ${
                isActive ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Main Grid View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left list: 2/3 width */}
        <div className="lg:col-span-2 space-y-4">
          {isLoading ? (
            <div className="bg-white p-12 rounded-2xl border border-slate-100 shadow-sm text-center">
              <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
              <p className="text-sm text-slate-500">Đang tải danh sách sản phẩm chờ duyệt từ máy chủ...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl border border-slate-100 shadow-sm text-center space-y-3">
              <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mx-auto border border-slate-100">
                <Package className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-slate-800">Không có sản phẩm nào</h3>
              <p className="text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
                {filterStatus === 'pending_review' 
                  ? 'Hiện tại không có sản phẩm nào đang chờ duyệt. Sử dụng nút mô phỏng ở trang Cài đặt để tạo sản phẩm mẫu từ Extension.'
                  : `Không tìm thấy sản phẩm nào có trạng thái được lọc.`}
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] font-extrabold border-b border-slate-200/80">
                      <th className="py-3 px-4">Sản phẩm</th>
                      <th className="py-3 px-4">Nguồn</th>
                      <th className="py-3 px-4 text-right">Giá</th>
                      <th className="py-3 px-4 text-center">Ảnh</th>
                      <th className="py-3 px-4">Ngày thu thập</th>
                      <th className="py-3 px-4">Trạng thái</th>
                      <th className="py-3 px-4 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {paginatedProducts.map((prod) => (
                      <tr 
                        key={prod.id}
                        className={`hover:bg-slate-50/75 transition-colors cursor-pointer ${
                          selectedProduct?.id === prod.id ? 'bg-blue-50/30 font-medium' : ''
                        }`}
                        onClick={() => {
                          setSelectedProduct(prod);
                          setIsRawDataOpen(false);
                        }}
                      >
                        <td className="py-3.5 px-4 max-w-xs">
                          <div className="flex items-center gap-3">
                            <img 
                              src={prod.images[0] || 'https://images.unsplash.com/photo-1534224039826-c7a0dea0e66a?auto=format&fit=crop&q=80&w=800'} 
                              alt={prod.name}
                              className="w-11 h-11 object-cover rounded-lg border border-slate-200 shadow-xs shrink-0"
                              referrerPolicy="no-referrer"
                            />
                            <div className="truncate">
                              <div className="font-bold text-slate-900 truncate hover:text-blue-600 transition-colors" title={prod.name}>
                                {prod.name}
                              </div>
                              <span className="text-[11px] text-slate-400 font-mono">ID: {prod.id}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-orange-600">
                          <span className="inline-flex items-center gap-1 bg-orange-50 px-2 py-0.5 rounded-md text-xs border border-orange-100">
                            Shopee
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                          {prod.price ? `${prod.price.toLocaleString('vi-VN')} đ` : 'Chưa cập nhật'}
                        </td>
                        <td className="py-3.5 px-4 text-center font-bold text-slate-600">
                          {prod.images.length}
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 text-xs">
                          {new Date(prod.importedAt).toLocaleDateString('vi-VN')}
                        </td>
                        <td className="py-3.5 px-4">
                          {getStatusBadge(prod.status)}
                        </td>
                        <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => {
                                setSelectedProduct(prod);
                                setIsRawDataOpen(false);
                              }}
                              className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-lg transition-colors border border-transparent"
                              title="Xem chi tiết dữ liệu"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            
                            {prod.status === 'pending_review' && (
                              <>
                                <button
                                  onClick={() => onNavigateToImport(prod)}
                                  className="p-1.5 hover:bg-blue-50 text-blue-600 hover:text-blue-800 rounded-lg transition-colors border border-transparent"
                                  title="Nhập vào kho (Chỉnh sửa trước khi lưu)"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleUpdateStatus(prod.id, 'rejected')}
                                  className="p-1.5 hover:bg-rose-50 text-rose-500 hover:text-rose-700 rounded-lg transition-colors border border-transparent"
                                  title="Từ chối sản phẩm"
                                >
                                  <XCircle className="w-4 h-4" />
                                </button>
                              </>
                            )}

                            <button
                              onClick={() => handleDelete(prod.id)}
                              className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-rose-600 rounded-lg transition-colors border border-transparent"
                              title="Xóa vĩnh viễn"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
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
                      className="p-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    {Array.from({ length: totalPages }).map((_, index) => {
                      const pageNumber = index + 1;
                      return (
                        <button
                          key={pageNumber}
                          onClick={() => setCurrentPage(pageNumber)}
                          className={`w-9 h-9 text-xs font-bold rounded-lg transition-all cursor-pointer ${
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
                      className="p-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Detail Card: 1/3 width */}
        <div className="space-y-4">
          {selectedProduct ? (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-md space-y-5 sticky top-20 animate-scale-in">
              {/* Header */}
              <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Chi tiết dữ liệu đã thu thập</span>
                  <h3 className="font-extrabold text-slate-900 text-base leading-snug line-clamp-2" title={selectedProduct.name}>
                    {selectedProduct.name}
                  </h3>
                </div>
                <button 
                  onClick={() => setSelectedProduct(null)}
                  className="text-slate-400 hover:text-slate-600 text-xs font-semibold hover:bg-slate-50 px-2 py-1 rounded-md shrink-0"
                >
                  Đóng
                </button>
              </div>

              {/* Source info */}
              <div className="grid grid-cols-2 gap-4 text-xs border-b border-slate-100 pb-4">
                <div className="space-y-1">
                  <span className="text-slate-400 block font-semibold">Nguồn sàn:</span>
                  <span className="font-bold text-orange-600 uppercase">Shopee Việt Nam</span>
                </div>
                <div className="space-y-1">
                  <span className="text-slate-400 block font-semibold">Cửa hàng gốc (Seller):</span>
                  <span className="font-bold text-slate-800 flex items-center gap-1">
                    <Store className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    {selectedProduct.seller?.name || 'Chưa cập nhật'}
                  </span>
                </div>
                <div className="col-span-2 space-y-1">
                  <span className="text-slate-400 block font-semibold">Đường dẫn sản phẩm:</span>
                  <a 
                    href={selectedProduct.sourceUrl} 
                    target="_blank" 
                    rel="noreferrer"
                    className="text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 transition-colors group"
                  >
                    <span className="truncate max-w-[200px] inline-block">{selectedProduct.sourceUrl}</span>
                    <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </a>
                </div>
              </div>

              {/* Price list */}
              <div className="grid grid-cols-2 gap-4 text-xs border-b border-slate-100 pb-4">
                <div className="space-y-1">
                  <span className="text-slate-400 block font-semibold">Giá bán Shopee:</span>
                  <span className="font-extrabold text-slate-900 text-sm">
                    {selectedProduct.price ? `${selectedProduct.price.toLocaleString('vi-VN')} đ` : 'Chưa cập nhật'}
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="text-slate-400 block font-semibold">Giá gốc (Gạch đi):</span>
                  <span className="font-semibold text-slate-400 line-through">
                    {selectedProduct.originalPrice ? `${selectedProduct.originalPrice.toLocaleString('vi-VN')} đ` : 'Chưa có'}
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="text-slate-400 block font-semibold">Nhóm danh mục gợi ý:</span>
                  <span className="font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[11px] inline-block">
                    {selectedProduct.category || 'Mặc định'}
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="text-slate-400 block font-semibold">Cân nặng Shopee:</span>
                  <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded text-[11px] inline-block border border-blue-100">
                    {selectedProduct.weight !== undefined ? `${selectedProduct.weight} g` : '500 g'}
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="text-slate-400 block font-semibold">Ngày lấy dữ liệu:</span>
                  <span className="font-semibold text-slate-600">
                    {new Date(selectedProduct.importedAt).toLocaleString('vi-VN')}
                  </span>
                </div>
              </div>

              {/* Image List Scroll */}
              <div className="space-y-2">
                <span className="text-xs text-slate-400 block font-semibold">Hình ảnh thu thập ({selectedProduct.images.length})</span>
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
                  {selectedProduct.images.map((img, index) => (
                    <img
                      key={index}
                      src={img}
                      alt={`Shopee img ${index}`}
                      className="w-12 h-12 object-cover rounded-lg border border-slate-200 shrink-0"
                      referrerPolicy="no-referrer"
                    />
                  ))}
                </div>
              </div>

              {/* Description preview */}
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                <span className="text-xs text-slate-400 block font-semibold">Mô tả sản phẩm</span>
                <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap font-normal">
                  {selectedProduct.description || 'Không có mô tả sản phẩm.'}
                </p>
              </div>

              {/* Variants */}
              {selectedProduct.variants && selectedProduct.variants.length > 0 && (
                <div className="space-y-2 border-t border-slate-100 pt-4">
                  <span className="text-xs text-slate-400 block font-semibold">Phân loại sản phẩm</span>
                  <div className="space-y-2 text-xs">
                    {selectedProduct.variants.map((v, i) => (
                      <div key={i} className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                        <strong className="text-slate-700 font-bold block mb-1">{v.name}:</strong>
                        <div className="flex flex-wrap gap-1">
                          {v.options.map((opt, oi) => (
                            <span key={oi} className="bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-600">
                              {opt}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons inside Card */}
              <div className="space-y-2 border-t border-slate-100 pt-4">
                {selectedProduct.status === 'pending_review' ? (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => onNavigateToImport(selectedProduct)}
                      className="py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-colors"
                    >
                      <Edit3 className="w-4 h-4" />
                      Nhập vào kho
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(selectedProduct.id, 'rejected')}
                      className="py-2.5 px-4 bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 border border-slate-200/60 transition-colors"
                    >
                      <XCircle className="w-4 h-4" />
                      Từ chối nhập
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-2 bg-slate-50 rounded-xl text-xs text-slate-500 font-bold">
                    Trạng thái: {selectedProduct.status === 'imported' ? 'Đã nhập vào kho hàng' : 'Đã bị từ chối'}
                  </div>
                )}
                
                <button
                  onClick={() => handleDelete(selectedProduct.id)}
                  className="w-full py-2 px-4 bg-white hover:bg-slate-50 text-slate-500 hover:text-rose-600 border border-slate-200 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Xóa sản phẩm này
                </button>
              </div>

              {/* Raw Data Toggle Accordion */}
              <div className="border-t border-slate-100 pt-3">
                <button
                  onClick={() => setIsRawDataOpen(!isRawDataOpen)}
                  className="w-full flex items-center justify-between text-xs text-slate-400 hover:text-slate-600 font-bold"
                >
                  <span className="flex items-center gap-1">
                    <FileJson className="w-3.5 h-3.5 text-slate-400" />
                    Dữ liệu gốc (Raw JSON)
                  </span>
                  {isRawDataOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {isRawDataOpen && (
                  <div className="mt-2 p-3 bg-slate-900 text-emerald-400 rounded-xl text-[10px] font-mono overflow-auto max-h-48 whitespace-pre border border-slate-800 shadow-inner">
                    {JSON.stringify(selectedProduct, null, 2)}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 border border-dashed border-slate-200/80 p-8 rounded-2xl text-center space-y-2 text-slate-400 h-96 flex flex-col justify-center items-center">
              <AlertCircle className="w-8 h-8 text-slate-300" />
              <p className="text-xs font-semibold">Chọn một sản phẩm bất kỳ trong danh sách bên trái để mở bảng thông tin thu thập và xem dữ liệu gốc.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
