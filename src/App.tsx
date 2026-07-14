import React, { useState, useEffect } from 'react';
import { productService } from './services/productService';
import { Product, Category } from './types';
import { ToastContainer, ToastMessage } from './components/Toast';
import { ConfirmModal } from './components/ConfirmModal';
import { OverviewPage } from './pages/OverviewPage';
import { ProductsPage } from './pages/ProductsPage';
import { ProductFormPage } from './pages/ProductFormPage';
import { CategoriesPage } from './pages/CategoriesPage';
import { PlaceholderPage } from './pages/PlaceholderPage';
import { SettingsPage } from './pages/SettingsPage';
import { PendingProductsPage } from './pages/PendingProductsPage';
import { extensionImportService } from './services/extensionImportService';
import { ExtensionProductPending } from './types/extensionImportTypes';

// Facebook integrations
import { FacebookPostsPage } from './pages/FacebookPostsPage';
import { FacebookPostEditorPage } from './pages/FacebookPostEditorPage';
import { FacebookPagesPage } from './pages/FacebookPagesPage';
import { FacebookLogsPage } from './pages/FacebookLogsPage';
import { FacebookSchedulePage } from './pages/FacebookSchedulePage';
import { FacebookPost } from './types/facebookTypes';


const normalizeImportedPrice = (value?: number): number => {
  if (value === undefined || value === null || !Number.isFinite(Number(value))) return 0;
  const numeric = Math.round(Number(value));

  if (numeric >= 1000000) {
    const text = String(Math.trunc(numeric));
    const maybeDiscount = Number(text.slice(-2));
    const maybePrice = Number(text.slice(0, -2));
    if (maybeDiscount > 0 && maybeDiscount <= 99 && maybePrice >= 10000 && maybePrice <= 50000000 && maybePrice % 1000 === 0) {
      return maybePrice;
    }
  }

  if (numeric > 10000000 && numeric % 1000 !== 0) {
    return 0;
  }

  return numeric;
};

const sanitizeImportedDescription = (value?: string): string => {
  const description = (value || '').trim();
  if (!description) return '';

  const lower = description.toLowerCase();
  const footerSignals = [
    'kênh người bán',
    'kenh nguoi ban',
    'tải ứng dụng',
    'tai ung dung',
    'kết nối',
    'ket noi',
    'thông báo',
    'thong bao',
    'hỗ trợ',
    'ho tro',
    'chăm sóc khách hàng',
    'cham soc khach hang',
    'trung tâm trợ giúp',
    'trung tam tro giup',
    'bản quyền thuộc về',
    'ban quyen thuoc ve',
    'công ty tnhh shopee',
  ];

  const signalCount = footerSignals.filter(signal => lower.includes(signal)).length;
  return signalCount >= 2 ? '' : description;
};

// Import icons
import { 
  LayoutDashboard, Package, PlusCircle, Tags, CloudLightning, 
  RefreshCcw, Settings, Menu, X, Bolt, Clock, Activity, AlertTriangle,
  ShoppingBag, Facebook, FileText, Globe
} from 'lucide-react';

export default function App() {
  // --- CORE APP STATES ---
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeTab, setActiveTab] = useState<string>('overview');
  
  // Mobile menu control
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Parameter passing states for edit and duplicate
  const [editProductId, setEditProductId] = useState<string | null>(null);
  const [duplicateProductData, setDuplicateProductData] = useState<Omit<Product, 'id' | 'createdAt' | 'updatedAt'> | null>(null);
  
  // For viewing product directly via deep links (e.g. from Overview)
  const [initialViewProductId, setInitialViewProductId] = useState<string | undefined>(undefined);

  // States for Extension Product Imports
  const [importedProductData, setImportedProductData] = useState<Omit<Product, 'id' | 'createdAt' | 'updatedAt'> | null>(null);
  const [importingPendingId, setImportingPendingId] = useState<string | null>(null);

  // States for Facebook Copied Post Editor
  const [editFacebookPost, setEditFacebookPost] = useState<FacebookPost | null>(null);

  // --- CONFIGURATION STATES ---
  const [lowStockThreshold, setLowStockThreshold] = useState<number>(5);

  // --- TOAST NOTIFICATIONS STATE ---
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'success') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // --- CONFIRM MODAL STATE ---
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type: 'danger' | 'warning' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    type: 'danger',
  });

  const closeConfirmModal = () => {
    setConfirmModal((prev) => ({ ...prev, isOpen: false }));
  };

  // --- CLOCK STATE ---
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    // Định dạng giờ Việt Nam cho đồng hồ hiển thị
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        }) + ' - ' + now.toLocaleDateString('vi-VN', {
          weekday: 'long',
          year: 'numeric',
          month: 'numeric',
          day: 'numeric',
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // --- DATABASE SEEDING / INITIAL LOADING ---
  const loadDataFromStorage = () => {
    const prods = productService.getProducts();
    const cats = productService.getCategories();
    setProducts(prods);
    setCategories(cats);
  };

  useEffect(() => {
    loadDataFromStorage();
  }, []);

  // --- ACTIONS ---

  // Khôi phục CSDL mặc định
  const handleResetDatabase = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Khôi phục cơ sở dữ liệu mẫu?',
      message: 'Hành động này sẽ xóa sạch dữ liệu sản phẩm hiện tại của bạn và khôi phục lại 10 dòng sản phẩm cơ bản Voltara gốc. Bạn có chắc chắn muốn tiếp tục?',
      type: 'danger',
      onConfirm: () => {
        localStorage.removeItem('voltara_products');
        localStorage.removeItem('voltara_categories');
        loadDataFromStorage();
        closeConfirmModal();
        setActiveTab('overview');
        addToast('Đã khôi phục cơ sở dữ liệu Voltara gốc thành công!', 'success');
      },
    });
  };

  // Xem, Sửa, Nhân bản hoặc Thêm sản phẩm điều hướng
  const handleNavigate = (tab: string, param?: string) => {
    setIsMobileMenuOpen(false); // Đóng menu mobile nếu đang mở

    if (tab === 'add-product') {
      setEditProductId(null);
      setDuplicateProductData(null);
      setActiveTab('add-product');
    } else if (tab === 'edit-product' && param) {
      setEditProductId(param);
      setDuplicateProductData(null);
      setActiveTab('add-product');
    } else if (tab === 'products' && param?.startsWith('view-')) {
      const prodId = param.replace('view-', '');
      setInitialViewProductId(prodId);
      setActiveTab('products');
    } else if (tab === 'fb-post-edit' && param) {
      try {
        const postObj = JSON.parse(param);
        setEditFacebookPost(postObj);
        setActiveTab('fb-post-edit');
      } catch (e) {
        console.error('Error parsing fb post param:', e);
      }
    } else {
      setActiveTab(tab);
    }
  };

  // Hàm điều hướng và map dữ liệu sản phẩm từ Extension sang Form nhập
  const handleNavigateToImportForm = (pendingProd: ExtensionProductPending) => {
    const importedPrice = normalizeImportedPrice(pendingProd.price);
    const importedOriginalPrice = pendingProd.originalPrice ? normalizeImportedPrice(pendingProd.originalPrice) : undefined;
    const importedDescription = sanitizeImportedDescription(pendingProd.description);
    const extensionFormData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'> = {
      name: pendingProd.name,
      sku: pendingProd.sku || `VLT-IMP-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
      brand: pendingProd.seller?.name || 'Voltara',
      category: pendingProd.category || (categories[0]?.name || ''),
      shortDescription: `Sản phẩm nhập từ Shopee (${pendingProd.sourceUrl})`,
      description: importedDescription,
      costPrice: 0,
      price: importedOriginalPrice && importedOriginalPrice > importedPrice ? importedOriginalPrice : importedPrice,
      promoPrice: importedOriginalPrice && importedOriginalPrice > importedPrice ? importedPrice || null : null,
      stock: 20, // Số lượng tồn kho mặc định
      specs: [
        { name: 'Nguồn thu thập', value: 'Shopee' },
        { name: 'Mã Shopee', value: pendingProd.externalProductId || 'Không rõ' },
        ...(pendingProd.variants ? pendingProd.variants.map(v => ({ name: `Phân loại ${v.name}`, value: v.options.join(', ') })) : [])
      ],
      images: pendingProd.images && pendingProd.images.length > 0 ? pendingProd.images : [
        'https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&q=80&w=600'
      ],
      mainImage: pendingProd.images && pendingProd.images.length > 0 ? pendingProd.images[0] : 'https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&q=80&w=600',
      weight: pendingProd.weight !== undefined ? pendingProd.weight : 500,
      status: 'draft' // Nháp để kiểm duyệt
    };

    setImportedProductData(extensionFormData);
    setImportingPendingId(pendingProd.id);
    setEditProductId(null);
    setDuplicateProductData(null);
    setActiveTab('add-product');
  };

  // Lưu sản phẩm (Add / Edit)
  const handleSaveProduct = (productData: Product) => {
    const isEditing = products.some((p) => p.id === productData.id);
    const saved = productService.saveProduct(productData);
    
    loadDataFromStorage(); // Cập nhật lại state
    
    if (importingPendingId) {
      // Nếu là sản phẩm từ Extension, cập nhật trạng thái đã nhập kho trên backend
      extensionImportService.updateStatus(importingPendingId, 'imported')
        .then(success => {
          if (success) {
            addToast(`Nhập kho thành công sản phẩm từ Extension với mã SKU: ${saved.sku}`, 'success');
          }
        })
        .catch(err => console.error('Lỗi khi cập nhật trạng thái nhập kho:', err));
      
      setImportingPendingId(null);
      setImportedProductData(null);
      setActiveTab('pending-products'); // Về lại danh sách sản phẩm chờ nhập
    } else {
      setActiveTab('products'); // Quay về trang danh sách thông thường
      if (isEditing) {
        addToast(`Cập nhật sản phẩm "${saved.name}" thành công!`, 'success');
      } else {
        if (duplicateProductData) {
          addToast(`Nhân bản sản phẩm thành công với mã SKU mới: ${saved.sku}`, 'success');
        } else {
          addToast(`Thêm sản phẩm mới "${saved.name}" thành công!`, 'success');
        }
      }
    }
    
    // Clear temporary parameters
    setEditProductId(null);
    setDuplicateProductData(null);
  };

  // Nhân bản sản phẩm
  const handleDuplicateProduct = (product: Product) => {
    const duplicatedData = productService.prepareDuplicate(product);
    setDuplicateProductData(duplicatedData);
    setEditProductId(null);
    setActiveTab('add-product');
    addToast(`Đã sao chép thông tin sản phẩm. Vui lòng kiểm tra và lưu mã SKU mới: ${duplicatedData.sku}`, 'info');
  };

  // Xóa đơn lẻ sản phẩm
  const handleDeleteSingleProduct = (product: Product) => {
    setConfirmModal({
      isOpen: true,
      title: 'Xóa sản phẩm này?',
      message: `Bạn có chắc chắn muốn xóa sản phẩm "${product.name}" (SKU: ${product.sku}) ra khỏi kho trung tâm? Hành động này không thể khôi phục.`,
      type: 'danger',
      onConfirm: () => {
        const success = productService.deleteProduct(product.id);
        if (success) {
          loadDataFromStorage();
          addToast(`Đã xóa sản phẩm "${product.name}" khỏi hệ thống.`, 'success');
        } else {
          addToast('Có lỗi xảy ra khi xóa sản phẩm.', 'error');
        }
        closeConfirmModal();
      },
    });
  };

  // Xóa hàng loạt sản phẩm
  const handleDeleteMultipleProducts = (ids: string[]) => {
    setConfirmModal({
      isOpen: true,
      title: `Xóa hàng loạt ${ids.length} sản phẩm?`,
      message: `Bạn có chắc chắn muốn xóa vĩnh viễn ${ids.length} sản phẩm đã chọn ra khỏi hệ thống? Hành động này sẽ loại bỏ tất cả thông tin liên quan.`,
      type: 'danger',
      onConfirm: () => {
        const success = productService.deleteMultipleProducts(ids);
        if (success) {
          loadDataFromStorage();
          addToast(`Đã xóa thành công ${ids.length} sản phẩm khỏi kho hàng.`, 'success');
        } else {
          addToast('Có lỗi xảy ra khi xóa nhiều sản phẩm.', 'error');
        }
        closeConfirmModal();
      },
    });
  };

  // Thêm danh mục mới
  const handleAddCategory = (categoryData: Omit<Category, 'id' | 'slug'>) => {
    const slug = categoryData.name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[đĐ]/g, 'd')
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-');

    const newCat: Category = {
      id: Math.random().toString(36).substr(2, 9),
      name: categoryData.name,
      description: categoryData.description,
      slug: slug,
    };

    productService.saveCategory(newCat);
    loadDataFromStorage();
    addToast(`Đã tạo thành công nhóm danh mục "${newCat.name}"`, 'success');
  };

  // Xóa danh mục (Chỉ cho phép nếu không có sản phẩm nào thuộc danh mục này)
  const handleDeleteCategory = (id: string) => {
    const cat = categories.find((c) => c.id === id);
    if (!cat) return;

    // Kiểm tra số sản phẩm trong danh mục này
    const hasProducts = products.some((p) => p.category === cat.name);
    if (hasProducts) {
      addToast('Không thể xóa danh mục này vì đang có sản phẩm thuộc danh mục.', 'warning');
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: 'Xóa danh mục?',
      message: `Bạn có chắc chắn muốn xóa nhóm danh mục "${cat.name}"? Hành động này không ảnh hưởng đến sản phẩm vì nhóm đang trống.`,
      type: 'danger',
      onConfirm: () => {
        const success = productService.deleteCategory(id);
        if (success) {
          loadDataFromStorage();
          addToast(`Đã xóa danh mục "${cat.name}" khỏi hệ thống.`, 'success');
        } else {
          addToast('Có lỗi xảy ra khi xóa danh mục.', 'error');
        }
        closeConfirmModal();
      },
    });
  };

  // Navigation filter shortcut từ danh mục
  const handleNavigateToProductsFilteredByCategory = (categoryName: string) => {
    setActiveTab('products');
    // Ta có thể cấu hình thông qua state trung tâm để trigger lọc bên products nếu muốn,
    // hoặc đơn giản là hiển thị thông báo. Để tiện lợi, chúng ta đã code filter trực tiếp.
  };

  // --- MENU ITEMS DEFINITION ---
  const menuItems = [
    { id: 'overview', label: 'Tổng quan', icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'products', label: 'Sản phẩm', icon: <Package className="w-5 h-5" /> },
    { id: 'add-product', label: 'Thêm sản phẩm', icon: <PlusCircle className="w-5 h-5" /> },
    { id: 'pending-products', label: 'Sản phẩm chờ nhập', icon: <ShoppingBag className="w-5 h-5" /> },
    { id: 'categories', label: 'Danh mục', icon: <Tags className="w-5 h-5" /> },
    { id: 'multi-channel', label: 'Đăng đa sàn', icon: <CloudLightning className="w-5 h-5" /> },
    { id: 'inventory-sync', label: 'Đồng bộ tồn kho', icon: <RefreshCcw className="w-5 h-5" /> },
    { id: 'settings', label: 'Cài đặt', icon: <Settings className="w-5 h-5" /> },
  ];

  const facebookMenuItems = [
    { id: 'fb-posts', label: 'Bài viết đã copy', icon: <FileText className="w-5 h-5" /> },
    { id: 'fb-pages', label: 'Fanpage đã kết nối', icon: <Globe className="w-5 h-5" /> },
    { id: 'fb-schedule', label: 'Lịch đăng', icon: <Clock className="w-5 h-5" /> },
    { id: 'fb-logs', label: 'Nhật ký đăng', icon: <Activity className="w-5 h-5" /> },
  ];

  // --- RENDER PAGE CONTROLLER ---
  const renderActivePage = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <OverviewPage
            products={products}
            categories={categories}
            onNavigate={handleNavigate}
            onDuplicate={handleDuplicateProduct}
          />
        );
      case 'products':
        return (
          <ProductsPage
            products={products}
            categories={categories}
            onNavigate={handleNavigate}
            onDuplicate={handleDuplicateProduct}
            onDeleteSingle={handleDeleteSingleProduct}
            onDeleteMultiple={handleDeleteMultipleProducts}
            initialViewProductId={initialViewProductId}
            clearInitialViewProductId={() => setInitialViewProductId(undefined)}
          />
        );
      case 'add-product':
        return (
          <ProductFormPage
            editProductId={editProductId}
            duplicateProductData={duplicateProductData}
            importedProductData={importedProductData}
            categories={categories}
            onSave={handleSaveProduct}
            onCancel={() => {
              setEditProductId(null);
              setDuplicateProductData(null);
              setImportedProductData(null);
              if (importingPendingId) {
                setImportingPendingId(null);
                setActiveTab('pending-products');
              } else {
                setActiveTab('products');
              }
            }}
            products={products}
          />
        );
      case 'pending-products':
        return (
          <PendingProductsPage
            onNavigateToImport={handleNavigateToImportForm}
            addToast={addToast}
          />
        );
      case 'categories':
        return (
          <CategoriesPage
            categories={categories}
            products={products}
            onAddCategory={handleAddCategory}
            onDeleteCategory={handleDeleteCategory}
            onNavigateToProducts={handleNavigateToProductsFilteredByCategory}
          />
        );
      case 'fb-posts':
        return (
          <FacebookPostsPage
            onNavigateToEditor={(post) => handleNavigate('fb-post-edit', JSON.stringify(post))}
            addToast={addToast}
          />
        );
      case 'fb-post-edit':
        if (!editFacebookPost) {
          setActiveTab('fb-posts');
          return null;
        }
        return (
          <FacebookPostEditorPage
            post={editFacebookPost}
            onNavigateBack={() => {
              setEditFacebookPost(null);
              setActiveTab('fb-posts');
            }}
            addToast={addToast}
          />
        );
      case 'fb-pages':
        return <FacebookPagesPage addToast={addToast} />;
      case 'fb-schedule':
        return (
          <FacebookSchedulePage
            onNavigateToEditor={(post) => handleNavigate('fb-post-edit', JSON.stringify(post))}
            addToast={addToast}
          />
        );
      case 'fb-logs':
        return <FacebookLogsPage addToast={addToast} />;
      case 'multi-channel':
        return <PlaceholderPage type="multi-channel" />;
      case 'inventory-sync':
        return <PlaceholderPage type="inventory-sync" />;
      case 'settings':
        return (
          <SettingsPage
            onResetDatabase={handleResetDatabase}
            lowStockThreshold={lowStockThreshold}
            setLowStockThreshold={setLowStockThreshold}
            addToast={addToast}
            onNavigateToPendingList={() => handleNavigate('pending-products')}
          />
        );
      default:
        return (
          <div className="py-20 text-center text-slate-400">
            Trang không tìm thấy hoặc đang xây dựng.
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col font-sans text-slate-800 antialiased selection:bg-blue-500/10 selection:text-blue-900">
      
      {/* 1. TOP HEADER BAR */}
      <header className="sticky top-0 z-40 bg-slate-900 text-white shadow border-b border-slate-800 h-16 shrink-0 flex items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-3">
          {/* Mobile hamburger button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-1.5 hover:bg-slate-800 rounded-lg transition-colors focus:outline-none"
            title="Mở bảng điều hướng"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>

          {/* Logo Voltara */}
          <div className="flex items-center gap-2 cursor-pointer select-none" onClick={() => handleNavigate('overview')}>
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center font-black text-lg tracking-wider text-white shadow-md border border-blue-500/30">
              <Bolt className="w-5 h-5 fill-current text-white animate-pulse" />
            </div>
            <div>
              <h1 className="font-extrabold text-sm md:text-base tracking-widest text-white leading-none uppercase">
                VOLTARA
              </h1>
              <span className="text-[10px] text-blue-400 font-bold uppercase tracking-wider block mt-0.5">
                PRODUCT HUB
              </span>
            </div>
          </div>
        </div>

        {/* Clock & Status Header Indicators */}
        <div className="flex items-center gap-4 text-xs">
          {/* Live Dynamic Clock */}
          <div className="hidden sm:flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-xl text-slate-300 font-medium border border-slate-700/60 shadow-inner">
            <Clock className="w-3.5 h-3.5 text-blue-400" />
            <span>{currentTime}</span>
          </div>

          {/* Status Indicator */}
          <div className="flex items-center gap-1.5 bg-slate-800/55 px-3 py-1.5 rounded-xl border border-slate-700/40 text-[10px] uppercase font-bold tracking-wider text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping shrink-0" />
            <span>MÁY CHỦ SẴN SÀNG</span>
          </div>
        </div>
      </header>

      {/* 2. BODY FRAME */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* SIDEBAR FOR DESKTOP */}
        <aside className="hidden md:block w-64 bg-white border-r border-slate-200/60 shrink-0 overflow-y-auto">
          <div className="p-4 space-y-1.5 border-b border-slate-100">
            <div className="text-[10px] uppercase tracking-widest font-extrabold text-slate-400 px-3 py-2">
              BẢNG ĐIỀU KHIỂN
            </div>
            <nav className="space-y-1">
              {menuItems.map((item) => {
                const isActive = activeTab === item.id || (item.id === 'add-product' && editProductId !== null);
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavigate(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/10'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="p-4 space-y-1.5">
            <div className="text-[10px] uppercase tracking-widest font-extrabold text-blue-600 px-3 py-2 flex items-center gap-1.5 font-sans">
              <Facebook className="w-4 h-4 fill-current" />
              <span>FACEBOOK MARKETING</span>
            </div>
            <nav className="space-y-1">
              {facebookMenuItems.map((item) => {
                const isActive = activeTab === item.id || (item.id === 'fb-posts' && activeTab === 'fb-post-edit');
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavigate(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/10'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Quick info panel inside sidebar */}
          <div className="mt-8 mx-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2.5">
            <div className="flex items-center gap-2 text-slate-800 font-bold text-xs">
              <Activity className="w-4 h-4 text-blue-600" />
              <span>Hệ sinh thái pin 21V</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed font-normal">
              Chuẩn chân pin Voltara 21V đồng nhất cho mọi thiết bị máy khoan, máy siết, mài góc và cưa đĩa cầm tay.
            </p>
          </div>
        </aside>

        {/* SIDEBAR DRAWER FOR MOBILE */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex">
            {/* Mobile Backdrop */}
            <div
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm"
            />

            {/* Mobile drawer panel */}
            <div className="relative w-72 bg-white max-h-full h-full shadow-2xl border-r border-slate-100 overflow-y-auto flex flex-col justify-between py-6 z-10 animate-slide-right">
              <div className="space-y-6">
                {/* Logo top mobile drawer */}
                <div className="px-6 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-extrabold text-white">
                      <Bolt className="w-4.5 h-4.5 text-white" />
                    </div>
                    <span className="font-extrabold text-slate-900 text-sm tracking-wider uppercase">VOLTARA HUB</span>
                  </div>
                  <button
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="p-1.5 hover:bg-slate-50 text-slate-400 hover:text-slate-700 rounded-lg transition-colors border border-slate-100"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Mobile menu navigation list */}
                <div className="px-3 space-y-1 border-b border-slate-100 pb-4">
                  {menuItems.map((item) => {
                    const isActive = activeTab === item.id || (item.id === 'add-product' && editProductId !== null);
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleNavigate(item.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                          isActive
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'text-slate-600 hover:text-slate-950 hover:bg-slate-50'
                        }`}
                      >
                        {item.icon}
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="px-3 py-2 space-y-1">
                  <div className="text-[10px] uppercase tracking-widest font-extrabold text-blue-600 px-4 py-2 flex items-center gap-1.5">
                    <Facebook className="w-4 h-4 fill-current" />
                    <span>Facebook Marketing</span>
                  </div>
                  {facebookMenuItems.map((item) => {
                    const isActive = activeTab === item.id || (item.id === 'fb-posts' && activeTab === 'fb-post-edit');
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleNavigate(item.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                          isActive
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'text-slate-600 hover:text-slate-950 hover:bg-slate-50'
                        }`}
                      >
                        {item.icon}
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Mobile drawer footer time representation */}
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 space-y-2 text-xs">
                <span className="text-slate-400 block font-semibold uppercase tracking-wider text-[10px]">Thời gian hiển thị</span>
                <span className="text-slate-700 font-medium block">{currentTime}</span>
              </div>
            </div>
          </div>
        )}

        {/* 3. CORE PAGE WRAPPER / WORKSPACE */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {renderActivePage()}
          </div>
        </main>
      </div>

      {/* --- GLOBAL COMPONENTS --- */}
      {/* Toast notifications */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {/* Confirm deletion or system modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={closeConfirmModal}
        type={confirmModal.type}
      />
    </div>
  );
}

