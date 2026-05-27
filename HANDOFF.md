# PROJECT HANDOFF — Quản lý Cửa hàng Vật tư Gia đình
# ĐỌC FILE NÀY TRƯỚC KHI LÀM BẤT CỨ ĐIỀU GÌ

**Ngày tạo:** 2026-05-25  
**Workspace:** `e:\OwnProject\SaleMangementSystem`  
**Trạng thái:** Spec hoàn tất — chưa bắt đầu code

---

## TÓM TẮT DỰ ÁN

Ứng dụng mobile native quản lý cửa hàng vật tư điện nước, nhôm kính quy mô gia đình nhỏ tại Việt Nam. Phục vụ **gia đình chủ cửa hàng** (tối đa 3 người dùng đồng thời), **không có login / phân quyền**. Chi phí vận hành **$0/tháng**.

---

## QUYẾT ĐỊNH ĐÃ LOCK — KHÔNG THAY ĐỔI

| Hạng mục | Quyết định | Lý do |
|---|---|---|
| Mobile | React Native + **Expo SDK 51** | Cross-platform iOS+Android, 1 codebase, dễ vibe code |
| Backend | **Node.js + Express** (Railway free) | Cùng JS với RN, deploy free, nhẹ |
| Database | **Supabase (PostgreSQL 15 + pgvector)** | Free 500MB, vector search tích hợp sẵn |
| AI | **Gemini 1.5 Flash API** | Free 1,500 req/ngày, nhận diện ảnh linh kiện |
| QR Payment | **VietQR tĩnh** | Không cần API ngân hàng, xác nhận thủ công |
| Thông báo | **Zalo OA (ZNS)** gửi Zalo cá nhân lúc 21:00 | Free 10k tin/tháng |
| Auth | **Không có login** — API key header đơn giản | Chỉ gia đình dùng |
| Offline | **Không cần** | |
| Chi phí | **$0/tháng** tuyệt đối | Yêu cầu cứng của chủ |

---

## USER PROFILE

- **Cách làm việc:** Vibe code (AI-assisted, không tự code tay nhiều)
- **Người dùng cuối:** Gia đình chủ cửa hàng, tối đa 3 người
- **Quy mô kho:** ~500 SKU (không có mã vạch, tự gán SKU)
- **Ngân sách:** $0/tháng (bắt buộc)
- **Nền tảng:** iOS + Android
- **Báo cáo:** Xem trực tiếp trên app + nhận Zalo cá nhân 21:00 mỗi ngày
- **AI cần ngay:** Nhận diện ảnh linh kiện (chụp ảnh → tìm sản phẩm tương đồng)
- **AI để sau:** Tư vấn thông số kỹ thuật (RAG từ PDF catalog)

---

## CẤU TRÚC TÀI LIỆU ĐÃ CÓ

```
e:\OwnProject\SaleMangementSystem\
├── HANDOFF.md                  ← FILE NÀY
├── Gemini_phantich.md          ← Phân tích ban đầu (tham khảo)
└── docs\
    ├── SRS.md                  ← Đặc tả yêu cầu đầy đủ
    ├── SAD.md                  ← Kiến trúc hệ thống + tech stack
    ├── ERD.md                  ← Database design + 9 bảng + SQL
    ├── API_SPEC.md             ← REST API endpoints đầy đủ
    └── MOBILE_SCREENS.md       ← 15 màn hình + navigation flow
```

---

## KIẾN TRÚC HỆ THỐNG (TÓM TẮT)

```
React Native App (Expo)
        ↕ HTTPS + X-App-Key header
Node.js + Express (Railway)
    ↙           ↓           ↘           ↘
Supabase    Supabase     Gemini         Zalo OA
PostgreSQL  Storage      Vision API     API (ZNS)
+ pgvector  (ảnh SP)     (AI ảnh)      (báo cáo)
```

---

## DATABASE — 9 BẢNG CHÍNH

| Bảng | Chức năng |
|---|---|
| `categories` | Ngành hàng: Điện, Nước, Nhôm Kính, Xây dựng, Khác |
| `suppliers` | Nhà cung cấp |
| `products` | Sản phẩm (SKU, giá bán, tồn kho, thông số KT) |
| `product_embeddings` | Vector AI cho pgvector search (image_vector, text_vector) |
| `import_logs` | Lịch sử nhập hàng + giá nhập (append-only) |
| `orders` | Hóa đơn bán hàng |
| `order_items` | Chi tiết từng dòng hóa đơn (snapshot giá) |
| `returns` | Phiếu hoàn trả |
| `return_items` | Chi tiết từng dòng hoàn trả |

**Quan trọng:**
- Kho trừ/cộng qua **PostgreSQL TRANSACTION** (ACID)
- `orders` đã paid: **KHÔNG DELETE** — chỉ hoàn trả
- `import_logs`: **APPEND-ONLY**, không update/delete

---

## API — CÁC NHÓM ENDPOINT

```
Base URL: https://<railway-app>.railway.app/api/v1
Auth: Header X-App-Key: <secret>

GET/POST/PUT  /products
GET           /products/compare?ids=uuid1,uuid2
GET/POST/PUT  /categories
GET/POST/PUT  /suppliers
GET/POST      /import-logs          ← cộng kho tự động
GET/POST      /orders               ← trừ kho tự động trong transaction
PATCH         /orders/:id/cancel
POST          /orders/:id/qr-confirm
POST          /returns              ← cộng kho tự động
GET           /reports/dashboard
GET           /reports/revenue
GET           /reports/inventory
POST          /ai/search-by-image   ← Gemini Vision → pgvector
POST          /upload/product-image ← Supabase Storage + tự tính embedding
```

---

## LUỒNG NGHIỆP VỤ QUAN TRỌNG

### Bán hàng (POS)
1. Tìm sản phẩm (tên/SKU) hoặc chụp ảnh AI
2. Thêm vào giỏ, điều chỉnh số lượng
3. Chọn thanh toán: Tiền mặt hoặc QR VietQR tĩnh
4. Xác nhận → `POST /orders` → trừ kho trong 1 transaction
5. Hiển thị hóa đơn thành công

### AI Nhận diện ảnh
```
Chụp ảnh → POST /ai/search-by-image (base64)
→ Gemini 1.5 Flash: mô tả text
→ text embedding → pgvector cosine similarity search
← Top 10 sản phẩm tương đồng
→ User chọn → thêm vào hóa đơn
```

### Báo cáo Zalo tự động
```
node-cron 21:00 hàng ngày
→ Tổng hợp doanh thu/lợi nhuận/đơn hàng ngày
→ Zalo OA API (ZNS) → SĐT chủ cửa hàng
```

---

## CẤU TRÚC APP MOBILE (Expo Router)

```
app/
├── (tabs)/
│   ├── index.tsx          → Dashboard (SCR-01)
│   ├── pos.tsx            → Bán hàng (SCR-02)
│   ├── inventory/
│   │   ├── index.tsx      → Danh sách kho (SCR-09)
│   │   ├── [id].tsx       → Chi tiết sản phẩm (SCR-11)
│   │   └── import.tsx     → Nhập hàng (SCR-12)
│   ├── reports.tsx        → Báo cáo (SCR-14)
│   └── settings.tsx       → Cài đặt (SCR-15)
├── modals/
│   ├── ai-search.tsx      → AI Camera (SCR-06)
│   ├── payment.tsx        → Thanh toán (SCR-03)
│   ├── payment-success.tsx→ HĐ thành công (SCR-04)
│   ├── order-detail.tsx   → Chi tiết HĐ (SCR-05)
│   ├── compare.tsx        → So sánh SP (SCR-07)
│   └── return.tsx         → Hoàn trả (SCR-08)
└── components/
    ├── ProductCard.tsx
    ├── InvoiceItem.tsx
    ├── StockBadge.tsx
    └── ReportChart.tsx
```

---

## SETUP MÔI TRƯỜNG (KHI BẮT ĐẦU CODE)

### Cần tạo tài khoản (miễn phí)
- [ ] **Supabase:** supabase.com → tạo project → lấy DB URL + service role key
- [ ] **Railway:** railway.app → kết nối GitHub → deploy Node.js
- [ ] **Google AI Studio:** aistudio.google.com → lấy Gemini API key
- [ ] **Zalo OA:** oa.zalo.me → tạo Official Account → lấy ZNS credentials
- [ ] **Expo:** expo.dev → tạo account → cài Expo Go trên điện thoại

### Biến môi trường Backend (.env)
```
DATABASE_URL=postgresql://...supabase.com/postgres
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
GEMINI_API_KEY=AIza...
ZALO_OA_ACCESS_TOKEN=...
ZALO_RECIPIENT_PHONE=84xxxxxxxxx
APP_SECRET_KEY=<random-32-char-string>
PORT=3000
```

### Biến môi trường App (app.config.js)
```js
extra: {
  API_BASE_URL: "https://<railway-app>.railway.app/api/v1",
  APP_KEY: "<same-as-APP_SECRET_KEY>"
}
```

---

## TÍNH NĂNG THEO PHASE

### Phase 1 — MVP (Bắt đầu code)
- [x] Spec hoàn tất
- [ ] Setup Supabase + migrate DB schema
- [ ] Backend: CRUD products, categories, suppliers
- [ ] Backend: POST /orders (với transaction trừ kho)
- [ ] Backend: POST /import-logs (cộng kho)
- [ ] App: Tab Dashboard (số liệu cơ bản)
- [ ] App: Tab POS (tìm SP, tạo HĐ, thanh toán tiền mặt + QR)
- [ ] App: Tab Kho (danh sách, thêm/sửa SP, nhập hàng)

### Phase 2 — AI + Báo cáo
- [ ] Backend: POST /ai/search-by-image (Gemini Vision + pgvector)
- [ ] App: AI Camera modal
- [ ] Backend: GET /reports/* (dashboard, revenue, inventory)
- [ ] App: Tab Báo cáo (charts)
- [ ] Backend: node-cron Zalo ZNS 21:00

### Phase 3 — Polish
- [ ] App: So sánh sản phẩm modal
- [ ] App: Hoàn trả modal
- [ ] App: Cài đặt (thông tin cửa hàng, cấu hình Zalo)
- [ ] App: Cảnh báo tồn kho thấp (badge + thông báo)
- [ ] Expo EAS Build → TestFlight + APK

### Phase 4 — Tương lai (chưa làm)
- [ ] AI tư vấn thông số KT (RAG từ PDF catalog nhà sản xuất)
- [ ] Lịch sử giá nhập biểu đồ chi tiết

---

## TRẠNG THÁI TRIỂN KHAI HIỆN TẠI

**Cập nhật:** 2026-05-26  
**Backend:** `e:\OwnProject\SaleMangementSystem\backend`  
**Mobile:** `e:\OwnProject\SaleMangementSystem\mobile`  
**UI demo:** `e:\OwnProject\SaleMangementSystem\prototypes\ui-demo`

### Đã hoàn thành và đã verify local
- Backend skeleton Express: `GET /health`, middleware security/body parser/CORS.
- Auth đơn giản bằng header `X-App-Key`, không login.
- Global error handler chuẩn hóa `ApiError`, `ZodError`, fallback `DB_ERROR`.
- Prisma schema 9 bảng ERD + `store_settings` validate/generate pass.
- Sửa seed/schema: `categories.name`, `suppliers.name` unique để `upsert` an toàn.
- Manual Supabase SQL đã cập nhật unique name index.
- API đã implement:
  - Products: list/detail/compare/create/update.
  - Categories: list/create.
  - Suppliers: list/create/update.
  - Settings: get/update, tự tạo default nếu thiếu.
  - Import Logs: get/create bằng Prisma transaction, tự cộng tồn kho.
  - Orders: list/detail/create/cancel/QR confirm bằng transaction trừ/cộng kho.
  - Returns: create bằng transaction validate qty hoàn, cộng kho, set order `returned`.
  - Reports: dashboard/revenue/inventory summary.
  - Upload: product image upload lên Supabase Storage bucket `product-images`.
  - Deploy config: `Procfile` và Railway start scripts đã được cấu hình local.

### Lệnh đã pass sau code gần nhất
```powershell
cd e:\OwnProject\SaleMangementSystem\backend
npm run typecheck
npm run build
npx prisma validate
npm run prisma:generate
```

### Đang chờ / chưa verify runtime
- Chưa chạy migrate/seed DB thật vì cần Supabase credentials thật và DB reachable.
- Các endpoint DB mới chỉ verify bằng TypeScript/build, chưa smoke test được với dữ liệu thật.
- Mobile app cần Expo Go/thiết bị thật để test runtime camera/navigation.
- Mobile package đang Expo SDK 56 trong khi quyết định ban đầu ghi SDK 51; xử lý riêng trước release nếu cần.
- AI Search đã code local nhưng cần `GEMINI_API_KEY`, Supabase thật, pgvector data để test E2E.
- Compare modal đã code local nhưng cần dữ liệu DB thật để test 2–3 sản phẩm cùng ngành.
- Zalo daily report cron + manual trigger đã code local; cần Zalo OA token/user_id thật để gửi thật.
- Embedding regenerate endpoint đã code local; cần DB thật + pgvector để upsert/test.
- Phase 4 performance/offline polish đã code local; cần Expo Go/thiết bị thật để test offline banner.

### Task tiếp theo
1. Tiếp tục Phase 5:
   - P5-T2 E2E test flows khi có DB thật.
   - P5-T3/P5-T4 EAS build khi user có account/thiết bị.
   - RUNBOOK đã tạo tại `RUNBOOK.md`.
2. Khi có credentials thật:
   - chạy migrate/seed Supabase.
   - smoke test toàn bộ API DB.
   - test AI `/api/v1/ai/search-by-image` với ảnh thật.
3. Sau mỗi cụm code phải chạy `npm run typecheck` và `npm run build`.
4. Cập nhật `IMPLEMENTATION_PLAN.md` và `HANDOFF.md` sau task.

---

## LƯU Ý QUAN TRỌNG CHO AGENT TIẾP THEO

1. **Không thêm login/auth** — đây là quyết định cứng của chủ
2. **Không dùng React (web)** — phải là React Native
3. **Không dùng C# / SQL Server / Firebase** — đã phân tích và loại
4. **Chi phí $0** — không đề xuất dịch vụ có phí
5. **Hóa đơn đã paid không được xóa** — chỉ hoàn trả
6. **AI Phase 2 là Gemini Flash** (không phải Pro — quá tốn)
7. **VietQR là static** — không tích hợp API ngân hàng
8. **SKU tự gán** — không có barcode scanner phần cứng
9. Đọc `docs/ERD.md` trước khi viết migration SQL
10. Đọc `docs/API_SPEC.md` trước khi viết backend route mới
11. **Luôn có kịch bản test sau khi code, đảm bảo không có lỗi**
12. **Luôn cập nhật `IMPLEMENTATION_PLAN.md`, `HANDOFF.md` sau khi hoàn thành task**

---

## THAM CHIẾU TÀI LIỆU ĐẦY ĐỦ

- Yêu cầu đầy đủ: `docs/SRS.md`
- Kiến trúc + tech stack: `docs/SAD.md`
- Database schema: `docs/ERD.md`
- API endpoints: `docs/API_SPEC.md`
- Màn hình mobile: `docs/MOBILE_SCREENS.md`
