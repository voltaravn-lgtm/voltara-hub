import React, { useState, useEffect } from 'react';
import { Product, Category, ProductSpec, ProductStatus } from '../types';
import { 
  Plus, Trash2, ArrowLeft, Image as ImageIcon, CheckCircle2, 
  HelpCircle, Sparkles, Check, X, Star, FileText, Settings, BadgePercent
} from 'lucide-react';

interface ProductFormPageProps {
  editProductId: string | null;
  duplicateProductData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'> | null;
  importedProductData?: Omit<Product, 'id' | 'createdAt' | 'updatedAt'> | null;
  categories: Category[];
  onSave: (product: Product) => void;
  onCancel: () => void;
  products: Product[]; // Để kiểm tra trùng SKU
}

export const ProductFormPage: React.FC<ProductFormPageProps> = ({
  editProductId,
  duplicateProductData,
  importedProductData,
  categories,
  onSave,
  onCancel,
  products,
}) => {
  const isEditMode = !!editProductId;

  // --- STATE KHỞI TẠO FORM ---
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [brand, setBrand] = useState('Voltara');
  const [category, setCategory] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [description, setDescription] = useState('');

  const [costPrice, setCostPrice] = useState<number>(0);
  const [price, setPrice] = useState<number>(0);
  const [promoPriceInput, setPromoPriceInput] = useState<string>(''); // Quản lý dạng text để dễ xóa
  const [stock, setStock] = useState<number>(0);

  const [specs, setSpecs] = useState<ProductSpec[]>([
    { name: 'Điện áp', value: '21V' },
    { name: 'Động cơ', value: 'Không chổi than (Brushless)' }
  ]);

  const [imageUrlInput, setImageUrlInput] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [mainImage, setMainImage] = useState('');

  const [status, setStatus] = useState<ProductStatus>('active');
  const [weight, setWeight] = useState<number>(500);

  // Quản lý lỗi validation
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // --- LOAD DỮ LIỆU CŨ KHI EDIT HOẶC DUPLICATE ---
  useEffect(() => {
    if (isEditMode) {
      // Tìm sản phẩm cần chỉnh sửa
      const currentProduct = products.find((p) => p.id === editProductId);
      if (currentProduct) {
        setName(currentProduct.name);
        setSku(currentProduct.sku);
        setBrand(currentProduct.brand || 'Voltara');
        setCategory(currentProduct.category);
        setShortDescription(currentProduct.shortDescription || '');
        setDescription(currentProduct.description || '');
        setCostPrice(currentProduct.costPrice);
        setPrice(currentProduct.price);
        setPromoPriceInput(currentProduct.promoPrice ? currentProduct.promoPrice.toString() : '');
        setStock(currentProduct.stock);
        setSpecs(currentProduct.specs ? [...currentProduct.specs] : []);
        setImages(currentProduct.images ? [...currentProduct.images] : []);
        setMainImage(currentProduct.mainImage || '');
        setStatus(currentProduct.status);
        setWeight(currentProduct.weight !== undefined ? currentProduct.weight : 500);
      }
    } else if (duplicateProductData) {
      // Điền dữ liệu từ bản sao nhân bản
      setName(duplicateProductData.name);
      setSku(duplicateProductData.sku);
      setBrand(duplicateProductData.brand || 'Voltara');
      setCategory(duplicateProductData.category);
      setShortDescription(duplicateProductData.shortDescription || '');
      setDescription(duplicateProductData.description || '');
      setCostPrice(duplicateProductData.costPrice);
      setPrice(duplicateProductData.price);
      setPromoPriceInput(duplicateProductData.promoPrice ? duplicateProductData.promoPrice.toString() : '');
      setStock(duplicateProductData.stock);
      setSpecs(duplicateProductData.specs ? [...duplicateProductData.specs] : []);
      setImages(duplicateProductData.images ? [...duplicateProductData.images] : []);
      setMainImage(duplicateProductData.mainImage || '');
      setStatus(duplicateProductData.status);
      setWeight(duplicateProductData.weight !== undefined ? duplicateProductData.weight : 500);
    } else if (importedProductData) {
      // Điền dữ liệu lấy từ Chrome Extension
      setName(importedProductData.name);
      setSku(importedProductData.sku);
      setBrand(importedProductData.brand || 'Voltara');
      setCategory(importedProductData.category);
      setShortDescription(importedProductData.shortDescription || '');
      setDescription(importedProductData.description || '');
      setCostPrice(importedProductData.costPrice);
      setPrice(importedProductData.price);
      setPromoPriceInput(importedProductData.promoPrice ? importedProductData.promoPrice.toString() : '');
      setStock(importedProductData.stock);
      setSpecs(importedProductData.specs ? [...importedProductData.specs] : []);
      setImages(importedProductData.images ? [...importedProductData.images] : []);
      setMainImage(importedProductData.mainImage || '');
      setStatus(importedProductData.status);
      setWeight(importedProductData.weight !== undefined ? importedProductData.weight : 500);
    } else {
      // Reset form khi thêm mới hoàn toàn
      setName('');
      setSku('');
      setBrand('Voltara');
      setCategory(categories[0]?.name || '');
      setShortDescription('');
      setDescription('');
      setCostPrice(0);
      setPrice(0);
      setPromoPriceInput('');
      setStock(0);
      setSpecs([
        { name: 'Điện áp', value: '21V' },
        { name: 'Động cơ', value: 'Không chổi than (Brushless)' }
      ]);
      setImages([
        'https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&q=80&w=600'
      ]);
      setMainImage('https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&q=80&w=600');
      setStatus('active');
      setWeight(500);
    }
  }, [editProductId, duplicateProductData, importedProductData, isEditMode, products, categories]);

  // --- QUẢN LÝ THÔNG SỐ KỸ THUẬT (SPECS) ---
  const handleAddSpecRow = () => {
    setSpecs([...specs, { name: '', value: '' }]);
  };

  const handleRemoveSpecRow = (index: number) => {
    setSpecs(specs.filter((_, i) => i !== index));
  };

  const handleSpecChange = (index: number, field: 'name' | 'value', val: string) => {
    const updated = [...specs];
    updated[index][field] = val;
    setSpecs(updated);
  };

  // --- QUẢN LÝ ẢNH ---
  const handleAddImageUrl = () => {
    if (!imageUrlInput.trim()) return;
    
    // Kiểm tra URL hợp lệ cơ bản
    if (!imageUrlInput.startsWith('http://') && !imageUrlInput.startsWith('https://')) {
      setErrors(prev => ({ ...prev, imageUrl: 'URL ảnh phải bắt đầu bằng http:// hoặc https://' }));
      return;
    }

    const updatedImages = [...images, imageUrlInput.trim()];
    setImages(updatedImages);
    
    // Nếu chưa có ảnh đại diện nào, lấy luôn ảnh này làm đại diện
    if (!mainImage || !images.includes(mainImage)) {
      setMainImage(imageUrlInput.trim());
    }

    setImageUrlInput('');
    setErrors(prev => {
      const copy = { ...prev };
      delete copy.imageUrl;
      return copy;
    });
  };

  const handleRemoveImage = (urlToRemove: string) => {
    const updatedImages = images.filter((img) => img !== urlToRemove);
    setImages(updatedImages);

    // Nếu ảnh bị xóa đang là ảnh đại diện, chọn ảnh khác thay thế
    if (mainImage === urlToRemove) {
      setMainImage(updatedImages[0] || '');
    }
  };

  // --- VALIDATION & SUBMIT ---
  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!name.trim()) {
      newErrors.name = 'Tên sản phẩm không được bỏ trống.';
    }

    if (!sku.trim()) {
      newErrors.sku = 'Mã SKU không được bỏ trống.';
    } else {
      // Kiểm tra định dạng SKU (không khoảng trắng)
      if (/\s/.test(sku)) {
        newErrors.sku = 'Mã SKU không được chứa khoảng trắng.';
      }

      // Kiểm tra trùng mã SKU trong hệ thống
      const isSkuDuplicate = products.some(
        (p) => p.sku.toLowerCase() === sku.trim().toLowerCase() && p.id !== editProductId
      );
      if (isSkuDuplicate) {
        newErrors.sku = `Mã SKU "${sku}" đã tồn tại trong hệ thống.`;
      }
    }

    if (!category) {
      newErrors.category = 'Vui lòng chọn một danh mục sản phẩm.';
    }

    if (costPrice < 0) {
      newErrors.costPrice = 'Giá vốn không được âm.';
    }

    if (price <= 0) {
      newErrors.price = 'Giá bán phải lớn hơn 0.';
    }

    const promoPrice = promoPriceInput.trim() !== '' ? Number(promoPriceInput) : null;
    if (promoPrice !== null) {
      if (isNaN(promoPrice)) {
        newErrors.promoPrice = 'Giá khuyến mãi phải là số hợp lệ.';
      } else if (promoPrice < 0) {
        newErrors.promoPrice = 'Giá khuyến mãi không được âm.';
      } else if (promoPrice >= price) {
        newErrors.promoPrice = 'Giá khuyến mãi phải thấp hơn giá bán chính thức.';
      }
    }

    if (stock < 0) {
      newErrors.stock = 'Số lượng tồn kho không được âm.';
    }

    if (weight <= 0) {
      newErrors.weight = 'Cân nặng sản phẩm phải lớn hơn 0.';
    }

    if (images.length === 0) {
      newErrors.images = 'Cần thêm ít nhất một hình ảnh cho sản phẩm.';
    } else if (!mainImage || !images.includes(mainImage)) {
      newErrors.mainImage = 'Vui lòng chọn một hình ảnh làm ảnh đại diện.';
    }

    // Kiểm tra các dòng thông số kỹ thuật trống
    const hasEmptySpec = specs.some(s => !s.name.trim() || !s.value.trim());
    if (hasEmptySpec) {
      newErrors.specs = 'Vui lòng điền đầy đủ cả tên và giá trị thông số hoặc xóa dòng trống.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      // Cuộn lên đầu trang hoặc hiển thị thông báo lỗi
      const firstError = Object.keys(errors)[0];
      const el = document.getElementById(`form-group-${firstError}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    // Chuẩn hóa dữ liệu khuyến mãi
    const finalPromoPrice = promoPriceInput.trim() !== '' ? Number(promoPriceInput) : null;

    // Lọc bỏ thông số trống trước khi lưu
    const cleanSpecs = specs.filter(s => s.name.trim() && s.value.trim());

    const productPayload: Product = {
      id: editProductId || Math.random().toString(36).substr(2, 9),
      name: name.trim(),
      sku: sku.trim().toUpperCase(),
      brand: brand.trim() || 'Voltara',
      category: category,
      shortDescription: shortDescription.trim(),
      description: description.trim(),
      costPrice: Number(costPrice),
      price: Number(price),
      promoPrice: finalPromoPrice,
      stock: Number(stock),
      specs: cleanSpecs,
      images: images,
      mainImage: mainImage || images[0],
      status: status,
      weight: Number(weight),
      createdAt: isEditMode ? '' : new Date().toISOString(), // Sẽ do service quyết định nếu có sẵn
      updatedAt: new Date().toISOString()
    };

    onSave(productPayload);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-fade-in pb-12">
      {/* Back button & title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onCancel}
          className="p-2 bg-white border border-slate-200 text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-50 transition-all shadow-sm shrink-0"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
            {isEditMode ? 'Chỉnh sửa sản phẩm Voltara' : duplicateProductData ? 'Nhân bản sản phẩm' : 'Thêm sản phẩm mới'}
          </h1>
          <p className="text-xs md:text-sm text-slate-500">
            {isEditMode ? 'Cập nhật các thông số, giá bán và cấu hình tồn kho.' : 'Điền đầy đủ thông số kỹ thuật để đăng sản phẩm lên kho trung tâm.'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Row 1: Left (Thông tin cơ bản) & Right (Giá, Tồn, Trạng thái) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Cột chính (2/3 width) */}
          <div className="lg:col-span-2 space-y-6">
            {/* 1. Thông tin cơ bản card */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 pb-2 border-b border-slate-100">
                <FileText className="w-4 h-4 text-blue-600" />
                Thông tin cơ bản
              </h2>

              {/* Tên sản phẩm */}
              <div id="form-group-name" className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">Tên sản phẩm *</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Máy siết bu lông Voltara 21V VT-IW1000"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={`w-full px-4 py-2.5 text-sm rounded-xl border ${
                    errors.name ? 'border-rose-500 bg-rose-50/10 focus:border-rose-500' : 'border-slate-200 focus:border-blue-500'
                  } focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all font-medium text-slate-800`}
                />
                {errors.name && <p className="text-xs text-rose-500 font-semibold">{errors.name}</p>}
              </div>

              {/* Row: SKU + Brand + Category */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* SKU */}
                <div id="form-group-sku" className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Mã SKU sản phẩm *</label>
                  <input
                    type="text"
                    placeholder="Ví dụ: VT-IW1000"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    className={`w-full px-4 py-2.5 text-sm rounded-xl border ${
                      errors.sku ? 'border-rose-500 bg-rose-50/10 focus:border-rose-500' : 'border-slate-200 focus:border-blue-500'
                    } focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all font-mono font-bold uppercase text-slate-800`}
                  />
                  {errors.sku && <p className="text-xs text-rose-500 font-semibold">{errors.sku}</p>}
                </div>

                {/* Thương hiệu */}
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Thương hiệu</label>
                  <input
                    type="text"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 focus:border-blue-500 focus:outline-none transition-all text-slate-800 font-medium"
                  />
                </div>
              </div>

              {/* Danh mục */}
              <div id="form-group-category" className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">Danh mục chính *</label>
                <div className="relative">
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className={`w-full pl-4 pr-10 py-2.5 text-sm rounded-xl border ${
                      errors.category ? 'border-rose-500 focus:border-rose-500' : 'border-slate-200 focus:border-blue-500'
                    } focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all appearance-none cursor-pointer text-slate-800 font-medium`}
                  >
                    <option value="">-- Chọn danh mục sản phẩm --</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.name}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                  <Plus className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400 pointer-events-none" />
                </div>
                {errors.category && <p className="text-xs text-rose-500 font-semibold">{errors.category}</p>}
              </div>

              {/* Mô tả ngắn */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">Mô tả ngắn (Hiển thị nhanh)</label>
                <input
                  type="text"
                  placeholder="Mô tả nhanh nổi bật dòng sản phẩm, ví dụ: Lực siết cực đại 1000Nm dùng động cơ không chổi than..."
                  value={shortDescription}
                  onChange={(e) => setShortDescription(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all text-slate-800"
                />
              </div>

              {/* Mô tả chi tiết */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">Mô tả chi tiết sản phẩm</label>
                <textarea
                  placeholder="Viết hướng dẫn sử dụng, ưu điểm nổi bật, ứng dụng thực tế và chế độ bảo hành của thiết bị..."
                  rows={6}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-3 text-sm rounded-xl border border-slate-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all text-slate-800"
                />
              </div>
            </div>

            {/* 2. Cấu hình hình ảnh card */}
            <div id="form-group-images" className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 pb-2 border-b border-slate-100">
                <ImageIcon className="w-4 h-4 text-blue-600" />
                Hình ảnh sản phẩm
              </h2>

              {/* Add image url */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Nhập liên kết hình ảnh (Image URL)</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Nhập liên kết bắt đầu bằng http:// hoặc https://..."
                    value={imageUrlInput}
                    onChange={(e) => setImageUrlInput(e.target.value)}
                    className={`flex-1 px-4 py-2 text-sm rounded-xl border ${
                      errors.imageUrl ? 'border-rose-400' : 'border-slate-200'
                    } focus:border-blue-500 focus:outline-none transition-all text-slate-800`}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddImageUrl())}
                  />
                  <button
                    type="button"
                    onClick={handleAddImageUrl}
                    className="px-4 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all"
                  >
                    Thêm ảnh
                  </button>
                </div>
                {errors.imageUrl && <p className="text-xs text-rose-500 font-semibold">{errors.imageUrl}</p>}
                {errors.images && <p className="text-xs text-rose-500 font-semibold">{errors.images}</p>}
                {errors.mainImage && <p className="text-xs text-rose-500 font-semibold">{errors.mainImage}</p>}
                <p className="text-slate-400 text-[11px]">
                  * Nhấp chuột vào biểu tượng <Star className="w-3.5 h-3.5 inline text-amber-500 fill-amber-500" /> trên góc ảnh để thiết lập ảnh đó làm ảnh đại diện chính thức.
                </p>
              </div>

              {/* Image Previews */}
              {images.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
                  {images.map((url, index) => {
                    const isMain = url === mainImage;
                    return (
                      <div 
                        key={index} 
                        className={`relative aspect-square border-2 rounded-xl overflow-hidden bg-slate-50 group hover:border-blue-300 transition-all ${
                          isMain ? 'border-amber-500 ring-2 ring-amber-500/10' : 'border-slate-100'
                        }`}
                      >
                        <img
                          src={url}
                          alt={`Preview ${index + 1}`}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                        {/* Star/Favorite badge for main image */}
                        <button
                          type="button"
                          onClick={() => setMainImage(url)}
                          className={`absolute top-2 left-2 p-1.5 rounded-lg transition-all ${
                            isMain 
                              ? 'bg-amber-500 text-white shadow' 
                              : 'bg-white/80 hover:bg-white text-slate-400 hover:text-amber-500 opacity-0 group-hover:opacity-100'
                          }`}
                          title={isMain ? 'Ảnh đại diện chính' : 'Đặt làm ảnh đại diện'}
                        >
                          <Star className={`w-3.5 h-3.5 ${isMain ? 'fill-current' : ''}`} />
                        </button>

                        {/* Trash Button */}
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(url)}
                          className="absolute top-2 right-2 p-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all shadow"
                          title="Xóa hình ảnh này"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="border border-dashed border-slate-200 py-10 rounded-xl text-center text-slate-400 text-sm">
                  <ImageIcon className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  Chưa có hình ảnh nào được thêm. Hãy nhập liên kết ảnh ở trên.
                </div>
              )}
            </div>
          </div>

          {/* Cột phụ bên phải (1/3 width) */}
          <div className="space-y-6">
            {/* 3. Giá & Tồn kho card */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 pb-2 border-b border-slate-100">
                <BadgePercent className="w-4 h-4 text-blue-600" />
                Giá & Tồn kho
              </h2>

              {/* Giá vốn nhập */}
              <div id="form-group-costPrice" className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">Giá vốn nhập (VND) *</label>
                <input
                  type="number"
                  min="0"
                  value={costPrice}
                  onChange={(e) => setCostPrice(Number(e.target.value))}
                  className={`w-full px-4 py-2 text-sm rounded-xl border ${
                    errors.costPrice ? 'border-rose-500 focus:border-rose-500' : 'border-slate-200 focus:border-blue-500'
                  } focus:outline-none transition-all font-semibold text-slate-800`}
                />
                {errors.costPrice && <p className="text-xs text-rose-500 font-semibold">{errors.costPrice}</p>}
              </div>

              {/* Giá bán niêm yết */}
              <div id="form-group-price" className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">Giá bán lẻ niêm yết (VND) *</label>
                <input
                  type="number"
                  min="0"
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value))}
                  className={`w-full px-4 py-2 text-sm rounded-xl border ${
                    errors.price ? 'border-rose-500 focus:border-rose-500' : 'border-slate-200 focus:border-blue-500'
                  } focus:outline-none transition-all font-bold text-blue-900`}
                />
                {errors.price && <p className="text-xs text-rose-500 font-semibold">{errors.price}</p>}
              </div>

              {/* Giá khuyến mãi */}
              <div id="form-group-promoPrice" className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700 flex items-center justify-between">
                  <span>Giá khuyến mãi (VND)</span>
                  <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-100 px-1.5 py-0.5 rounded-md font-medium">Bán sale</span>
                </label>
                <input
                  type="text"
                  placeholder="Bỏ trống nếu không sale"
                  value={promoPriceInput}
                  onChange={(e) => setPromoPriceInput(e.target.value)}
                  className={`w-full px-4 py-2 text-sm rounded-xl border ${
                    errors.promoPrice ? 'border-rose-500 focus:border-rose-500' : 'border-slate-200 focus:border-blue-500'
                  } focus:outline-none transition-all font-bold text-rose-700`}
                />
                {errors.promoPrice && <p className="text-xs text-rose-500 font-semibold">{errors.promoPrice}</p>}
              </div>

              {/* Số lượng tồn kho */}
              <div id="form-group-stock" className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">Số lượng tồn kho ban đầu *</label>
                <input
                  type="number"
                  min="0"
                  value={stock}
                  onChange={(e) => setStock(Number(e.target.value))}
                  className={`w-full px-4 py-2 text-sm rounded-xl border ${
                    errors.stock ? 'border-rose-500 focus:border-rose-500' : 'border-slate-200 focus:border-blue-500'
                  } focus:outline-none transition-all font-bold text-slate-800`}
                />
                {errors.stock && <p className="text-xs text-rose-500 font-semibold">{errors.stock}</p>}
              </div>

              {/* Cân nặng sản phẩm (Shopee) */}
              <div id="form-group-weight" className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700 flex items-center justify-between">
                  <span>Cân nặng sản phẩm (g) *</span>
                  <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-100 px-1.5 py-0.5 rounded-md font-medium">Cần cho Shopee</span>
                </label>
                <div className="flex gap-2 items-center">
                  <input
                    type="number"
                    min="1"
                    value={weight}
                    onChange={(e) => setWeight(Number(e.target.value))}
                    className={`w-full px-4 py-2 text-sm rounded-xl border ${
                      errors.weight ? 'border-rose-500 focus:border-rose-500' : 'border-slate-200 focus:border-blue-500'
                    } focus:outline-none transition-all font-bold text-slate-800`}
                  />
                  <span className="text-sm text-slate-500 font-semibold">g</span>
                </div>
                {errors.weight && <p className="text-xs text-rose-500 font-semibold">{errors.weight}</p>}
              </div>
            </div>

            {/* 4. Trạng thái kinh doanh card */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 pb-2 border-b border-slate-100">
                <Settings className="w-4 h-4 text-blue-600" />
                Trạng thái hiển thị
              </h2>

              <div className="space-y-2.5">
                {/* Active */}
                <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  status === 'active' 
                    ? 'border-emerald-500 bg-emerald-50/20 text-emerald-950 font-bold' 
                    : 'border-slate-150 hover:bg-slate-50'
                }`}>
                  <input
                    type="radio"
                    name="status"
                    checked={status === 'active'}
                    onChange={() => setStatus('active')}
                    className="text-emerald-600 focus:ring-emerald-500 cursor-pointer w-4 h-4 shrink-0"
                  />
                  <div className="min-w-0">
                    <span className="block text-sm">Đang hoạt động</span>
                    <span className="block text-[11px] text-slate-400 font-normal">Sản phẩm bán bình thường, hiển thị trên các sàn và danh sách.</span>
                  </div>
                </label>

                {/* Draft */}
                <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  status === 'draft' 
                    ? 'border-slate-600 bg-slate-50 text-slate-950 font-bold' 
                    : 'border-slate-150 hover:bg-slate-50'
                }`}>
                  <input
                    type="radio"
                    name="status"
                    checked={status === 'draft'}
                    onChange={() => setStatus('draft')}
                    className="text-slate-700 focus:ring-slate-500 cursor-pointer w-4 h-4 shrink-0"
                  />
                  <div className="min-w-0">
                    <span className="block text-sm">Bản nháp (Draft)</span>
                    <span className="block text-[11px] text-slate-400 font-normal">Lưu nháp để kiểm tra thông số kỹ thuật, chưa bán ngay.</span>
                  </div>
                </label>

                {/* Discontinued */}
                <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  status === 'discontinued' 
                    ? 'border-rose-500 bg-rose-50/10 text-rose-950 font-bold' 
                    : 'border-slate-150 hover:bg-slate-50'
                }`}>
                  <input
                    type="radio"
                    name="status"
                    checked={status === 'discontinued'}
                    onChange={() => setStatus('discontinued')}
                    className="text-rose-600 focus:ring-rose-500 cursor-pointer w-4 h-4 shrink-0"
                  />
                  <div className="min-w-0">
                    <span className="block text-sm">Ngừng bán</span>
                    <span className="block text-[11px] text-slate-400 font-normal">Ngừng kinh doanh vĩnh viễn, ẩn khỏi sàn bán hàng.</span>
                  </div>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* 5. Thông số kỹ thuật chuyên sâu (Bottom Full-width) */}
        <div id="form-group-specs" className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600" />
              Thông số kỹ thuật của thiết bị Voltara
            </h2>
            <button
              type="button"
              onClick={handleAddSpecRow}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-blue-600 hover:text-white border border-blue-600/30 hover:bg-blue-600 rounded-lg transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              Thêm thông số
            </button>
          </div>

          <p className="text-xs text-slate-400">
            Khai báo thông số giúp thợ kỹ thuật tra cứu dễ dàng. Ví dụ: Tên thông số: "Điện áp" — Giá trị: "21V".
          </p>

          {errors.specs && <p className="text-xs text-rose-500 font-semibold">{errors.specs}</p>}

          {specs.length > 0 ? (
            <div className="space-y-3">
              {specs.map((spec, index) => (
                <div key={index} className="flex items-center gap-3 animate-fade-in">
                  <div className="grid grid-cols-2 gap-3 flex-1">
                    <input
                      type="text"
                      placeholder="Tên thông số (ví dụ: Điện áp, Động cơ, Lực siết...)"
                      value={spec.name}
                      onChange={(e) => handleSpecChange(index, 'name', e.target.value)}
                      className="px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:border-blue-500 focus:outline-none transition-all text-slate-800 font-medium bg-slate-50/50"
                    />
                    <input
                      type="text"
                      placeholder="Giá trị thông số (ví dụ: 21V, Không chổi than, 1000 Nm...)"
                      value={spec.value}
                      onChange={(e) => handleSpecChange(index, 'value', e.target.value)}
                      className="px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:border-blue-500 focus:outline-none transition-all text-slate-800 font-bold"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveSpecRow(index)}
                    className="p-2.5 bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl transition-colors border border-slate-200/60 hover:border-rose-100"
                    title="Xóa dòng thông số này"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="border border-dashed border-slate-150 py-8 rounded-xl text-center text-slate-400 text-sm">
              Chưa có thông số kỹ thuật nào. Bấm nút "Thêm thông số" ở trên để thiết lập.
            </div>
          )}
        </div>

        {/* Action Bottom sticky buttons */}
        <div className="flex items-center justify-end gap-3 p-4 bg-slate-50 border border-slate-150 rounded-2xl shadow-sm">
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-250 rounded-xl hover:bg-slate-50 transition-colors"
          >
            Hủy bỏ
          </button>
          <button
            type="submit"
            className="px-6 py-2.5 text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            {isEditMode ? 'Cập nhật sản phẩm' : 'Lưu sản phẩm mới'}
          </button>
        </div>
      </form>
    </div>
  );
};
