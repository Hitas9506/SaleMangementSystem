# SRS — Software Requirements Specification
# Hệ thống Quản lý Cửa hàng Vật tư Gia đình

**Phiên bản:** 1.0  
**Ngày:** 2026-05-25  
**Người viết:** Antigravity AI  
**Trạng thái:** Draft — chờ review

---

## 1. Giới thiệu

### 1.1 Mục đích
Tài liệu này mô tả đầy đủ các yêu cầu chức năng và phi chức năng cho ứng dụng quản lý cửa hàng vật tư điện nước, nhôm kính quy mô gia đình.

### 1.2 Phạm vi hệ thống
- Ứng dụng mobile native (iOS & Android)
- Backend API trên cloud (miễn phí)
- Database PostgreSQL trên Supabase (miễn phí)
- Tích hợp AI nhận diện ảnh linh kiện
- Tích hợp thông báo Zalo cá nhân

### 1.3 Định nghĩa & Viết tắt

| Thuật ngữ | Giải thích |
|---|---|
| SKU | Stock Keeping Unit — mã định danh duy nhất cho từng sản phẩm |
| POS | Point of Sale — điểm bán hàng |
| VietQR | Chuẩn QR thanh toán liên ngân hàng Việt Nam |
| Embedding | Vector biểu diễn đặc trưng hình ảnh dùng cho AI search |
| OA | Official Account — tài khoản Zalo chính thức |

---

## 2. Actors (Người dùng hệ thống)

Hệ thống chỉ có **một loại người dùng duy nhất**: **Thành viên gia đình** (chủ cửa hàng).

- Không có đăng nhập / tài khoản riêng
- Tối đa 3 người dùng đồng thời
- Không phân quyền — mọi thành viên có quyền như nhau

---

## 3. Yêu cầu chức năng (Functional Requirements)

### Module 1: Bán hàng & Thanh toán (POS)

#### FR-POS-01: Tạo hóa đơn
- Người dùng có thể tạo hóa đơn mới
- Thêm sản phẩm vào hóa đơn bằng:
  - Tìm kiếm theo tên sản phẩm
  - Tìm kiếm theo mã SKU
  - Nhận diện ảnh (AI)
- Chỉnh sửa số lượng từng dòng
- Xóa dòng sản phẩm khỏi hóa đơn
- Hệ thống tự tính tổng tiền

#### FR-POS-02: So sánh sản phẩm
- Người dùng chọn 2–3 sản phẩm cùng loại để so sánh
- Hiển thị: tên, giá bán, nhà cung cấp, thông số kỹ thuật (nếu có)

#### FR-POS-03: Thanh toán tiền mặt
- Người dùng chọn phương thức "Tiền mặt"
- Nhập số tiền khách đưa
- Hệ thống tính tiền thừa
- Xác nhận → hóa đơn hoàn tất, kho tự động trừ

#### FR-POS-04: Thanh toán QR (VietQR tĩnh)
- Hệ thống hiển thị mã QR tĩnh của tài khoản ngân hàng gia đình
- Hiển thị số tiền cần thanh toán
- Người dùng xác nhận thủ công "Đã nhận tiền"
- Hóa đơn hoàn tất, kho tự động trừ

#### FR-POS-05: Ghi chú hóa đơn
- Người dùng có thể ghi chú thêm vào hóa đơn (tên khách, ghi chú lắp đặt...)

#### FR-POS-06: Hủy hóa đơn
- Hóa đơn ở trạng thái "Chưa thanh toán" có thể hủy
- Hóa đơn đã hoàn tất: không xóa, chỉ tạo phiếu hoàn trả

#### FR-POS-07: Phiếu hoàn trả
- Tạo phiếu hoàn trả liên kết với hóa đơn gốc
- Nhập sản phẩm hoàn và số lượng
- Kho tự động cộng lại

---

### Module 2: Quản lý Kho & Nhà cung cấp

#### FR-INV-01: Danh mục sản phẩm
- Xem danh sách sản phẩm
- Lọc theo ngành hàng: Điện, Nước, Nhôm Kính, Xây dựng, Khác
- Tìm kiếm theo tên / SKU
- Thêm sản phẩm mới (tên, ngành hàng, đơn vị tính, giá bán, thông số KT)
- Chỉnh sửa thông tin sản phẩm
- Upload ảnh sản phẩm (dùng cho AI search)

#### FR-INV-02: Nhập hàng
- Tạo phiếu nhập hàng: chọn nhà cung cấp, chọn sản phẩm, nhập giá nhập, số lượng
- Lưu lịch sử giá nhập theo từng lần nhập
- Kho tự động cộng số lượng sau khi xác nhận phiếu nhập

#### FR-INV-03: Theo dõi tồn kho
- Xem số lượng tồn kho từng sản phẩm
- Cảnh báo tồn kho thấp (ngưỡng do người dùng đặt)
- Xem lịch sử xuất/nhập của từng sản phẩm

#### FR-INV-04: Theo dõi giá nhập
- Xem lịch sử giá nhập của từng sản phẩm
- So sánh giá nhập theo thời gian (biểu đồ đơn giản)
- Cảnh báo khi giá nhập mới tăng > X% so với lần trước

#### FR-INV-05: Quản lý Nhà cung cấp
- Thêm / sửa nhà cung cấp (tên, SĐT, ghi chú)
- Xem danh sách hàng đã nhập từng NCC

---

### Module 3: AI Nhận diện Hình ảnh

#### FR-AI-01: Nhận diện linh kiện qua ảnh
- Người dùng chụp ảnh linh kiện / phụ kiện (từ camera hoặc gallery)
- Hệ thống gửi ảnh lên Gemini Vision API
- AI phân tích hình ảnh → trích xuất mô tả đặc điểm
- Hệ thống tìm kiếm trong DB sản phẩm dựa trên mô tả AI
- Hiển thị danh sách sản phẩm tương đồng (kèm ảnh, giá, tồn kho)
- Người dùng chọn sản phẩm phù hợp → thêm vào hóa đơn hoặc xem chi tiết

**Luồng kỹ thuật:**
```
Camera → Gemini Vision API → mô tả text → 
vector embedding → pgvector similarity search → kết quả
```

---

### Module 4: Báo cáo & Thống kê

#### FR-RPT-01: Dashboard tổng quan
- Doanh thu hôm nay / tuần này / tháng này
- Số hóa đơn hôm nay
- Tổng lợi nhuận gộp (doanh thu - giá nhập)
- Top 5 sản phẩm bán chạy tuần/tháng
- Cảnh báo tồn kho thấp

#### FR-RPT-02: Báo cáo doanh thu
- Lọc theo ngày / tuần / tháng / tùy chọn
- Biểu đồ doanh thu theo thời gian
- Phân tích theo ngành hàng

#### FR-RPT-03: Báo cáo lợi nhuận
- Lợi nhuận gộp theo kỳ
- Lợi nhuận theo từng sản phẩm / ngành hàng

#### FR-RPT-04: Báo cáo kho
- Tồn kho hiện tại
- Sản phẩm tồn lâu ngày (chưa bán > 30/60/90 ngày)
- Giá trị kho hiện tại (tổng = Σ tồn × giá nhập gần nhất)

#### FR-RPT-05: Lịch sử hóa đơn
- Xem toàn bộ lịch sử hóa đơn
- Lọc theo ngày, phương thức thanh toán
- Xem chi tiết từng hóa đơn

#### FR-RPT-06: Thông báo Zalo tự động
- Mỗi ngày lúc **21:00** hệ thống tự gửi báo cáo ngày về Zalo cá nhân
- Nội dung: tổng doanh thu, tổng lợi nhuận gộp, số hóa đơn, top 3 sản phẩm bán chạy
- Dùng Zalo OA webhook (Zalo Notification Service)

---

## 4. Yêu cầu phi chức năng (Non-Functional Requirements)

### NFR-01: Hiệu năng
- Tìm kiếm sản phẩm: phản hồi < 500ms
- Tạo hóa đơn & xác nhận: < 1 giây
- AI nhận diện ảnh: < 5 giây (phụ thuộc mạng & Gemini API)
- Dashboard load: < 2 giây

### NFR-02: Khả dụng (Availability)
- Backend: Railway free tier (~99% uptime, có thể sleep sau 30 phút idle)
- Supabase free: 99.9% uptime

### NFR-03: Bảo mật
- Không có login nhưng API backend cần API key đơn giản (header `X-App-Key`)
- API key lưu trong app, không expose ra public
- Supabase Row Level Security: chỉ cho phép từ backend service role

### NFR-04: Khả dụng trên thiết bị
- iOS 14+ và Android 10+
- Tối ưu cho màn hình điện thoại (portrait mode chính, hỗ trợ landscape)
- Font size đủ lớn cho thao tác nhanh tại quầy

### NFR-05: Chi phí vận hành
- **$0/tháng** trong giai đoạn hiện tại
- Supabase Free: 500MB DB, 2GB bandwidth
- Railway Free: $5 credit/tháng (đủ cho traffic gia đình)
- Gemini API: Free tier 15 requests/phút, 1,500/ngày
- Zalo OA: Miễn phí 10,000 tin ZNS/tháng (đủ 1 tin/ngày)

### NFR-06: Dữ liệu
- Lịch sử hóa đơn: lưu vĩnh viễn, không xóa
- Backup: Supabase tự backup hàng ngày (free tier: 7 ngày)
- Không cần offline mode

---

## 5. User Stories

### Bán hàng
- US-01: *Khi có khách mua hàng*, tôi muốn **tìm nhanh sản phẩm theo tên** để thêm vào hóa đơn nhanh chóng
- US-02: *Khi khách mang linh kiện lạ đến hỏi*, tôi muốn **chụp ảnh và để AI tìm sản phẩm tương đương** để tư vấn chính xác
- US-03: *Khi khách hỏi so sánh 2 loại ống*, tôi muốn **xem thông tin song song** để tư vấn không cần nhớ thuộc lòng
- US-04: *Khi khách thanh toán chuyển khoản*, tôi muốn **hiển thị QR nhanh** để khách quét không mất thời gian

### Kho hàng
- US-05: *Khi nhập hàng về*, tôi muốn **ghi nhanh phiếu nhập và giá mua** để theo dõi lịch sử giá NCC
- US-06: *Khi sản phẩm sắp hết*, tôi muốn **được cảnh báo tự động** để không bỏ lỡ cơ hội bán hàng

### Báo cáo
- US-07: *Cuối ngày*, tôi muốn **nhận báo cáo tự động qua Zalo** để biết tình hình kinh doanh mà không cần mở app
- US-08: *Cuối tháng*, tôi muốn **xem báo cáo lợi nhuận** để biết thực sự lời bao nhiêu

---

## 6. Ràng buộc hệ thống

- Không có chức năng đăng nhập / quản lý tài khoản
- Hóa đơn đã hoàn tất: không cho phép xóa, chỉ hoàn trả
- Chi phí vận hành phải là $0 trong giai đoạn khởi động
- App phải hoạt động trên cả iOS và Android từ 1 codebase
- Không cần chế độ offline
