# Mobile Screen Flow
# Hệ thống Quản lý Cửa hàng Vật tư Gia đình

**Platform:** iOS + Android (React Native + Expo)  
**Orientation:** Portrait (chính), Landscape (hỗ trợ)

---

## 1. Navigation Structure

```
App
├── Tab 1: Dashboard (home icon)
├── Tab 2: Bán hàng / POS (cart icon)
├── Tab 3: Kho hàng (box icon)
├── Tab 4: Báo cáo (chart icon)
└── Tab 5: Cài đặt (gear icon)
```

---

## 2. Màn hình chi tiết

### SCR-01: Dashboard (Tab 1)

**Mục đích:** Tổng quan nhanh tình hình kinh doanh hôm nay

**Nội dung hiển thị:**
- Header: Ngày hôm nay + tên cửa hàng
- Card lớn: Doanh thu hôm nay / Lợi nhuận gộp hôm nay
- Row 3 card nhỏ: Số hóa đơn hôm nay | Tuần này | Tháng này
- Section: Top 5 sản phẩm bán chạy tuần (mini bar chart)
- Section: Cảnh báo tồn kho thấp (danh sách đỏ)
- FAB (Floating Action Button): "+ Tạo hóa đơn" → đến SCR-02

**UX notes:**
- Pull-to-refresh để cập nhật dữ liệu
- Tap card → chuyển sang màn hình báo cáo tương ứng
- Cảnh báo tồn thấp: badge số lượng trên tab Kho hàng

---

### SCR-02: Bán hàng / POS (Tab 2)

**Mục đích:** Tạo và xử lý hóa đơn tại quầy

**Layout:** 2 phần chính
- **Phần trên (40%):** Danh sách sản phẩm trong hóa đơn hiện tại
- **Phần dưới (60%):** Tìm kiếm + thêm sản phẩm

**Luồng:**
```
SCR-02 (Màn hình POS trống)
  ├── Nhập tên sản phẩm → danh sách gợi ý realtime
  ├── Tap sản phẩm → thêm vào hóa đơn (qty = 1)
  ├── Button [📷 Tìm bằng AI] → SCR-06 (AI Camera)
  ├── Swipe trái dòng sản phẩm → xóa
  ├── Tap qty → input số lượng
  └── Button [Thanh toán X,XXX,XXX đ] → SCR-03
```

**Elements:**
- Search bar + keyboard luôn ready
- Dòng sản phẩm: tên | qty stepper | đơn giá | thành tiền
- Footer sticky: Tổng + nút Thanh toán
- Button "So sánh" (xuất hiện khi có 2+ sp cùng category) → SCR-07

---

### SCR-03: Thanh toán

**Mục đích:** Chọn phương thức và xác nhận thanh toán

**Options:**
1. **Tiền mặt:**
   - Input: "Khách đưa"
   - Hiển thị: Tiền thừa = Khách đưa − Tổng
   - Button: [Xác nhận thanh toán] → SCR-04

2. **Chuyển khoản QR:**
   - Hiển thị QR VietQR với số tiền hóa đơn
   - Text: "Quét mã → chuyển khoản → nhấn xác nhận"
   - Button: [✓ Đã nhận tiền] → SCR-04

**Input ghi chú:** Optional (tên khách, địa chỉ lắp đặt...)

---

### SCR-04: Hóa đơn thành công

**Mục đích:** Xác nhận đơn hàng hoàn tất

**Nội dung:**
- Icon ✓ lớn (animation)
- Số hóa đơn + tổng tiền + tiền thừa (nếu tiền mặt)
- Danh sách sản phẩm tóm tắt
- Button: [Tạo hóa đơn mới] → SCR-02 (reset)
- Button: [Xem chi tiết] → SCR-05

---

### SCR-05: Chi tiết hóa đơn

**Mục đích:** Xem lại + tạo hoàn trả

**Nội dung:**
- Thông tin đơn: ngày, phương thức, trạng thái, ghi chú
- Danh sách sản phẩm + số lượng + đơn giá
- Tổng tiền / Tiền khách đưa / Tiền thừa
- Button: [Hoàn trả] → SCR-08 (chỉ hiện khi status = paid)

---

### SCR-06: AI Camera Search (Modal)

**Mục đích:** Chụp ảnh linh kiện → tìm sản phẩm tương đồng

**Luồng:**
```
Mở camera fullscreen
  ├── Chụp ảnh hoặc chọn từ gallery
  └── Preview ảnh + Button [🔍 Tìm kiếm]
        → Loading (spinner + "AI đang phân tích...")
        → Kết quả: danh sách sản phẩm (ảnh + tên + giá + tồn)
           ├── Tap sản phẩm → xem chi tiết
           └── Button [+ Thêm vào hóa đơn]
```

**UX notes:**
- Timeout 10 giây → hiện error toast
- Kết quả empty → "Không tìm thấy sản phẩm phù hợp, thử ảnh khác"

---

### SCR-07: So sánh sản phẩm (Modal)

**Mục đích:** Hiển thị thông tin song song 2–3 sản phẩm

**Layout:** Bảng ngang (scroll horizontal nếu 3 sp)

**Rows so sánh:**
- Ảnh sản phẩm
- Tên
- Ngành hàng / NCC
- Giá bán
- Tồn kho
- Thông số kỹ thuật (từng dòng spec)

**Bottom:** Button [+ Thêm vào hóa đơn] cho mỗi cột

---

### SCR-08: Hoàn trả (Modal)

**Mục đích:** Tạo phiếu hoàn trả

**Luồng:**
```
Danh sách sản phẩm trong đơn gốc
  └── Checkbox + nhập số lượng hoàn cho từng dòng
Nhập lý do hoàn
Tổng tiền hoàn
Button [Xác nhận hoàn trả] → cộng kho + tạo phiếu
```

---

### SCR-09: Kho hàng — Danh sách (Tab 3)

**Mục đích:** Quản lý toàn bộ sản phẩm

**Elements:**
- Search bar + Filter (ngành hàng)
- Toggle: Tất cả / Sắp hết hàng
- Danh sách: ảnh nhỏ | tên | SKU | tồn kho (đỏ nếu thấp) | giá bán
- FAB: "+ Thêm sản phẩm" → SCR-10
- FAB thứ 2: "Nhập hàng" → SCR-12

**Tap sản phẩm** → SCR-11

---

### SCR-10: Thêm / Sửa sản phẩm

**Fields:**
- Ảnh (tap để upload / chụp)
- Tên sản phẩm *
- Ngành hàng (dropdown) *
- SKU (auto-generate hoặc tự nhập)
- Đơn vị *
- Giá bán *
- Tồn kho ban đầu
- Ngưỡng cảnh báo tồn thấp
- Thông số kỹ thuật (text area tự do)

**Action:** [Lưu] → về SCR-09

---

### SCR-11: Chi tiết sản phẩm

**Nội dung:**
- Ảnh lớn
- Thông tin: tên, SKU, ngành, đơn vị, giá bán, tồn kho
- Thông số kỹ thuật
- Biểu đồ lịch sử giá nhập (line chart)
- Lịch sử xuất/nhập (timeline)
- Button: [Sửa] → SCR-10
- Button: [Nhập hàng] → SCR-12 (prefill sản phẩm này)

---

### SCR-12: Nhập hàng (Modal)

**Fields:**
- Sản phẩm (search + select hoặc prefilled)
- Nhà cung cấp (dropdown)
- Giá nhập *
- Số lượng *
- Ngày nhập (default: hôm nay)
- Ghi chú

**Action:** [Xác nhận nhập hàng] → cộng kho

---

### SCR-13: Nhà cung cấp (trong Tab 3 → Suppliers)

**Danh sách NCC:**
- Tên | SĐT | Số loại hàng cung cấp
- Tap → xem danh sách phiếu nhập từ NCC này

**FAB:** "+ Thêm NCC"

---

### SCR-14: Báo cáo (Tab 4)

**Sub-tabs:** Doanh thu | Lợi nhuận | Kho | Lịch sử đơn

#### Sub-tab: Doanh thu
- Filter: Hôm nay / Tuần / Tháng / Tùy chọn (date range picker)
- Line chart: doanh thu theo ngày/tuần
- Summary cards: Tổng DT | Số đơn | TB/đơn

#### Sub-tab: Lợi nhuận
- Line chart: lợi nhuận gộp
- Pie chart: % lợi nhuận theo ngành hàng

#### Sub-tab: Kho
- Tổng giá trị kho
- Sản phẩm tồn lâu (>30 ngày chưa bán)
- Cảnh báo hết hàng

#### Sub-tab: Lịch sử đơn
- Danh sách hóa đơn, lọc theo ngày + trạng thái
- Tap → SCR-05

---

### SCR-15: Cài đặt (Tab 5)

**Sections:**

**Thông tin cửa hàng:**
- Tên cửa hàng
- Thông tin tài khoản ngân hàng (cho QR)
- Logo cửa hàng

**Thông báo Zalo:**
- SĐT nhận báo cáo
- Giờ gửi báo cáo (mặc định 21:00)
- Toggle bật/tắt

**Cài đặt ứng dụng:**
- Ngưỡng cảnh báo tồn thấp mặc định

---

## 3. Navigation Flow tổng quan

```
[Dashboard]──────────────────────────────────────────┐
     │                                               │
     └─ FAB "+ Tạo HĐ" ──→ [POS]                    │
                              │                      │
                              ├─ [AI Camera]←────────┤
                              ├─ [Thanh toán]        │
                              │       │              │
                              │       └─ [HĐ thành công]
                              │               │
                              │               └─ [Chi tiết HĐ]
                              │                       │
                              └─ [So sánh SP]         └─ [Hoàn trả]

[Kho hàng]
     ├─ [Chi tiết SP] → [Sửa SP]
     ├─ [Thêm SP]
     ├─ [Nhập hàng]
     └─ [NCC]

[Báo cáo]
     └─ [Chi tiết HĐ] → [Hoàn trả]

[Cài đặt]
```

---

## 4. UX Guidelines

### Typography
- Tiêu đề màn hình: 20sp Bold
- Label: 14sp Medium
- Body: 14sp Regular
- Số tiền: 18sp Bold, màu primary
- Tồn kho thấp: đỏ (#EF4444)

### Spacing
- Screen padding: 16dp
- Card padding: 12dp
- List item height: 64dp (đủ tap target)

### Colors (đề xuất)
- Primary: Xanh đậm #1E40AF (chuyên nghiệp, tin tưởng)
- Success: Xanh lá #16A34A
- Warning: Cam #D97706
- Danger: Đỏ #DC2626
- Background: Xám nhạt #F8FAFC

### Thao tác nhanh
- Tìm kiếm sản phẩm: autofocus keyboard khi vào POS
- Qty: double-tap để nhập bàn phím số
- Swipe left: xóa dòng (có undo toast)
- Swipe down: đóng modal
