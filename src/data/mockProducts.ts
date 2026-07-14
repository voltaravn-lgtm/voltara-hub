import { Product, Category } from '../types';

export const mockCategories: Category[] = [
  {
    id: 'siet-bulong',
    name: 'Máy siết bu lông & bắt vít',
    slug: 'may-siet-bu-long-bat-vit',
    description: 'Dòng máy siết lực cao dùng pin Voltara 21V, lý tưởng cho sửa chữa xe máy, ô tô và thi công kết cấu.'
  },
  {
    id: 'may-khoan',
    name: 'Máy khoan & Máy búa',
    slug: 'may-khoan-may-bua',
    description: 'Các loại máy khoan pin 3 chức năng, máy khoan bê tông chuyên dụng lực đập lớn.'
  },
  {
    id: 'may-mai-cat',
    name: 'Máy mài & Máy cắt',
    slug: 'may-mai-may-cat',
    description: 'Máy mài góc và máy cắt sắt cầm tay dùng pin 21V không chổi than mạnh mẽ và an toàn.'
  },
  {
    id: 'may-cua',
    name: 'Máy cưa cầm tay',
    slug: 'may-cua-cam-tay',
    description: 'Máy cưa đĩa, máy cưa kiếm chuyên dụng cho gỗ, kim loại và nhựa.'
  },
  {
    id: 'thiet-bi-khac',
    name: 'Thiết bị dùng pin khác',
    slug: 'thiet-bi-dung-pin-khac',
    description: 'Quạt dùng pin, máy thổi bụi, súng bắn silicon và các dụng cụ tiện ích khác trong hệ sinh thái chân pin Voltara 21V.'
  }
];

export const mockProducts: Product[] = [
  {
    id: '1',
    name: 'Máy siết bu lông Voltara 21V VT-IW1000',
    sku: 'VT-IW1000',
    brand: 'Voltara',
    category: 'Máy siết bu lông & bắt vít',
    shortDescription: 'Máy siết lực khủng 1000Nm, động cơ không chổi than, chân pin phổ thông Voltara 21V.',
    description: 'Máy siết bu lông Voltara VT-IW1000 là dòng máy hạng nặng chuyên dùng để mở các loại ốc cỡ lớn, ốc bánh xe ô tô, xe tải nhỏ hoặc thi công nhà xưởng, kết cấu thép lớn. Máy được trang bị động cơ không chổi than (Brushless) hiệu suất cao, giúp máy chạy êm, tiết kiệm năng lượng và kéo dài tuổi thọ.\n\nSản phẩm sở hữu lực siết tối đa lên tới 1000Nm cực kỳ mạnh mẽ, giúp xử lý các loại bu lông rỉ sét cứng đầu một cách dễ dàng. Thân máy có thiết kế đầm tay, tay cầm bọc cao su chống trơn trượt hiệu quả.',
    costPrice: 1550000,
    price: 2450000,
    promoPrice: 2190000,
    stock: 45,
    specs: [
      { name: 'Điện áp pin', value: '21V' },
      { name: 'Động cơ', value: 'Không chổi than (Brushless)' },
      { name: 'Lực siết tối đa', value: '1000 Nm' },
      { name: 'Tốc độ không tải', value: '0 - 1900/2200 RPM' },
      { name: 'Đầu cốt', value: '1/2 inch (12.7 mm)' }
    ],
    images: [
      'https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&q=80&w=600',
      'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&q=80&w=600'
    ],
    mainImage: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&q=80&w=600',
    status: 'active',
    createdAt: '2026-05-15T08:30:00Z',
    updatedAt: '2026-07-01T14:20:00Z'
  },
  {
    id: '2',
    name: 'Máy khoan búa Voltara 21V VT-HD26',
    sku: 'VT-HD26',
    brand: 'Voltara',
    category: 'Máy khoan & Máy búa',
    shortDescription: 'Máy khoan bê tông chuyên dụng 3 chức năng, động cơ brushless lực đập 2.6J mạnh mẽ.',
    description: 'Máy khoan bê tông bê tông dùng pin Voltara VT-HD26 sở hữu lực đập 2.6J chuyên dùng cho thợ thi công điện nước, xây dựng dầm sàn. Thiết kế 3 chức năng linh hoạt: khoan thường, khoan búa và đục bê tông, đáp ứng mọi nhu cầu tại công trình.',
    costPrice: 1300000,
    price: 1980000,
    promoPrice: null,
    stock: 28,
    specs: [
      { name: 'Điện áp pin', value: '21V' },
      { name: 'Lực đập', value: '2.6 Joules' },
      { name: 'Phạm vi khoan tối ưu', value: '6 - 26 mm' },
      { name: 'Động cơ', value: 'Không chổi than (Brushless)' },
      { name: 'Tốc độ đập', value: '0 - 4500 BPM' }
    ],
    images: [
      'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&q=80&w=600'
    ],
    mainImage: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&q=80&w=600',
    status: 'active',
    createdAt: '2026-05-18T09:15:00Z',
    updatedAt: '2026-07-02T10:05:00Z'
  },
  {
    id: '3',
    name: 'Máy mài góc Voltara 21V VT-AG125',
    sku: 'VT-AG125',
    brand: 'Voltara',
    category: 'Máy mài & Máy cắt',
    shortDescription: 'Máy mài góc cốt 125mm, động cơ không chổi than thông minh với 3 cấp độ chỉnh tốc.',
    description: 'Máy mài góc cầm tay dùng pin VT-AG125 cho phép điều chỉnh 3 cấp tốc độ linh hoạt. Thích hợp cho việc cắt sắt, mài nhám gỗ, đánh bóng cơ khí. Có mạch bảo vệ chống quá tải, chống khởi động lại vô tình để đảm bảo an toàn tuyệt đối.',
    costPrice: 950000,
    price: 1550000,
    promoPrice: 1390000,
    stock: 35,
    specs: [
      { name: 'Điện áp pin', value: '21V' },
      { name: 'Đường kính đĩa', value: '125 mm' },
      { name: 'Tốc độ không tải', value: '3000 / 6000 / 8500 RPM' },
      { name: 'Động cơ', value: 'Không chổi than (Brushless)' },
      { name: 'Trọng lượng thân máy', value: '1.4 kg' }
    ],
    images: [
      'https://images.unsplash.com/photo-1534224039826-c7a0eda0e6b3?auto=format&fit=crop&q=80&w=600'
    ],
    mainImage: 'https://images.unsplash.com/photo-1534224039826-c7a0eda0e6b3?auto=format&fit=crop&q=80&w=600',
    status: 'active',
    createdAt: '2026-05-20T11:00:00Z',
    updatedAt: '2026-07-03T16:45:00Z'
  },
  {
    id: '4',
    name: 'Máy cưa đĩa Voltara 21V VT-CS125',
    sku: 'VT-CS125',
    brand: 'Voltara',
    category: 'Máy cưa cầm tay',
    shortDescription: 'Máy cưa đĩa dùng pin 125mm, có thể chỉnh góc nghiêng cắt linh hoạt lên tới 45 độ.',
    description: 'Máy cưa đĩa Voltara VT-CS125 thiết kế gọn nhẹ, tay cầm an toàn, chuyên dùng để cắt gỗ tự nhiên, gỗ công nghiệp hoặc tấm nhựa mica mỏng. Thích hợp cho thợ mộc di động và công trình lắp đặt nội thất.',
    costPrice: 1100000,
    price: 1850000,
    promoPrice: null,
    stock: 15,
    specs: [
      { name: 'Điện áp pin', value: '21V' },
      { name: 'Đường kính lưỡi', value: '125 mm' },
      { name: 'Độ sâu cắt tối đa', value: '45 mm (ở góc 90°)' },
      { name: 'Góc cắt nghiêng', value: '0 - 45 độ' },
      { name: 'Tốc độ không tải', value: '5000 RPM' }
    ],
    images: [
      'https://images.unsplash.com/photo-1572981779307-38b8cabb2407?auto=format&fit=crop&q=80&w=600'
    ],
    mainImage: 'https://images.unsplash.com/photo-1572981779307-38b8cabb2407?auto=format&fit=crop&q=80&w=600',
    status: 'active',
    createdAt: '2026-05-25T14:30:00Z',
    updatedAt: '2026-07-04T09:10:00Z'
  },
  {
    id: '5',
    name: 'Máy cưa kiếm Voltara 21V VT-RS150',
    sku: 'VT-RS150',
    brand: 'Voltara',
    category: 'Máy cưa cầm tay',
    shortDescription: 'Máy cưa kiếm cầm tay nhỏ gọn, hành trình lưỡi 15mm, thay lưỡi nhanh không cần dụng cụ.',
    description: 'Máy cưa kiếm dùng pin VT-RS150 là công cụ đa năng giúp cắt cành cây, ống nhựa PVC, tấm sắt mỏng hay tháo dỡ nội thất cũ. Cơ chế thay lưỡi thông minh rút ngắn thời gian thao tác tối đa.',
    costPrice: 800000,
    price: 1350000,
    promoPrice: 1190000,
    stock: 22,
    specs: [
      { name: 'Điện áp pin', value: '21V' },
      { name: 'Hành trình cắt', value: '15 mm' },
      { name: 'Nhịp cắt không tải', value: '0 - 3000 SPM' },
      { name: 'Khả năng cắt gỗ tối đa', value: '150 mm' },
      { name: 'Kiểu khớp chân lưỡi', value: 'Chân chữ T thông dụng' }
    ],
    images: [
      'https://images.unsplash.com/photo-1540103711724-ee7234b35766?auto=format&fit=crop&q=80&w=600'
    ],
    mainImage: 'https://images.unsplash.com/photo-1540103711724-ee7234b35766?auto=format&fit=crop&q=80&w=600',
    status: 'active',
    createdAt: '2026-05-26T15:10:00Z',
    updatedAt: '2026-07-05T11:40:00Z'
  },
  {
    id: '6',
    name: 'Quạt dùng pin Voltara 21V VT-FN21A',
    sku: 'VT-FN21A',
    brand: 'Voltara',
    category: 'Thiết bị dùng pin khác',
    shortDescription: 'Quạt tích điện di động dùng pin 21V hoặc cắm điện 220V trực tiếp, sải cánh rộng 21cm.',
    description: 'Quạt pin dã ngoại VT-FN21A là giải pháp lý tưởng cho mùa hè oi bức, dã ngoại ngoài trời hoặc làm việc ở công trình không có lưới điện. Tích hợp cổng sạc USB cho điện thoại và hỗ trợ nguồn điện kép tiện lợi.',
    costPrice: 500000,
    price: 890000,
    promoPrice: 790000,
    stock: 4, // Sắp hết hàng
    specs: [
      { name: 'Điện áp kép', value: 'Pin 21V hoặc Adapter 220V' },
      { name: 'Đường kính cánh', value: '210 mm' },
      { name: 'Cổng sạc đầu ra', value: 'USB 5V/2A sạc điện thoại' },
      { name: 'Các mức gió', value: '3 cấp độ gió điều khiển nút bấm' },
      { name: 'Góc quay cơ học', value: 'Quay lên xuống 120 độ' }
    ],
    images: [
      'https://images.unsplash.com/photo-1618944847023-38aa001235f0?auto=format&fit=crop&q=80&w=600'
    ],
    mainImage: 'https://images.unsplash.com/photo-1618944847023-38aa001235f0?auto=format&fit=crop&q=80&w=600',
    status: 'active',
    createdAt: '2026-05-30T10:00:00Z',
    updatedAt: '2026-07-05T15:20:00Z'
  },
  {
    id: '7',
    name: 'Máy khoan bắt vít Voltara 21V VT-CD21',
    sku: 'VT-CD21',
    brand: 'Voltara',
    category: 'Máy khoan & Máy búa',
    shortDescription: 'Máy khoan bắt vít 3 chức năng có búa, đầu kẹp autolock kim loại 13mm lực siết 80Nm.',
    description: 'Máy khoan pin 3 chức năng Voltara VT-CD21 là cánh tay đắc lực của thợ thạch cao, thợ mộc và thợ cơ khí. Khả năng bắt vít cực mượt nhờ 20 cấp trượt chống cháy ren, lực siết lên tới 80Nm khoan sắt mỏng và tường gạch thoải mái.',
    costPrice: 750000,
    price: 1250000,
    promoPrice: null,
    stock: 65,
    specs: [
      { name: 'Điện áp pin', value: '21V' },
      { name: 'Lực siết tối đa', value: '80 Nm' },
      { name: 'Đầu kẹp (Chuck)', value: 'Kim loại Autolock 13 mm' },
      { name: 'Cấp trượt', value: '20 cấp trượt bắt vít + 3 chức năng khoan' },
      { name: 'Động cơ', value: 'Không chổi than (Brushless)' }
    ],
    images: [
      'https://images.unsplash.com/photo-1595206133361-b1fe343e5e23?auto=format&fit=crop&q=80&w=600'
    ],
    mainImage: 'https://images.unsplash.com/photo-1595206133361-b1fe343e5e23?auto=format&fit=crop&q=80&w=600',
    status: 'active',
    createdAt: '2026-06-01T08:00:00Z',
    updatedAt: '2026-07-06T09:30:00Z'
  },
  {
    id: '8',
    name: 'Máy thổi lá/thổi bụi Voltara 21V VT-BL500',
    sku: 'VT-BL500',
    brand: 'Voltara',
    category: 'Thiết bị dùng pin khác',
    shortDescription: 'Máy thổi bụi và hút bụi mini cầm tay 2 trong 1 cực tiện lợi, lưu lượng gió mạnh.',
    description: 'Máy thổi VT-BL500 sở hữu lưu lượng gió lên tới 3.5 m³/phút, vừa có chức năng thổi lá sân vườn, vừa có thể lắp túi vải để hút bụi gỗ, dọn dẹp vệ sinh máy móc văn phòng cực kỳ cơ động.',
    costPrice: 550000,
    price: 950000,
    promoPrice: 850000,
    stock: 2, // Sắp hết hàng
    specs: [
      { name: 'Điện áp pin', value: '21V' },
      { name: 'Lưu lượng gió tối đa', value: '3.5 m³/phút' },
      { name: 'Tốc độ gió', value: '0 - 150 km/h' },
      { name: 'Hai chức năng', value: 'Thổi bụi và Hút bụi (kèm túi chứa)' },
      { name: 'Cân nặng', value: '1.2 kg gọn nhẹ' }
    ],
    images: [
      'https://images.unsplash.com/photo-1530124566582-ab05104a0c8b?auto=format&fit=crop&q=80&w=600'
    ],
    mainImage: 'https://images.unsplash.com/photo-1530124566582-ab05104a0c8b?auto=format&fit=crop&q=80&w=600',
    status: 'active',
    createdAt: '2026-06-05T13:40:00Z',
    updatedAt: '2026-07-06T14:15:00Z'
  },
  {
    id: '9',
    name: 'Súng bắn keo silicon Voltara 21V VT-GG120',
    sku: 'VT-GG120',
    brand: 'Voltara',
    category: 'Thiết bị dùng pin khác',
    shortDescription: 'Súng bắn keo tự động dùng pin, chống rỉ keo thông minh, lực đẩy lớn.',
    description: 'Súng bắn keo silicon Voltara VT-GG120 giúp thi công dán kính, dán phào chỉ tường cực kỳ đều và thẩm mỹ, không mỏi tay như súng cơ thông thường. Có chế độ tự động rút trục đẩy khi nhả cò giúp ngăn rò rỉ keo dư thừa.',
    costPrice: 600000,
    price: 1100000,
    promoPrice: null,
    stock: 0, // Hết hàng
    specs: [
      { name: 'Điện áp pin', value: '21V' },
      { name: 'Lực đẩy tối đa', value: '4500 N' },
      { name: 'Tốc độ đẩy keo', value: '0 - 8 mm/giây' },
      { name: 'Cơ chế chống nhỏ giọt', value: 'Tự lùi trục 2mm khi buông cò' },
      { name: 'Dung tích chai keo', value: 'Dùng cho chai keo tiêu chuẩn 300ml - 400ml' }
    ],
    images: [
      'https://images.unsplash.com/photo-1581582801904-3bd33ae93835?auto=format&fit=crop&q=80&w=600'
    ],
    mainImage: 'https://images.unsplash.com/photo-1581582801904-3bd33ae93835?auto=format&fit=crop&q=80&w=600',
    status: 'draft', // Bản nháp
    createdAt: '2026-06-10T16:20:00Z',
    updatedAt: '2026-07-07T11:30:00Z'
  },
  {
    id: '10',
    name: 'Máy bơm nước dùng pin Voltara 21V VT-WP300',
    sku: 'VT-WP300',
    brand: 'Voltara',
    category: 'Thiết bị dùng pin khác',
    shortDescription: 'Máy bơm nước tăng áp rửa xe dã ngoại cầm tay mini lực phun mạnh mẽ.',
    description: 'Máy rửa xe, bơm nước cầm tay Voltara VT-WP300 gọn nhẹ, tự hút nước từ xô chậu, hồ nước mà không cần mồi hay cấp nước trực tiếp từ vòi. Lựa chọn tuyệt vời cho rửa xe máy, rửa sân, tưới cây cảnh quan di động.',
    costPrice: 700000,
    price: 1390000,
    promoPrice: null,
    stock: 12,
    specs: [
      { name: 'Điện áp pin', value: '21V' },
      { name: 'Áp lực nước lớn nhất', value: '35 Bar' },
      { name: 'Lưu lượng dòng chảy', value: '4.5 Lít/phút' },
      { name: 'Độ sâu hút nước tối đa', value: '5 mét (tự mồi tự hút)' },
      { name: 'Đầu phun đa năng', value: 'Phun 6 trong 1 xoay linh hoạt' }
    ],
    images: [
      'https://images.unsplash.com/photo-1595206133361-b1fe343e5e23?auto=format&fit=crop&q=80&w=600'
    ],
    mainImage: 'https://images.unsplash.com/photo-1595206133361-b1fe343e5e23?auto=format&fit=crop&q=80&w=600',
    status: 'discontinued', // Ngừng bán
    createdAt: '2026-06-12T10:15:00Z',
    updatedAt: '2026-07-08T15:40:00Z'
  }
];
