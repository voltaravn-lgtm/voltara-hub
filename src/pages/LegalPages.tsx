import React from 'react';
import { Database, FileText, ShieldCheck, Trash2 } from 'lucide-react';

export type LegalPageKind = 'privacy' | 'terms' | 'data-deletion';

interface LegalPagesProps {
  kind: LegalPageKind;
}

const contactEmail = 'ngotanhuy100293@gmail.com';

const PrivacyContent = () => (
  <>
    <p>Chính sách này mô tả cách Voltara Page Publisher thu thập, sử dụng và bảo vệ dữ liệu khi bạn kết nối tài khoản Facebook và các Fanpage do bạn quản lý.</p>
    <h2>1. Dữ liệu chúng tôi xử lý</h2>
    <ul>
      <li>Thông tin cơ bản do Facebook cung cấp, như mã tài khoản cần thiết cho quá trình xác thực.</li>
      <li>Mã Fanpage, tên Fanpage, ảnh đại diện và các tác vụ quản trị được Facebook cấp.</li>
      <li>Page Access Token và User Access Token; token được mã hóa trước khi lưu trữ.</li>
      <li>Nội dung, ảnh hoặc video mà bạn chủ động tải lên để đăng bài.</li>
      <li>Nhật ký kỹ thuật liên quan đến kết quả đăng bài và lỗi hệ thống.</li>
    </ul>
    <h2>2. Mục đích sử dụng</h2>
    <p>Dữ liệu chỉ được dùng để kết nối Fanpage, đăng và quản lý nội dung theo thao tác của người dùng, hỗ trợ nhắn tin khi được bật, ghi nhận kết quả và bảo đảm an toàn hệ thống.</p>
    <h2>3. Chia sẻ dữ liệu</h2>
    <p>Chúng tôi không bán dữ liệu cá nhân. Dữ liệu chỉ được truyền tới Meta/Facebook để thực hiện chức năng người dùng yêu cầu, hoặc tới nhà cung cấp hạ tầng cần thiết để vận hành dịch vụ.</p>
    <h2>4. Lưu trữ và bảo mật</h2>
    <p>Thông tin kết nối được lưu trong cơ sở dữ liệu có kiểm soát truy cập. Token được mã hóa. Media tạm có thể được xóa sau khi đăng thành công hoặc khi hết thời hạn lưu giữ cần thiết.</p>
    <h2>5. Quyền của người dùng</h2>
    <p>Bạn có thể ngắt kết nối Fanpage, thu hồi quyền ứng dụng trong Facebook hoặc yêu cầu xóa dữ liệu theo <a href="/data-deletion">hướng dẫn xóa dữ liệu</a>.</p>
    <h2>6. Liên hệ</h2>
    <p>Nếu có câu hỏi về quyền riêng tư, vui lòng liên hệ <a href={`mailto:${contactEmail}`}>{contactEmail}</a>.</p>
  </>
);

const TermsContent = () => (
  <>
    <p>Khi sử dụng Voltara Page Publisher, bạn đồng ý với các điều khoản dưới đây.</p>
    <h2>1. Phạm vi dịch vụ</h2>
    <p>Dịch vụ hỗ trợ người dùng kết nối Fanpage, chuẩn bị, đăng và quản lý nội dung thông qua các API được Meta cung cấp.</p>
    <h2>2. Trách nhiệm của người dùng</h2>
    <ul>
      <li>Chỉ kết nối và quản lý các Fanpage mà bạn có quyền hợp pháp.</li>
      <li>Chịu trách nhiệm về nội dung, bản quyền, thông tin sản phẩm và mọi bài đăng được gửi từ tài khoản của mình.</li>
      <li>Không sử dụng dịch vụ để gửi spam, lừa đảo, xâm phạm quyền của người khác hoặc vi phạm chính sách của Meta.</li>
    </ul>
    <h2>3. Tính khả dụng</h2>
    <p>Dịch vụ phụ thuộc vào Facebook Graph API và các nhà cung cấp hạ tầng. Một số chức năng có thể tạm ngừng khi Meta thay đổi API, token hết hạn hoặc hệ thống bảo trì.</p>
    <h2>4. Giới hạn trách nhiệm</h2>
    <p>Người dùng cần kiểm tra nội dung và Fanpage đích trước khi xác nhận đăng. Chúng tôi không chịu trách nhiệm cho thiệt hại phát sinh từ nội dung do người dùng tạo hoặc việc sử dụng sai quyền truy cập.</p>
    <h2>5. Chấm dứt sử dụng</h2>
    <p>Bạn có thể ngừng sử dụng bất cứ lúc nào bằng cách ngắt kết nối Fanpage và gỡ ứng dụng khỏi phần Ứng dụng và trang web trong tài khoản Facebook.</p>
    <h2>6. Liên hệ</h2>
    <p>Mọi thắc mắc về điều khoản vui lòng gửi tới <a href={`mailto:${contactEmail}`}>{contactEmail}</a>.</p>
  </>
);

const DataDeletionContent = () => (
  <>
    <p>Bạn có thể yêu cầu xóa dữ liệu Facebook đã lưu trong Voltara Page Publisher bằng một trong các cách sau.</p>
    <h2>Cách 1: Ngắt kết nối trong Voltara</h2>
    <ol>
      <li>Mở Voltara Product Hub và chọn <strong>Fanpage đã kết nối</strong>.</li>
      <li>Nhấn <strong>Ngắt kết nối</strong> trên từng Fanpage.</li>
      <li>Hệ thống sẽ loại bỏ Page Access Token tương ứng khỏi kho lưu trữ.</li>
    </ol>
    <h2>Cách 2: Gỡ quyền trên Facebook</h2>
    <ol>
      <li>Mở Facebook → Cài đặt và quyền riêng tư → Cài đặt.</li>
      <li>Chọn Ứng dụng và trang web.</li>
      <li>Chọn Voltara Page Publisher và nhấn Gỡ.</li>
    </ol>
    <h2>Cách 3: Gửi yêu cầu trực tiếp</h2>
    <p>Gửi email tới <a href={`mailto:${contactEmail}?subject=Yêu cầu xóa dữ liệu Voltara Page Publisher`}>{contactEmail}</a> với tiêu đề “Yêu cầu xóa dữ liệu Voltara Page Publisher”. Vui lòng cung cấp tên tài khoản và mã Fanpage cần xóa để xác minh.</p>
    <p>Yêu cầu hợp lệ sẽ được xử lý trong tối đa 30 ngày. Dữ liệu phải giữ lại theo nghĩa vụ pháp lý hoặc phòng chống gian lận, nếu có, sẽ chỉ được lưu trong thời gian bắt buộc.</p>
  </>
);

const pageConfig = {
  privacy: {
    title: 'Chính sách quyền riêng tư',
    subtitle: 'Cách Voltara Page Publisher xử lý và bảo vệ dữ liệu',
    icon: ShieldCheck,
    content: PrivacyContent
  },
  terms: {
    title: 'Điều khoản dịch vụ',
    subtitle: 'Điều kiện sử dụng Voltara Page Publisher',
    icon: FileText,
    content: TermsContent
  },
  'data-deletion': {
    title: 'Hướng dẫn xóa dữ liệu',
    subtitle: 'Thu hồi quyền và yêu cầu xóa dữ liệu Facebook',
    icon: Trash2,
    content: DataDeletionContent
  }
} satisfies Record<LegalPageKind, {
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  content: React.ComponentType;
}>;

export const LegalPage: React.FC<LegalPagesProps> = ({ kind }) => {
  const config = pageConfig[kind];
  const Icon = config.icon;
  const Content = config.content;
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-slate-200 sm:px-6">
      <article className="mx-auto max-w-3xl overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl">
        <header className="border-b border-slate-800 bg-gradient-to-br from-blue-950 to-slate-900 p-6 sm:p-10">
          <a href="/" className="mb-8 inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.2em] text-blue-400">
            <Database className="h-4 w-4" /> Voltara Product Hub
          </a>
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-blue-600 p-3 text-white"><Icon className="h-7 w-7" /></div>
            <div>
              <h1 className="text-2xl font-black text-white sm:text-3xl">{config.title}</h1>
              <p className="mt-2 text-sm text-slate-400">{config.subtitle}</p>
            </div>
          </div>
        </header>
        <section className="legal-content space-y-5 p-6 text-sm leading-7 text-slate-300 sm:p-10">
          <Content />
          <p className="border-t border-slate-800 pt-6 text-xs text-slate-500">Có hiệu lực từ ngày 08/10/2026. Cập nhật lần cuối: 08/10/2026.</p>
        </section>
        <nav className="flex flex-wrap gap-x-5 gap-y-2 border-t border-slate-800 px-6 py-5 text-xs font-bold text-blue-400 sm:px-10">
          <a href="/privacy">Quyền riêng tư</a>
          <a href="/terms">Điều khoản</a>
          <a href="/data-deletion">Xóa dữ liệu</a>
        </nav>
      </article>
      <style>{`
        .legal-content h2 { margin-top: 1.5rem; color: white; font-size: 1rem; font-weight: 800; }
        .legal-content ul, .legal-content ol { padding-left: 1.25rem; }
        .legal-content ul { list-style: disc; }
        .legal-content ol { list-style: decimal; }
        .legal-content a { color: #60a5fa; text-decoration: underline; text-underline-offset: 3px; }
      `}</style>
    </main>
  );
};
