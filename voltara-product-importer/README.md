# Voltara Product Importer — Chrome Extension

Tiện ích mở rộng chính thức dành cho trình duyệt Chrome và Cốc Cốc, giúp bạn nhanh chóng thu thập thông tin sản phẩm từ Shopee Việt Nam và gửi về hệ thống quản lý kho hàng **Voltara Product Hub** chỉ bằng một cú nhấp chuột.

---

## 🚀 Hướng Dẫn Cài Đặt (Tải Tiện Ích Đã Giải Nén)

Để cài đặt và sử dụng tiện ích trên máy tính của bạn, vui lòng làm theo các bước dưới đây:

### Bước 1: Tải thư mục tiện ích về máy
Hãy tải hoặc xuất toàn bộ thư mục `voltara-product-importer` này về máy tính cá nhân của bạn và giải nén (nếu ở dạng tập tin nén .zip).

### Bước 2: Truy cập trang Quản lý tiện ích mở rộng
Mở trình duyệt web của bạn và truy cập đường dẫn sau:
- **Google Chrome**: Nhập `chrome://extensions` vào thanh địa chỉ và nhấn **Enter**.
- **Cốc Cốc**: Nhập `coccoc://extensions` vào thanh địa chỉ và nhấn **Enter**.

### Bước 3: Kích hoạt Chế độ nhà phát triển (Developer Mode)
Tại góc trên cùng bên phải của trang quản lý tiện ích, tìm công tắc **Chế độ dành cho nhà phát triển** (Developer mode) và gạt sang trạng thái **BẬT** (màu xanh).

### Bước 4: Tải tiện ích lên trình duyệt
Sau khi bật chế độ nhà phát triển, một hàng menu mới sẽ xuất hiện ở bên trái. Nhấp vào nút:
👉 **Tải tiện ích đã giải nén** *(Load unpacked)*

### Bước 5: Chọn thư mục tiện ích
Chọn thư mục có tên `voltara-product-importer` (thư mục chứa tệp tin `manifest.json` này) từ máy tính của bạn và nhấp **Select Folder** (Chọn thư mục).

### Bước 6: Ghim tiện ích lên thanh trình duyệt
- Nhấp vào biểu tượng mảnh ghép (Tiện ích/Extensions) ở góc trên bên phải thanh công cụ trình duyệt.
- Tìm tiện ích **Voltara Product Importer** và nhấn vào nút **Ghim** (Pin) để biểu tượng màu xanh của Voltara luôn hiển thị trên thanh trình duyệt.

---

## ⚙️ Cấu Hình Kết Nối Đến Voltara Hub

Để có thể gửi sản phẩm về ứng dụng Voltara Product Hub, bạn cần kết nối tiện ích này với tài khoản Hub của mình:

### Bước 7: Mở trang cài đặt của tiện ích
- Nhấp chuột phải vào biểu tượng Voltara trên thanh trình duyệt và chọn **Tùy chọn** *(Options)*.
- Hoặc nhấp vào biểu tượng tiện ích, chọn liên kết **CÀI ĐẶT KẾT NỐI** ở chân trang popup.

### Bước 8: Nhập địa chỉ và mã kết nối
1. **Địa chỉ Voltara Product Hub (URL)**: Nhập địa chỉ trang web Voltara của bạn (ví dụ: `https://voltara-hub.run.app` hoặc `http://localhost:3000`).
2. **Mã kết nối (Connection Token)**: Đi tới mục **Cài đặt hệ thống > Tiện ích Chrome** trên giao diện Voltara Product Hub của bạn, kích hoạt kết nối và sao chép mã token dạng `vol_tok_...` hoặc mã kết nối được cung cấp để dán vào.
3. Bấm **LƯU CẤU HÌNH**.
4. Bấm **KIỂM TRA KẾT NỐI** để xác thực liên kết. Khi bảng trạng thái chuyển sang màu xanh **Đã kết nối**, bạn đã sẵn sàng sử dụng!

---

## 🎯 Hướng Dẫn Sử Dụng Thu Thập Sản Phẩm

1. Mở bất kỳ trang chi tiết sản phẩm nào trên **Shopee Việt Nam** (ví dụ: `https://shopee.vn/Ten-San-Pham-i.123.456`).
2. Nhấp vào biểu tượng **Voltara Product Importer** trên thanh tiện ích.
3. Tiện ích sẽ tự động nhận dạng trang và hiển thị trạng thái **Đã nhận diện Shopee**.
4. Bấm **XEM TRƯỚC** để xem trước toàn bộ dữ liệu (tên, hình ảnh, giá gốc, giá bán, các phân loại biến thể, mô tả chi tiết, thông tin nhà bán hàng) đã thu thập được từ trang mà không cần gửi ngay.
5. Bấm **GỬI VỀ VOLTARA HUB** để đẩy dữ liệu sản phẩm trực tiếp về danh sách chờ duyệt trên Voltara Product Hub của bạn.
6. Mở **Voltara Product Hub > Sản phẩm chờ nhập** để kiểm duyệt, chỉnh sửa nâng cao (gán số lượng, danh mục) và bấm **Nhập vào kho** chính thức!

---

## 🔒 Cam Kết Bảo Mật & Nguyên Tắc Hoạt Động

- **Không tự động gửi dữ liệu**: Tiện ích chỉ lấy và gửi dữ liệu khi có sự kích hoạt chủ động của người dùng (bấm nút gửi).
- **Không can thiệp tài khoản**: Hoàn toàn không tự động cuộn trang, tự động click mua hàng, hay can thiệp vào tài khoản Shopee cá nhân của bạn.
- **An toàn bảo mật**: Mọi token kết nối được mã hóa và lưu trữ cục bộ trên máy tính của bạn thông qua `chrome.storage.local`.
