# SAD — System Architecture Document
# Hệ thống Quản lý Cửa hàng Vật tư Gia đình

**Phiên bản:** 1.0 | **Ngày:** 2026-05-25 | **Trạng thái:** Draft

---

## 1. Kiến trúc tổng quan

```
┌──────────────────────────────────────────────┐
│           CLIENT LAYER                       │
│   React Native App (iOS + Android)           │
│   POS | Inventory | AI Search | Reports      │
└──────────────────┬───────────────────────────┘
                   │ HTTPS REST API
┌──────────────────▼───────────────────────────┐
│          BUSINESS LOGIC LAYER                │
│        Node.js + Express (Railway)           │
│  POS Svc | Inventory Svc | AI Svc | Cron     │
└───┬──────────────┬──────────┬────────────┬───┘
    │              │          │            │
┌───▼────┐  ┌──────▼──┐  ┌───▼──────┐  ┌─▼──────┐
│Supabase│  │Supabase │  │  Gemini  │  │Zalo OA │
│ PG +   │  │Storage  │  │Vision API│  │  API   │
│pgvector│  │(images) │  │          │  │        │
└────────┘  └─────────┘  └──────────┘  └────────┘
```

---

## 2. Tech Stack

### Frontend — React Native + Expo

| Mục | Công nghệ |
|---|---|
| Framework | React Native 0.74+ |
| Toolchain | Expo SDK 51 (managed workflow) |
| Navigation | Expo Router (file-based) |
| State | Zustand |
| UI | React Native Paper |
| HTTP | Axios |
| Camera | expo-camera + expo-image-picker |
| Charts | react-native-gifted-charts |
| QR | react-native-qrcode-svg |
| Build | Expo EAS Build |

**Lý do chọn Expo:** Không cần Xcode/Android Studio ban đầu, OTA updates, build cloud, dễ vibe code.

### Backend — Node.js + Express

| Mục | Công nghệ |
|---|---|
| Runtime | Node.js 20 LTS |
| Framework | Express.js 4 |
| ORM | Prisma |
| Validation | Zod |
| Scheduler | node-cron (Zalo 21:00 daily) |
| Auth | API Key header `X-App-Key` |
| Deploy | Railway (free $5 credit/tháng) |

**Lý do chọn Node.js thay C#:** Cùng JS với RN, deploy Railway free, nhẹ hơn .NET, dễ tích hợp API bên thứ 3.

### Database — Supabase

| Mục | Chi tiết |
|---|---|
| Provider | Supabase (free: 500MB DB, 1GB Storage) |
| Engine | PostgreSQL 15 + pgvector extension |
| Storage | Supabase Storage (ảnh sản phẩm) |
| Connect | Prisma → PostgreSQL connection string |

### AI — Gemini 1.5 Flash

- Free tier: 15 RPM, 1,500 req/ngày — đủ dùng
- Dùng cho: phân tích ảnh linh kiện → mô tả text → vector search

### VietQR (Static)

```
https://img.vietqr.io/image/{bank}-{account}-compact.png?amount={amount}&addInfo={note}
```
Miễn phí, không cần đăng ký. Xác nhận thủ công.

### Zalo OA (ZNS)

- Tạo Zalo Official Account (miễn phí)
- ZNS gửi tin nhắn về Zalo cá nhân (SĐT)
- Miễn phí 10,000 tin/tháng

---

## 3. Data Flow

### Bán hàng
```
User tìm sp → GET /products?q=... → trả danh sách
User chọn thanh toán:
  Tiền mặt → xác nhận → POST /orders → trừ kho
  QR → hiển thị QR → user bấm "Đã nhận" → POST /orders → trừ kho
```

### AI Nhận diện ảnh
```
Chụp ảnh → POST /ai/search-by-image (base64)
→ Gemini Vision → mô tả text
→ text embedding → pgvector similarity search
← Top 10 sản phẩm tương đồng → User chọn
```

### Zalo tự động 21:00
```
node-cron → tổng hợp dữ liệu ngày
→ format message → Zalo OA API → SĐT chủ
```

---

## 4. Cấu trúc App (Expo Router)

```
app/
├── (tabs)/
│   ├── index.tsx          → Dashboard
│   ├── pos.tsx            → Bán hàng
│   ├── inventory/
│   │   ├── index.tsx      → Danh sách kho
│   │   ├── [id].tsx       → Chi tiết sản phẩm
│   │   └── import.tsx     → Nhập hàng
│   ├── reports.tsx        → Báo cáo
│   └── suppliers.tsx      → Nhà cung cấp
├── modals/
│   ├── ai-search.tsx      → AI Camera
│   ├── payment-qr.tsx     → QR Payment
│   ├── compare.tsx        → So sánh sản phẩm
│   └── return.tsx         → Hoàn trả
└── components/
    ├── ProductCard.tsx
    ├── InvoiceItem.tsx
    └── ReportChart.tsx
```

---

## 5. Triển khai & Chi phí

| Dịch vụ | Plan | Chi phí/tháng |
|---|---|---|
| Railway (backend) | Free ($5 credit) | $0 |
| Supabase (DB + Storage) | Free | $0 |
| Gemini API | Free tier | $0 |
| Zalo OA (ZNS) | Free (10k tin) | $0 |
| Expo EAS Build | Free (30 builds) | $0 |
| **Tổng** | | **$0** |

---

## 6. Bảo mật

- App mobile → Backend: header `X-App-Key` (secret cứng)
- Backend → Supabase: service role key (không expose ra app)
- App mobile KHÔNG kết nối trực tiếp Supabase
- Hóa đơn hoàn tất: không có DELETE endpoint
- Mọi thao tác kho: dùng PostgreSQL transaction (ACID)
