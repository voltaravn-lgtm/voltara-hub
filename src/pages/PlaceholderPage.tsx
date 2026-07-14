import React from 'react';
import { 
  CloudLightning, RefreshCw, ShoppingBag, Store, Sparkles, 
  ArrowUpRight, AlertCircle, ArrowLeftRight, Check, Zap, Layers3
} from 'lucide-react';

interface PlaceholderPageProps {
  type: 'multi-channel' | 'inventory-sync';
}

export const PlaceholderPage: React.FC<PlaceholderPageProps> = ({ type }) => {
  const isMultiChannel = type === 'multi-channel';

  const channels = [
    {
      name: 'Shopee Việt Nam',
      logo: '🍊',
      color: 'border-orange-500 bg-orange-50 text-orange-700 hover:bg-orange-100/50',
      status: 'Sẵn sàng kết nối',
      description: 'Đồng bộ danh mục hàng loạt, đăng tải sản phẩm trực tiếp từ Voltara Hub lên Shopee Mall.',
    },
    {
      name: 'TikTok Shop',
      logo: '🎵',
      color: 'border-slate-900 bg-slate-50 text-slate-900 hover:bg-slate-100/50',
      status: 'Sẵn sàng kết nối',
      description: 'Cập nhật nhanh mô tả sản phẩm, hình ảnh và quản lý tồn kho trực tiếp qua hệ thống TikTok Shop API.',
    },
    {
      name: 'Lazada Việt Nam',
      logo: '💜',
      color: 'border-indigo-600 bg-indigo-50 text-indigo-700 hover:bg-indigo-100/50',
      status: 'Sẵn sàng kết nối',
      description: 'Lấy dữ liệu tồn kho trung tâm để tự động điều chỉnh số lượng tồn kho trên Lazada Seller Center.',
    }
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-fade-in pb-12">
      {/* Title block */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          {isMultiChannel ? 'Đăng sản phẩm đa sàn' : 'Đồng bộ tồn kho tự động'}
        </h1>
        <p className="text-sm text-slate-500">
          {isMultiChannel 
            ? 'Đưa thông số sản phẩm và hình ảnh Voltara lên các sàn thương mại điện tử lớn chỉ trong 1 cú click.'
            : 'Đồng bộ hóa tồn kho thời gian thực để ngăn chặn việc lệch kho, hủy đơn do hết hàng.'}
        </p>
      </div>

      {/* Feature notice banner */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-8 rounded-2xl shadow-md relative overflow-hidden">
        {/* Abstract background shapes */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full translate-x-1/3 -translate-y-1/3 pointer-events-none" />
        <div className="absolute -bottom-8 -left-8 w-48 h-48 bg-black/5 rounded-full pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/20 text-white border border-white/10">
              <Zap className="w-3 h-3 fill-current" />
              Giai đoạn tiếp theo
            </span>
            <h2 className="text-xl md:text-2xl font-bold tracking-tight">
              Tính năng đang được chuẩn bị hạ tầng
            </h2>
            <p className="text-sm text-blue-100 font-normal leading-relaxed">
              Voltara Product Hub đã thiết lập đầy đủ cấu trúc dữ liệu cho SKU, thông số, và tồn kho. API kết nối trung tâm đang được cấu hình đồng bộ ở giai đoạn tiếp theo.
            </p>
          </div>
          <div className="shrink-0 bg-white/10 border border-white/20 p-5 rounded-xl text-center md:max-w-xs">
            <AlertCircle className="w-8 h-8 text-amber-300 mx-auto mb-2" />
            <p className="text-xs font-bold uppercase tracking-wider text-amber-200">Thông báo</p>
            <p className="text-sm font-semibold mt-1">Tính năng sẽ được phát triển ở giai đoạn tiếp theo.</p>
          </div>
        </div>
      </div>

      {/* Interactive visual mockup */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            {isMultiChannel ? <Layers3 className="w-5 h-5 text-blue-600" /> : <ArrowLeftRight className="w-5 h-5 text-blue-600" />}
            Mô phỏng kênh liên kết kế tiếp
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Dưới đây là thiết kế các kênh sàn thương mại điện tử sẽ hỗ trợ đồng bộ trực tiếp.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {channels.map((channel, idx) => (
            <div 
              key={idx} 
              className="border border-slate-150 p-5 rounded-xl hover:border-slate-300 hover:shadow-sm transition-all flex flex-col justify-between space-y-4 cursor-not-allowed group opacity-85 hover:opacity-100"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-3xl">{channel.logo}</span>
                  <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold uppercase">
                    {channel.status}
                  </span>
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-slate-900 text-sm group-hover:text-blue-600 transition-colors">{channel.name}</h4>
                  <p className="text-slate-500 text-xs leading-relaxed">{channel.description}</p>
                </div>
              </div>
              <button 
                disabled 
                className="w-full py-2 bg-slate-100 text-slate-400 rounded-lg text-xs font-bold border border-slate-200 cursor-not-allowed uppercase tracking-wider"
              >
                Cấu hình API
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Workflow checklist mockup */}
      <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6">
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">Quy trình vận hành tương lai</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-slate-600">
          <div className="flex gap-2.5 items-start">
            <div className="w-5 h-5 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-bold shrink-0">1</div>
            <div>
              <h5 className="font-bold text-slate-800">Thêm sản phẩm tại Hub</h5>
              <p className="mt-0.5 leading-relaxed text-slate-500">Tạo mới, điền hình ảnh và thông số chuẩn hóa tại Voltara Hub.</p>
            </div>
          </div>
          <div className="flex gap-2.5 items-start">
            <div className="w-5 h-5 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-bold shrink-0">2</div>
            <div>
              <h5 className="font-bold text-slate-800">Chọn sàn cần đẩy</h5>
              <p className="mt-0.5 leading-relaxed text-slate-500">Tích chọn Shopee, TikTok Shop hoặc Lazada để hệ thống tự mapping dữ liệu.</p>
            </div>
          </div>
          <div className="flex gap-2.5 items-start">
            <div className="w-5 h-5 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-bold shrink-0">3</div>
            <div>
              <h5 className="font-bold text-slate-800">Đồng bộ tự động</h5>
              <p className="mt-0.5 leading-relaxed text-slate-500">Khi có đơn hàng, số lượng tồn kho tự động trừ đều trên tất cả các sàn liên kết.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
