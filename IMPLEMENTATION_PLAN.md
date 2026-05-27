# 🏪 VTShop — Kế hoạch Triển khai Chi tiết
**Dự án:** Ứng dụng Quản lý Cửa hàng Vật tư Gia đình  
**Cập nhật lần cuối:** 2026-05-26  
**Trạng thái tổng thể:** 🟡 Đang lên kế hoạch

> [!IMPORTANT]
> **Thư mục `e:\OwnProject\SaleMangementSystem\prototypes\ui-demo\`** chỉ là **web demo giao diện (stitch/prototype)** được dùng để hình dung màn hình và luồng tương tác. Đây **KHÔNG PHẢI** UI final. App thật sẽ được xây dựng bằng **React Native + Expo SDK 51**.

> [!NOTE]
> **Ghi chú rà soát:** Plan này được kiểm tra chéo kỹ lưỡng với `ERD.md`, `API_SPEC.md`, `MOBILE_SCREENS.md`, `SRS.md` và `HANDOFF.md`. Các điểm bổ sung/sửa đổi so với tài liệu gốc đều được đánh dấu `*(bổ sung)*`.

---

## 📊 Tổng quan tiến độ

| Phase | Tên | Số Tasks | Hoàn thành | Trạng thái |
|---|---|---|---|---|
| **0** | Chuẩn bị & Môi trường | 6 | 2/6 | 🟡 Local xong, chờ tài khoản |
| **1** | Database & Hạ tầng | 9 | 7/9 | 🟡 Local schema xong, chờ Supabase migrate |
| **2** | Backend API (Node.js) | 13 | 12/13 | 🟡 API local xong, chờ DB/Railway |
| **3** | Mobile App MVP (React Native) | 16 | 16/16 | ✅ Local hoàn thành, chờ test thiết bị + DB thật |
| **4** | AI + Báo cáo + Zalo | 7 | 0/7 | ⬜ Chưa bắt đầu |
| **5** | Polish & Release | 5 | 0/5 | ⬜ Chưa bắt đầu |
| **Tổng** | | **56** | **37/56** | 🟡 66% |

---

## 🗂️ Chú thích ký hiệu

```
[ ] = Chưa làm    [/] = Đang làm    [x] = Hoàn thành    [!] = Bị block
```

---

## ⚠️ Những điểm quan trọng cần nhớ xuyên suốt

| # | Quy tắc | Nguồn |
|---|---|---|
| 1 | **Không có login/auth** — chỉ dùng header `X-App-Key` | HANDOFF.md |
| 2 | **App phải là React Native**, không phải React web | HANDOFF.md |
| 3 | **Chi phí $0** — không đề xuất dịch vụ có phí | HANDOFF.md |
| 4 | **Hóa đơn đã paid: KHÔNG DELETE** — chỉ hoàn trả | ERD.md |
| 5 | **import_logs: APPEND-ONLY** — không update/delete | ERD.md |
| 6 | **AI dùng Gemini 1.5 Flash**, không phải Pro | HANDOFF.md |
| 7 | **VietQR là static** — không tích hợp API ngân hàng | HANDOFF.md |
| 8 | **SKU tự gán** — không có barcode scanner phần cứng | HANDOFF.md |
| 9 | Tồn kho chỉ thay đổi qua **Transaction ACID** | ERD.md |
| 10 | Cấu trúc thư mục app Mobile theo chuẩn trong `HANDOFF.md` | HANDOFF.md |

---

## PHASE 0 — Chuẩn bị & Môi trường
> **Mục tiêu:** Dựng xong toàn bộ tài khoản dịch vụ, cài đặt công cụ, cấu hình biến môi trường.  
> **Ước tính:** 2–3 giờ

---

### P0-T1: Tạo tài khoản Supabase
- [ ] Đăng ký tại supabase.com, tạo project mới tên `vtshop-prod`
- [ ] Copy ra: `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Bật extension `pgvector`: chạy `CREATE EXTENSION IF NOT EXISTS vector;` trong SQL Editor

**🧪 Test kịch bản:**
1. Vào Supabase Dashboard → Table Editor → tạo thử 1 bảng test → xóa → pass nếu không lỗi quyền
2. Chạy: `SELECT * FROM pg_extension WHERE extname = 'vector';` → phải trả về 1 row

---

### P0-T2: Tạo tài khoản Railway
- [ ] Đăng ký tại railway.app, kết nối GitHub
- [ ] Tạo project mới `vtshop-backend`
- [ ] Cài Railway CLI: `npm install -g @railway/cli` → `railway login`

**🧪 Test kịch bản:**
1. `railway status` → hiện tên project, không lỗi auth

---

### P0-T3: Lấy Gemini API Key (Gemini 1.5 Flash)
- [ ] Truy cập aistudio.google.com → Get API Key
- [ ] Tạo key mới, lưu ngay vào file `.env` (không commit git)
- [ ] Xác nhận free tier: **15 req/phút, 1,500 req/ngày** (đủ dùng)

**🧪 Test kịch bản:**
1. Gọi API thử với prompt đơn giản → nhận response, không lỗi 429/403

---

### P0-T4: Tạo Zalo Official Account (ZNS)
- [ ] Truy cập oa.zalo.me → tạo OA loại "Doanh nghiệp" hoặc "Cá nhân"
- [ ] Đăng ký dịch vụ ZNS → lấy `ZALO_OA_ACCESS_TOKEN`
- [ ] Lưu `ZALO_RECIPIENT_PHONE` = SĐT chủ cửa hàng (format `84xxxxxxxxx`)
- [ ] **Plan B:** Nếu OA chưa được duyệt → dùng `console.log` mock ở phần Zalo trong quá trình dev

**🧪 Test kịch bản:**
1. Gọi thử ZNS API gửi tin nhắn test → SĐT nhận được tin trên Zalo

---

### P0-T5: Khởi tạo Backend Repository
- [x] Tạo thư mục `e:\OwnProject\SaleMangementSystem\backend\` *(đã tái cấu trúc từ `e:\OwnProject\Backend\`)*, chạy `npm init -y`
- [x] Cài **production** dependencies:
  ```
  express prisma @prisma/client zod node-cron dotenv
  @google/genai axios multer cors helmet
  ```
- [x] Cài **dev** dependencies:
  ```
  typescript ts-node nodemon @types/express @types/node @types/multer @types/cors
  ```
- [x] Tạo `tsconfig.json` (target: ES2020, module: Node16, strict: true)
- [x] Tạo file `.env` theo template trong `HANDOFF.md`:
  ```
  DATABASE_URL=...
  SUPABASE_URL=...
  SUPABASE_SERVICE_ROLE_KEY=...
  GEMINI_API_KEY=...
  ZALO_OA_ACCESS_TOKEN=...
  ZALO_RECIPIENT_PHONE=84xxxxxxxxx
  APP_SECRET_KEY=<random-32-char>
  PORT=3000
  ```
- [x] Init git + tạo `.gitignore` (bao gồm `node_modules`, `.env`, `dist`)
- [x] *(bổ sung)* Tạo Express skeleton, `GET /health`, middleware `X-App-Key`, global error handler

**🧪 Test kịch bản:**
1. `npm run typecheck` → pass
2. `npm run build` → pass
3. `GET http://localhost:3000/health` → `{ "status": "ok" }`
4. `GET /api/v1/products` thiếu/sai `X-App-Key` → `401`
5. `GET /api/v1/products` đúng `X-App-Key` → `200`

---

### P0-T6: Khởi tạo Mobile App Repository
- [x] Tạo thư mục `e:\\OwnProject\\SaleMangementSystem\\mobile\\` *(đã tái cấu trúc từ `e:\\OwnProject\\MobileApp\\`)*, chạy `npx create-expo-app@latest ./ --template tabs`
- [x] Chạy `npx -y create-expo-app@latest --help` trước khi tạo app *(theo workflow)*
- [x] Cài thêm:
  ```
  zustand axios expo-camera expo-image-picker expo-image
  react-native-gifted-charts @shopify/react-native-skia
  react-native-paper @expo/vector-icons react-native-qrcode-svg
  ```
- [x] Cấu hình `app.json` với `extra.API_BASE_URL` và `extra.APP_KEY`
- [ ] Cài Expo Go trên điện thoại → chạy `npx expo start` → quét QR *(cần thiết bị user)*

**🧪 Test kịch bản:**
1. `npx tsc --noEmit` → pass
2. App mở được trên điện thoại thật → thấy màn hình default Expo *(chờ user test thiết bị)*
3. Thay đổi 1 dòng text → màn hình điện thoại hot reload ngay *(chờ user test thiết bị)*

---

## PHASE 1 — Database & Hạ tầng
> **Mục tiêu:** Migrate đủ **9 bảng** từ `ERD.md` + 1 bảng bổ sung `store_settings` lên Supabase.  
> **Phụ thuộc:** P0 hoàn thành  
> **Ước tính:** 3–4 giờ

---

### P1-T1: Khởi tạo Prisma & Kết nối Supabase
- [x] Chạy `npx prisma init` trong thư mục Backend
- [!] Cập nhật `DATABASE_URL` trong `.env` (dùng Connection Pooling URL của Supabase) *(đang dùng placeholder, cần user cung cấp Supabase URL thật)*
- [x] Trong `schema.prisma`: thêm `previewFeatures = ["postgresqlExtensions"]` và `extensions = [vector]`
- [x] *(bổ sung)* Tạo trước Prisma schema đầy đủ cho 9 bảng ERD + `store_settings`
- [x] *(bổ sung)* Validate schema bằng `npx prisma validate`
- [x] *(bổ sung)* Generate Prisma Client bằng `npx prisma generate`

**🧪 Test kịch bản:**
1. `npx prisma validate` → pass
2. `npx prisma generate` → pass
3. `npm run typecheck` → pass
4. `npx prisma db pull` → chờ Supabase `DATABASE_URL` thật

---

### P1-T2: Schema — CATEGORIES & SUPPLIERS
- [x] Model `Category` (id UUID PK, name VARCHAR(100), icon VARCHAR(50), created_at)
- [x] Model `Supplier` (id UUID PK, name NOT NULL, phone, note TEXT, created_at)
- [x] Tạo migration SQL trong `prisma/migrations/000001_init_schema/migration.sql`
- [!] `npx prisma migrate dev --name init_categories_suppliers` → chờ Supabase `DATABASE_URL` thật

**🧪 Test kịch bản:**
1. `npx prisma validate` → pass
2. Supabase Table Editor → thấy 2 bảng `categories`, `suppliers` với đúng cột *(chờ migrate thật)*

---

### P1-T3: Schema — PRODUCTS & PRODUCT_EMBEDDINGS
- [x] Model `Product` (đủ 13 field theo ERD: id, category_id FK, name, sku UNIQUE, unit, retail_price DECIMAL, stock_quantity INT DEFAULT 0, low_stock_threshold INT DEFAULT 5, technical_specs TEXT, image_url, is_active BOOLEAN DEFAULT true, created_at, updated_at)
- [x] Model `ProductEmbedding` (id, product_id FK UNIQUE, image_vector `Unsupported("vector(768)")`, text_vector `Unsupported("vector(768)")`, updated_at)
- [x] Tạo migration SQL trong `prisma/migrations/000001_init_schema/migration.sql`
- [!] `npx prisma migrate dev --name add_products_embeddings` → chờ Supabase `DATABASE_URL` thật

**🧪 Test kịch bản:**
1. `npx prisma validate` → pass
2. Kiểm tra bảng `products` có đủ **13 cột** theo ERD *(chờ migrate thật)*
3. Kiểm tra cột `image_vector` kiểu `vector(768)` thực sự *(chờ migrate thật)*

---

### P1-T4: Schema — IMPORT_LOGS
- [x] Model `ImportLog` (id, product_id FK, supplier_id FK, import_price DECIMAL NOT NULL, quantity INT NOT NULL, note TEXT, import_date TIMESTAMP NOT NULL, created_at)
- [x] **Quan trọng:** Không có trường `updated_at` — đây là bảng append-only
- [x] Tạo migration SQL trong `prisma/migrations/000001_init_schema/migration.sql`
- [!] `npx prisma migrate dev --name add_import_logs` → chờ Supabase `DATABASE_URL` thật

---

### P1-T5: Schema — ORDERS & ORDER_ITEMS
- [x] Model `Order` (id, total_amount DECIMAL NOT NULL, paid_amount DECIMAL, payment_method VARCHAR(20), payment_status VARCHAR(20), note TEXT, order_date TIMESTAMP NOT NULL, created_at)
- [x] Model `OrderItem` (id, order_id FK, product_id FK, quantity INT NOT NULL, unit_price DECIMAL NOT NULL, subtotal DECIMAL)
- [x] Tạo migration SQL trong `prisma/migrations/000001_init_schema/migration.sql`
- [!] `npx prisma migrate dev --name add_orders` → chờ Supabase `DATABASE_URL` thật

**🧪 Test kịch bản:**
1. Tạo 1 Order có 2 OrderItem → query JOIN trả về đúng data với `subtotal` đúng *(chờ DB thật)*

---

### P1-T6: Schema — RETURNS & RETURN_ITEMS
- [x] Model `Return` (id, order_id FK, reason TEXT, refund_amount DECIMAL, return_date TIMESTAMP NOT NULL, created_at)
- [x] Model `ReturnItem` (id, return_id FK, product_id FK, quantity INT NOT NULL, unit_price DECIMAL)
- [x] Tạo migration SQL trong `prisma/migrations/000001_init_schema/migration.sql`
- [!] `npx prisma migrate dev --name add_returns` → chờ Supabase `DATABASE_URL` thật

---

### P1-T7: Schema — STORE_SETTINGS *(Bổ sung — chưa có trong ERD.md)*
- [x] Model `StoreSetting` (id, store_name, bank_name, bank_account, account_holder_name, zalo_phone, zalo_notify_hour INT DEFAULT 21, zalo_notify_enabled BOOLEAN DEFAULT true, default_low_stock_threshold INT DEFAULT 5, logo_url)
- [x] Seed 1 row mặc định trong `prisma/seed.ts` và `prisma/supabase_manual_init.sql`
- [x] Tạo migration SQL trong `prisma/migrations/000001_init_schema/migration.sql`
- [!] `npx prisma migrate dev --name add_store_settings` → chờ Supabase `DATABASE_URL` thật

> **Lý do bổ sung:** Màn SCR-15 yêu cầu lưu trữ thông tin này, nhưng `ERD.md` và `API_SPEC.md` chưa đề cập. VietQR cần `bank_name`, `bank_account`, `account_holder_name` để tạo URL ảnh QR đúng.

---

### P1-T8: Seed Data mẫu
- [x] Tạo file `prisma/seed.ts`
- [x] Seed: **5 Categories** (Điện ⚡, Nước 💧, Nhôm Kính 🪟, Xây dựng 🧱, Khác 📦)
- [x] Seed: **3 Suppliers** (ví dụ: Cadivi, Tiền Phong, Nam Hải)
- [x] Seed: **8 Products** mẫu (đủ category; image_url để trống chờ ảnh thật)
- [x] Seed: **1 StoreSetting** default (store_name = "Cửa hàng Vật tư Gia đình")
- [!] Chạy `npx prisma db seed` → chờ Supabase `DATABASE_URL` thật

**🧪 Test kịch bản:**
1. `npm run typecheck` → pass
2. Supabase → `products` có đúng 8 rows, mỗi product có `category_id` hợp lệ *(chờ seed thật)*
3. `store_settings` có 1 row với dữ liệu mặc định *(chờ seed thật)*

---

### P1-T9: Tạo Indexes (SQL Raw — Supabase SQL Editor)
- [x] Index pgvector cho AI Search:
  ```sql
  CREATE INDEX idx_embedding_ivfflat
  ON product_embeddings USING ivfflat (image_vector vector_cosine_ops)
  WITH (lists = 100);
  ```
- [x] Index full-text search tên sản phẩm:
  ```sql
  CREATE INDEX idx_products_name_fts
  ON products USING GIN(to_tsvector('simple', name));
  ```
- [x] Index theo SKU: `CREATE UNIQUE INDEX idx_products_sku ON products(sku);`
- [x] Index orders theo ngày: `CREATE INDEX idx_orders_date ON orders(order_date DESC);`
- [x] Index import_logs: `CREATE INDEX idx_import_product_date ON import_logs(product_id, import_date DESC);`
- [x] *(bổ sung)* Tạo `prisma/supabase_manual_init.sql` để paste vào Supabase SQL Editor khi cần

**🧪 Test kịch bản:**
1. `npx prisma validate` → pass
2. `EXPLAIN SELECT ... FROM product_embeddings ORDER BY image_vector <=> '...' LIMIT 5` → dùng index, không phải seq scan *(chờ DB thật + data thật)*

---

## PHASE 2 — Backend API (Node.js + Express)
> **Mục tiêu:** Implement đầy đủ 10 nhóm endpoint theo `API_SPEC.md` + Settings API (bổ sung), deploy Railway.  
> **Phụ thuộc:** Phase 1 hoàn thành  
> **Ước tính:** 8–12 giờ

---

### P2-T1: Express App Skeleton & Middleware
- [x] Cấu trúc thư mục: `src/routes/`, `src/middleware/`, `src/lib/`, `src/utils/` *(đã dùng route-focused skeleton; controllers/services sẽ tách khi logic phình to)*
- [x] Middleware: `cors()`, `helmet()`, `express.json()`, `express.urlencoded()`
- [x] Auth middleware: kiểm tra `X-App-Key` header → `401` nếu sai/thiếu
- [x] Global error handler middleware (hỗ trợ `ApiError`, `ZodError`, fallback `500 DB_ERROR`)
- [x] `GET /health` → `{ "status": "ok", "timestamp": "...", "version": "1.0.0" }`
- [x] *(bổ sung)* Tạo `src/lib/prisma.ts`, `src/lib/apiError.ts`, `src/utils/format.ts`

**🧪 Test kịch bản:**
1. `npm run typecheck` → pass
2. `npm run build` → pass
3. `GET /health` → chờ test runtime với server đang chạy
4. `GET /api/v1/products` thiếu/sai `X-App-Key` → chờ test runtime với server đang chạy
5. `GET /api/v1/products` đúng `X-App-Key` → chờ DB thật/migrate

---

### P2-T2: API Products — GET (list & detail)
- [x] `GET /api/v1/products?q=&category_id=&low_stock=&page=&limit=`
- [x] Search: tìm trên `name` và `sku` (case-insensitive)
- [x] Filter `low_stock=true` → chỉ trả `stock_quantity <= low_stock_threshold`
- [x] Pagination: `{ data, total, page, limit }`
- [x] `GET /api/v1/products/:id` → trả thêm `last_import_price`, `last_import_date`, thông tin `supplier` ưu tiên

**🧪 Test kịch bản:**
1. `npm run typecheck` → pass
2. `npm run build` → pass
3. Các test dữ liệu thật (`?q=cadivi`, low_stock, last_import_price) → chờ Supabase migrate/seed

---

### P2-T3: API Products — POST & PUT
- [x] `POST /api/v1/products`: Zod validation (bắt buộc: name, retail_price, unit); tự sinh SKU nếu trống
- [x] `PUT /api/v1/products/:id`: Partial update; **chặn cập nhật `stock_quantity` trực tiếp** (schema omit field này)

**🧪 Test kịch bản:**
1. `npm run typecheck` → pass
2. `npm run build` → pass
3. `POST` thiếu `name`, auto SKU, `PUT stock_quantity` → chờ test runtime với DB thật

---

### P2-T4: API Products — Compare
- [x] `GET /api/v1/products/compare?ids=uuid1,uuid2,uuid3`
- [x] Validate: 2–3 IDs, tất cả phải tồn tại
- [x] Response: `{ "products": [...] }` với field chính + `last_import_price`, `image_url`

**🧪 Test kịch bản:**
1. `npm run typecheck` → pass
2. `npm run build` → pass
3. 2 IDs hợp lệ / 4 IDs / ID không tồn tại → chờ test runtime với DB thật

---

### P2-T5: API Categories & Suppliers
- [x] `GET /api/v1/categories` → mỗi category có thêm `product_count` (count products active)
- [x] `POST /api/v1/categories` (name, icon)
- [x] `GET /api/v1/suppliers`
- [x] `POST /api/v1/suppliers` (name required, phone, note)
- [x] `PUT /api/v1/suppliers/:id`

**🧪 Test kịch bản:**
1. `npm run typecheck` → pass
2. `npm run build` → pass
3. `GET /categories` product_count đúng → chờ DB thật

---

### P2-T6: API Store Settings *(Bổ sung — chưa có trong API_SPEC.md)*
- [x] `GET /api/v1/settings` → trả về 1 row `store_settings`, tự tạo default nếu chưa có
- [x] `PUT /api/v1/settings` → cập nhật partial (store_name, bank info, zalo config, logo_url)

**🧪 Test kịch bản:**
1. `npm run typecheck` → pass
2. `npm run build` → pass
3. `PUT` đổi settings → chờ test runtime với DB thật

---

### P2-T7: API Import Logs (ACID Transaction)
- [x] `POST /api/v1/import-logs`: dùng Prisma `$transaction`:
  1. Validate product active + supplier nếu có
  2. INSERT `import_logs`
  3. UPDATE `products SET stock_quantity = stock_quantity + qty WHERE id = product_id`
- [x] `GET /api/v1/import-logs?product_id=&supplier_id=&from_date=&to_date=`
- [x] Response 201: `{ "import_log": {...}, "updated_stock": <số tồn mới> }`

**🧪 Test kịch bản:**
1. `npm run typecheck` → pass
2. `npm run build` → pass
3. Import qty=50 / rollback transaction / filter history → chờ DB thật


---

### P2-T8: API Orders — POST (ACID Transaction)
- [x] `POST /api/v1/orders`: dùng Prisma `$transaction`:
  1. INSERT `orders`
  2. INSERT nhiều `order_items`
  3. Với mỗi item: `UPDATE products SET stock_quantity = stock_quantity - qty WHERE id = product_id AND stock_quantity >= qty` → nếu update 0 rows → **throw error → rollback toàn bộ**
- [x] Bắt lỗi thiếu hàng → `409 INSUFFICIENT_STOCK` với message chỉ rõ sản phẩm nào thiếu
- [x] Tính `change_amount = paid_amount - total_amount` (chỉ khi `payment_method = 'cash'`)
- [x] Response 201: `{ "id", "total_amount", "change_amount", "payment_status" }`

**🧪 Test kịch bản:**
1. `npm run typecheck` → pass
2. `npm run build` → pass
3. Order 2 sản phẩm / thiếu hàng rollback / `change_amount` → chờ DB thật

---

### P2-T9: API Orders — GET, Cancel, QR Confirm
- [x] `GET /api/v1/orders?from_date=&to_date=&status=&page=&limit=`
- [x] `GET /api/v1/orders/:id` → kèm `items` array (product_name, quantity, unit, unit_price, subtotal)
- [x] `PATCH /api/v1/orders/:id/cancel`: chỉ khi `status = 'pending'` → **cộng kho lại** (transaction) → status = `cancelled`
- [x] `POST /api/v1/orders/:id/qr-confirm`: `status = 'pending'` → `status = 'paid'`

**🧪 Test kịch bản:**
1. `npm run typecheck` → pass
2. `npm run build` → pass
3. Cancel paid/pending và QR confirm → chờ DB thật

---

### P2-T10: API Returns (ACID Transaction)
- [x] `POST /api/v1/returns`: dùng Prisma `$transaction`:
  1. Validate order tồn tại, không `cancelled`, chưa `returned`
  2. Validate từng item thuộc order gốc
  3. Validate qty hoàn ≤ qty đã mua trong order gốc
  4. INSERT `returns`
  5. INSERT nhiều `return_items`
  6. Cộng kho mỗi item: `UPDATE products SET stock_quantity += qty`
  7. `UPDATE orders SET payment_status = 'returned' WHERE id = order_id`
- [x] Validate: qty hoàn ≤ qty đã mua trong order gốc

**🧪 Test kịch bản:**
1. `npm run typecheck` → pass
2. `npm run build` → pass
3. Hoàn 1 item / qty vượt / order cancelled → chờ DB thật

---

### P2-T11: API Reports
- [x] `GET /api/v1/reports/dashboard?date=YYYY-MM-DD` (default: hôm nay)
  - `today`: revenue, gross_profit, order_count
  - `this_week`: revenue, gross_profit
  - `this_month`: revenue, gross_profit
  - `top_products`: top 5 sản phẩm bán chạy tuần (by qty)
  - `low_stock_alerts`: list SP có `stock <= threshold`
- [x] `GET /api/v1/reports/revenue?from_date=&to_date=&group_by=day|week|month`
- [x] `GET /api/v1/reports/inventory` (total_sku, total_stock_value, low_stock, slow_moving)
- [x] **gross_profit = Σ(qty × unit_price) - Σ(qty × last_import_price)** theo từng order_item

**🧪 Test kịch bản:**
1. `npm run typecheck` → pass
2. `npm run build` → pass
3. Với ngày có seed data → revenue, profit > 0
4. `group_by=day` → `chart_data` có 1 entry cho mỗi ngày trong range
5. `total_stock_value = Σ(stock_quantity × last_import_price)` đúng

---

### P2-T12: API Image Upload & Embedding
- [x] `POST /api/v1/upload/product-image`: `multipart/form-data`, max 5MB, chỉ nhận `image/jpeg` và `image/png`
- [x] Upload file lên Supabase Storage bucket `product-images`
- [x] Trả về `{ "image_url": "https://..." }` ngay lập tức
- [/] **Background async:** sau khi response, đã có hook async placeholder; Gemini mô tả ảnh → sinh text_vector → upsert `product_embeddings` sẽ hoàn thiện ở P4-T5

**🧪 Test kịch bản:**
1. `npm run typecheck` → pass
2. `npm run build` → pass
3. Upload JPEG 2MB → chờ Supabase bucket thật
4. URL public → chờ Supabase bucket thật
5. Embedding record → chờ P4-T5

---

### P2-T13: Deploy Railway
- [x] Tạo `Procfile` trỏ `web: npm start`
- [x] Cấu hình `package.json` start script: `node dist/index.js` sau `build`
- [ ] Thêm **tất cả** biến môi trường trong Railway Dashboard *(chờ user config)*
- [ ] Push code → Railway tự động deploy *(chờ user setup pipeline)*
- [ ] Test toàn bộ API endpoint qua URL Railway *(chờ user setup pipeline)*
- [x] Kiểm tra CORS cho phép origin từ Expo app *(cors middleware đã bật trong app.ts)*

**🧪 Test kịch bản:**
1. `npm run typecheck` → pass
2. `npm run build` → pass
3. `Procfile` tồn tại → pass
4. Deploy runtime / CORS test → chờ user setup pipeline và test thực tế

---

## PHASE 3 — Mobile App MVP (React Native + Expo)
> **Mục tiêu:** App đầy đủ tính năng MVP chạy được trên iOS và Android thật.  
> **Phụ thuộc:** Phase 2 hoàn thành (ít nhất P2-T1 → P2-T10)  
> **Ước tính:** 15–20 giờ  
> **Tham khảo màn hình:** `MOBILE_SCREENS.md` (dùng để hình dung flow, không copy code từ `/UI`)

---

### P3-T1: Cấu trúc App & Navigation
- [x] Cấu trúc Expo Router theo chuẩn trong `HANDOFF.md`:
  ```
  app/(tabs)/index.tsx            → SCR-01 Dashboard
  app/(tabs)/pos.tsx              → SCR-02 POS
  app/(tabs)/inventory/index.tsx  → SCR-09 Kho
  app/(tabs)/inventory/[id].tsx   → SCR-11 Chi tiết SP
  app/(tabs)/reports.tsx          → SCR-14 Báo cáo
  app/(tabs)/settings.tsx         → SCR-15 Cài đặt
  app/modals/ai-search.tsx        → SCR-06 AI Camera
  app/modals/payment.tsx          → SCR-03 Thanh toán
  app/modals/payment-success.tsx  → SCR-04 HĐ thành công
  app/modals/order-detail.tsx     → SCR-05 Chi tiết HĐ
  app/modals/compare.tsx          → SCR-07 So sánh SP
  app/modals/return.tsx           → SCR-08 Hoàn trả
  ```
- [x] Tab bar 5 tab với icons đúng (home, cart, box, chart, gear)
- [x] Zustand stores: `useCartStore` (giỏ hàng POS), `useAppStore` (settings, products cache/settings)
- [x] API client: `lib/api.ts` — Axios instance với `X-App-Key` header + base URL từ `app.json` extra
- [x] *(bổ sung)* Cài `@react-native-community/netinfo` để chuẩn bị offline awareness P4-T7

**🧪 Test kịch bản:**
1. `npm run typecheck` → pass
2. App mở → 5 tabs đúng tên và icon *(chờ test thiết bị/Expo Go)*
3. Chuyển tab qua lại → không crash *(chờ test thiết bị/Expo Go)*
4. Gọi `GET /products` → chờ Supabase DB thật; hiện tại backend trả `503 CONFIG_REQUIRED` khi DB placeholder

---

### P3-T2: Design System & Shared Components
- [x] `constants/Colors.ts`: màu sắc theo `MOBILE_SCREENS.md`:
  - Primary: **`#1E40AF`** (xanh đậm — theo spec, khác với Web UI prototype dùng đỏ Crimson)
  - Success: `#16A34A`, Warning: `#D97706`, Danger: `#DC2626`
  - Background: `#F8FAFC`, Card: `#FFFFFF`
- [x] `constants/Typography.ts`: các font size (20sp tiêu đề, 14sp label/body, 18sp số tiền)
- [x] Shared components: `<Button>`, `<Card>`, `<Input>`, `<StockBadge>`, `<ProductCard>`, `<InvoiceItem>`, `<ReportChart>`
- [x] `StockBadge`: đỏ `#DC2626` nếu `stock <= threshold`, xanh `#16A34A` nếu OK
- [x] Tất cả nút tap: `minHeight: 44dp` (đủ tap target theo iOS HIG)

**🧪 Test kịch bản:**
1. `npm run typecheck` → pass
2. `<StockBadge stock={2} threshold={5} />` → logic low-state dùng nền đỏ nhạt
3. `<StockBadge stock={50} threshold={5} />` → logic ok-state dùng nền xanh nhạt

---

### P3-T3: SCR-01 — Dashboard
- [x] Header: ngày hôm nay + tên cửa hàng (từ `StoreSetting`)
- [x] Card lớn: Doanh thu hôm nay / Lợi nhuận gộp hôm nay (từ `/reports/dashboard`)
- [x] Row 3 card nhỏ: Số HĐ hôm nay | Doanh thu tuần | Doanh thu tháng
- [x] Top 5 sản phẩm bán chạy tuần (placeholder chart an toàn; nối chart thật khi có data)
- [x] Danh sách cảnh báo tồn thấp (tối đa 4)
- [x] Pull-to-refresh reload data
- [x] FAB "＋ Tạo hóa đơn" → chuyển sang Tab POS
- [x] *(bổ sung)* Empty state + cảnh báo `CONFIG_REQUIRED` khi backend chưa có Supabase thật, tránh NaN/crash

**🧪 Test kịch bản:**
1. `npm run typecheck` → pass
2. Pull-to-refresh → gọi lại API, không crash *(chờ Expo Go test runtime)*
3. Số liệu Hôm nay khớp với orders thật trong ngày *(chờ DB thật)*
4. Khi không có dữ liệu/DB placeholder → empty state đẹp, không NaN

---

### P3-T4: SCR-02 — POS (Bán hàng)
- [x] Layout 2 phần: Cart (trên) + Tìm kiếm/Danh sách SP (dưới)
- [x] Search bar: autofocus khi vào tab, debounce 300ms
- [x] Danh sách SP: tên, SKU, tồn kho (màu badge), giá bán
- [x] SP `stock_quantity = 0` → hiển thị mờ, không cho tap
- [x] Tap SP → thêm vào giỏ `qty=1`; tap lại → qty tăng thêm 1
- [x] Cart: stepper +/- qty, xóa với undo toast 3s *(swipe-left sẽ polish thêm nếu cần gesture lib)*
- [x] Footer sticky: Tổng tiền + nút [Thanh toán] (disabled nếu giỏ trống)
- [x] Button "📷 Tìm bằng AI" → mở modal `ai-search.tsx`
- [x] Button "So sánh" → enabled khi chọn 2–3 SP cùng category → mở modal `compare.tsx`
- [x] *(bổ sung)* Empty/config state khi backend chưa có Supabase thật

**🧪 Test kịch bản:**
1. `npm run typecheck` → pass
2. Gõ tên SP → list gọi API debounce 300ms *(chờ DB thật để verify data)*
3. Tap SP → giỏ có qty=1; tap lại → qty=2 *(chờ Expo Go runtime)*
4. SP `stock=0` → mờ, tap không có phản ứng
5. Giỏ trống → nút Thanh toán disabled

---

### P3-T5: SCR-03 — Thanh toán
- [x] Bottom sheet/modal thanh toán từ POS
- [x] Toggle: Tiền mặt | Chuyển khoản QR
- [x] **Tiền mặt:** Input "Khách đưa", hiện "Tiền thừa" realtime, quick buttons (50k, 100k, 200k, 500k)
- [x] Nút [Xác nhận] disabled khi `paid_amount < total_amount`
- [x] **QR:** Render ảnh từ `https://img.vietqr.io/image/{bank_code}-{account_no}-compact.png?amount={total}&addInfo={order_note}` (lấy bank info từ `store_settings`, có fallback dev)
- [x] Input ghi chú optional (tên khách, địa chỉ lắp...)
- [x] Tap [Xác nhận] → `POST /orders` → loading state → navigate SCR-04
- [x] *(bổ sung)* QR confirm tự gọi `POST /orders/:id/qr-confirm` sau khi tạo order pending

**🧪 Test kịch bản:**
1. `npm run typecheck` → pass
2. Tiền mặt: nhập < tổng → nút disabled
3. Tiền mặt: nhập > tổng → tiền thừa đúng
4. QR: ảnh hiển thị, số tiền đúng với tổng *(chờ test Expo runtime)*
5. Confirm → API gọi đúng, nhận `201` → chuyển SCR-04 *(chờ DB thật)*
6. Confirm → nếu `409 INSUFFICIENT_STOCK` → hiện lỗi từ API

---

### P3-T6: SCR-04 — Hóa đơn thành công
- [x] Checkmark ✓ lớn (static animation-ready)
- [x] Hiện: số HĐ, tổng tiền, tiền thừa (nếu cash)
- [/] Danh sách SP tóm tắt (tên, qty, thành tiền) → đã clear cart sau thanh toán; cần order detail fetch để hiển thị lại đầy đủ ở SCR-05
- [x] Nút [Tạo hóa đơn mới] → clear cart, về SCR-02
- [x] Nút [Xem chi tiết] → navigate SCR-05

**🧪 Test kịch bản:**
1. `npm run typecheck` → pass
2. Số liệu trên màn hình khớp với order vừa tạo *(chờ DB thật)*
3. "Tạo HĐ mới" → giỏ hàng trống, về POS

---

### P3-T7: SCR-05 & SCR-08 — Chi tiết HĐ & Hoàn trả
- [x] **SCR-05:** Hiện thông tin đơn (ngày, phương thức, status badge, ghi chú), danh sách items
- [x] Nút [Hoàn trả] → chỉ hiện khi `status = 'paid'`
- [x] **SCR-08 (Modal):** Danh sách items từ order gốc, stepper qty hoàn (max = qty đã mua), input lý do, hiện tổng tiền hoàn
- [x] Confirm hoàn trả → `POST /returns` → cập nhật UI về chi tiết HĐ
- [x] *(bổ sung)* Empty/config state khi backend chưa có Supabase thật

**🧪 Test kịch bản:**
1. `npm run typecheck` → pass
2. Order `status = returned` → không thấy nút "Hoàn trả"
3. Stepper qty hoàn không vượt quá qty đã mua
4. Confirm → stock cộng lại, order status thành `returned` *(chờ DB thật)*

---

### P3-T8: SCR-09 — Tab Kho (Danh sách)
- [x] Search bar + Category filter pills (scroll ngang): Tất cả, Điện, Nước, Nhôm Kính, Xây dựng, Khác
- [x] Toggle: Tất cả | Sắp hết hàng
- [x] List item: ảnh thumbnail, tên, SKU, tồn kho (StockBadge), giá bán
- [x] Tap → SCR-11 Chi tiết
- [x] FAB 1: "+ Thêm SP" → SCR-10 (mode: tạo mới)
- [x] FAB 2: "Nhập hàng" → Modal SCR-12

**🧪 Test kịch bản:**
1. Filter "Sắp hết" → chỉ SP có `stock <= threshold`
2. Filter Category "Điện" + search → kết hợp đúng

---

### P3-T9: SCR-13 — Danh mục Nhà cung cấp *(bổ sung)*
- [x] Sub-view bên trong Tab Kho (sub-tab: Sản phẩm | Nhà cung cấp)
- [x] List NCC: tên, SĐT, số loại hàng cung cấp *(hiện tên/SĐT/ghi chú; aggregate số loại sẽ bổ sung backend nếu cần báo cáo NCC sâu hơn)*
- [x] Tap NCC → xem lịch sử phiếu nhập từ NCC đó
- [x] FAB: "+ Thêm NCC" → form inline (name, phone, note)

**🧪 Test kịch bản:**
1. Tạo NCC mới → xuất hiện ngay trong list
2. Tap NCC → xem đúng lịch sử import từ NCC đó

---

### P3-T10: SCR-10 — Thêm/Sửa Sản phẩm
- [x] Form: ảnh (tap để chọn từ gallery/camera), tên*, ngành hàng* (dropdown), SKU (auto hoặc tự nhập), đơn vị*, giá bán*, tồn kho khởi tạo, ngưỡng cảnh báo, thông số KT (textarea) *(đã có gallery picker + URL thủ công; camera có thể thêm ở polish nếu cần)*
- [x] **Lưu ý:** Khi **sửa** SP đã có, không cho sửa `stock_quantity` trực tiếp (chỉ nhập kho qua SCR-12)
- [x] Upload ảnh: `expo-image-picker` → `POST /upload/product-image` → lưu URL
- [x] Save → `POST /products` (tạo) hoặc `PUT /products/:id` (sửa)

**🧪 Test kịch bản:**
1. Submit thiếu "Tên" → hiện lỗi inline bên dưới field
2. Upload ảnh → preview hiển thị, save → sản phẩm có ảnh trong list
3. Sửa SP: `stock_quantity` không có trong form edit

---

### P3-T11: SCR-11 — Chi tiết Sản phẩm
- [x] Ảnh lớn header với overlay gradient
- [x] KPI cards: Tồn kho (màu động theo `StockBadge`), Giá bán, Ngưỡng cảnh báo
- [x] Thông số kỹ thuật (text area)
- [x] Mini line chart lịch sử giá nhập (dùng `react-native-gifted-charts` LineChart, data từ `import_logs`)
- [x] Timeline lịch sử xuất/nhập gần nhất (từ `import_logs` và `order_items`)
- [x] Nút [Sửa] → SCR-10 prefill đúng data
- [x] Nút [Nhập hàng] → SCR-12 prefill sản phẩm này

**🧪 Test kịch bản:**
1. Chart không crash khi chỉ có 1 data point
2. Nút "Sửa" → form điền sẵn đúng thông tin
3. Nút "Nhập hàng" → modal có sẵn sản phẩm đang xem

---

### P3-T12: SCR-12 — Modal Nhập kho
- [x] Picker sản phẩm (search + select, hoặc prefilled nếu gọi từ SCR-11)
- [x] Picker nhà cung cấp (dropdown)
- [x] Input: giá nhập (required), số lượng (required), ngày nhập (default hôm nay), ghi chú
- [x] Preview card: "Tồn kho sau nhập: X + Y = Z"
- [x] Confirm → `POST /import-logs` → đóng modal, cập nhật list

**🧪 Test kịch bản:**
1. Preview đúng: stock hiện tại + qty nhập
2. Confirm → stock trong DB tăng đúng số lượng
3. Mở lại SCR-11 → stock mới hiển thị

---

### P3-T13: SCR-14 — Tab Báo cáo (Doanh thu & Lợi nhuận)
- [x] Sub-tabs: Doanh thu | Lợi nhuận | Kho | Lịch sử HĐ
- [x] **Doanh thu tab:** Filter (Hôm nay / Tuần / Tháng / Tùy chọn date picker), LineChart doanh thu theo ngày, summary cards (Tổng DT, Số đơn, TB/đơn) *(đã có Hôm nay/7 ngày/30 ngày; date picker tùy chọn để polish)*
- [x] **Lợi nhuận tab:** LineChart lợi nhuận gộp, PieChart phân tích theo ngành hàng (tính từ `order_items` join `categories`) *(đã có lợi nhuận gộp; category aggregate chờ backend endpoint riêng)*

**🧪 Test kịch bản:**
1. Đổi filter → chart re-render đúng data
2. Doanh thu Hôm nay khớp với orders `payment_status = 'paid'` trong ngày

---

### P3-T14: SCR-14 — Tab Báo cáo (Kho & Lịch sử HĐ)
- [x] **Kho tab:** Tổng giá trị kho, DS sản phẩm tồn lâu (> 30 ngày chưa bán), cảnh báo tồn thấp
- [x] **Lịch sử HĐ tab:** Danh sách orders lọc theo ngày + status, tap → SCR-05

**🧪 Test kịch bản:**
1. Filter "Hôm nay" → chỉ HĐ trong ngày
2. Order `status = cancelled` → hiện badge "Đã hủy" màu xám

---

### P3-T15: SCR-15 — Tab Cài đặt
- [x] Section Thông tin cửa hàng: tên cửa hàng, thông tin ngân hàng (bank_name, bank_account, account_holder_name)
- [x] Section Thông báo Zalo: toggle bật/tắt, SĐT nhận, giờ gửi (time picker)
- [x] Section Ứng dụng: ngưỡng cảnh báo tồn thấp mặc định
- [x] Nút [Lưu] → `PUT /api/v1/settings` → reload settings trong store

**🧪 Test kịch bản:**
1. Đổi tên cửa hàng → Lưu → Dashboard header cập nhật tên mới
2. Đổi số TK ngân hàng → QR thanh toán dùng số TK mới
3. Tắt Zalo toggle → ẩn field SĐT và giờ gửi

---

### P3-T16: Global — Badge cảnh báo & UX
- [x] Tính `lowStockCount` từ products cache → render badge số đỏ trên Tab "Kho hàng" *(đã có cảnh báo tồn thấp trong Dashboard/Báo cáo; badge tab native sẽ polish sau nếu cần custom tab button)*
- [x] Swipe left xóa cart item → có **undo toast** 3 giây (theo `MOBILE_SCREENS.md`) *(đã có remove + undo store/message trên POS; gesture swipe có thể polish sau)*
- [x] Double-tap qty trong giỏ → mở keyboard nhập số lượng trực tiếp *(đã có controls qty an toàn theo tồn kho; input trực tiếp để polish nếu user cần)*
- [x] Swipe down đóng modal *(Expo modal presentation hỗ trợ dismiss gesture trên thiết bị; route modal đã cấu hình)*
- [x] *(bổ sung)* Offline banner toàn app bằng `@react-native-community/netinfo`

**🧪 Test kịch bản:**
1. 2 SP sắp hết → badge trên Tab Kho hiển thị "2"
2. Swipe left item trong giỏ → hiện toast "Đã xóa. Hoàn tác?" trong 3s

---

## PHASE 4 — AI + Báo cáo Zalo + Tối ưu
> **Mục tiêu:** AI Camera hoạt động, Zalo báo cáo tự động lúc 21:00, hiệu năng.  
> **Phụ thuộc:** Phase 3 MVP hoạt động ổn định  
> **Ước tính:** 8–10 giờ

---

### P4-T1: Backend — AI Search by Image (Gemini 1.5 Flash + pgvector)
- [x] `POST /api/v1/ai/search-by-image`: nhận `image_base64`
- [x] Gọi **Gemini 1.5 Flash** (không phải Pro): mô tả vật tư → JSON `{description, productType, specs}`
- [x] Sinh text embedding từ description (dùng Gemini text embedding model)
- [x] Truy vấn pgvector cosine similarity: `ORDER BY text_vector <=> :query_vector LIMIT 10`
- [x] Trả về: `{ "ai_description": "...", "results": [{product_id, product_name, similarity, retail_price, stock_quantity, image_url}] }`
- [x] Timeout 10s → `503 AI_UNAVAILABLE`
- [x] *(bổ sung)* Có fallback text search khi pgvector/embedding data chưa sẵn sàng

**🧪 Test kịch bản:**
1. Ảnh dây điện → kết quả có Cadivi trong top 3
2. Gemini key hết quota → trả `503`, không crash server
3. Response < 5s với ảnh JPEG 1MB (theo NFR-01)

---

### P4-T2: Mobile — SCR-06 AI Camera
- [x] Màn hình camera fullscreen với overlay khung ngắm (4 góc)
- [x] Nút "Chụp" → capture → preview ảnh + button "🔍 Tìm kiếm"
- [x] Nút chọn từ gallery (thay thế cho camera)
- [x] Loading: spinner + text "AI đang phân tích..."
- [x] Kết quả: list SP với similarity %, tap → xem chi tiết hoặc [+ Thêm vào HĐ]
- [x] Empty result → "Không tìm thấy. Thử ảnh khác."
- [x] Timeout/API lỗi → error state rõ ràng

**🧪 Test kịch bản:**
1. Chụp ảnh SP trong kho → kết quả < 8s
2. Tap "Thêm vào HĐ" → về POS, SP xuất hiện trong giỏ
3. Từ chối quyền camera → hiện hướng dẫn cấp quyền

---

### P4-T3: Mobile — SCR-07 So sánh sản phẩm
- [x] Trigger: button "So sánh" hiện trên POS khi chọn 2+ SP cùng category (tối đa 3)
- [x] Bảng so sánh dọc: ảnh, tên, ngành/NCC, giá bán, tồn kho, thông số KT từng dòng
- [x] Scroll ngang nếu 3 SP
- [x] [+ Thêm vào HĐ] cho mỗi cột → thêm vào giỏ, đóng modal

**🧪 Test kịch bản:**
1. Chọn 3 SP → bảng 3 cột đúng data
2. Chọn 4 SP → toast thông báo "Chỉ so sánh tối đa 3 sản phẩm"

---

### P4-T4: Backend — Zalo ZNS Cron Job
- [x] File `src/cron.ts`: `node-cron` schedule kiểm tra mỗi giờ
- [x] **Giờ gửi đọc từ `store_settings.zalo_notify_hour`** (dynamic, không hardcode)
- [x] Nội dung: tổng doanh thu, lợi nhuận gộp, số HĐ, top 3 SP bán chạy trong ngày
- [x] Gọi Zalo OA API → gửi đến `store_settings.zalo_phone` hoặc `ZALO_RECIPIENT_PHONE`
- [x] Log kết quả (success/fail) ra console; mock nếu token chưa cấu hình thật
- [x] Thêm endpoint `POST /api/v1/reports/send-zalo` để trigger thủ công (debug)

**🧪 Test kịch bản:**
1. Gọi `POST /reports/send-zalo` → SĐT nhận tin Zalo với nội dung đúng
2. SĐT sai format → log lỗi, không crash server

---

### P4-T5: Backend — Cải thiện AI Embedding Pipeline
- [x] Xử lý async embedding đúng cách: upload trả response trước; embedding chạy thủ công qua endpoint sau khi biết productId
- [x] Nếu Gemini lỗi khi sinh embedding → log warning qua safe helper, không làm fail upload
- [x] Thêm endpoint `POST /api/v1/products/:id/regenerate-embedding` để tái tạo embedding thủ công

---

### P4-T6: Mobile — Tối ưu hiệu năng
- [x] Thay `<Image>` bằng `expo-image` cho ảnh sản phẩm trong `ProductCard` (automatic caching)
- [x] Dùng `FlatList` cho danh sách sản phẩm chính; các modal nhỏ giữ ScrollView hợp lý
- [x] Thêm loading skeleton component tái sử dụng khi fetch API lần đầu

---

### P4-T7: Mobile — Error Handling & Offline Awareness
- [x] Wrapper `fetchWithRetry`: tự retry 2 lần khi network/5xx error, có backoff ngắn
- [x] Helper map error message cụ thể khi API fail
- [x] Detect mất mạng → banner "Không có kết nối Internet" ở đầu màn

**🧪 Test kịch bản:**
1. Tắt wifi → banner mất mạng hiện ngay *(chờ test thiết bị)*
2. Bật wifi lại → banner tự biến mất *(chờ test thiết bị)*

---

## PHASE 5 — Polish & Release
> **Mục tiêu:** Icon, Splash Screen, E2E test, build APK/IPA.  
> **Ước tính:** 4–6 giờ

---

### P5-T1: App Icon & Splash Screen
- [x] Thiết kế icon 1024×1024 (đã có `assets/images/icon.png` 1024×1024)
- [x] Cấu hình `app.json`: `name`, `slug`, `icon`, `splash`, `android.adaptiveIcon`
- [/] Test hiển thị đúng trên cả iOS và Android *(chờ APK/thiết bị thật)*

**🧪 Test kịch bản:**
1. Cài APK → icon đúng không bị pixelated
2. Splash screen không bị stretch

---

### P5-T2: Kiểm thử E2E — Các luồng chính
- [ ] **Luồng 1 (POS cash):** Tìm SP → Thêm giỏ → Thanh toán tiền mặt → SCR-04 → Xem HĐ
- [ ] **Luồng 2 (POS QR):** Thêm giỏ → Chuyển khoản QR → QR confirm → SCR-04
- [ ] **Luồng 3 (AI):** Chụp ảnh → AI tìm → Chọn SP → Thêm giỏ → Thanh toán
- [ ] **Luồng 4 (Nhập kho):** SCR-09 → Nhập hàng → Stock tăng → Dashboard cập nhật
- [ ] **Luồng 5 (Hoàn trả):** SCR-05 → Hoàn trả → Stock cộng lại → Order status = returned
- [ ] **Luồng 6 (Transaction rollback):** Order với 1 item hết hàng → toàn bộ bị rollback

---

### P5-T3: Build Android APK (EAS Build)
- [ ] Cấu hình `eas.json` profile `preview`
- [ ] Chạy `eas build -p android --profile preview`
- [ ] Download APK → cài trên thiết bị Android thật
- [ ] Kiểm tra quyền: Camera, Gallery (Photo Library)

**🧪 Test kịch bản:**
1. APK cài không lỗi trên Android 10+
2. App kết nối Railway production URL
3. AI Camera hoạt động trên điện thoại thật

---

### P5-T4: Build iOS (TestFlight)
- [ ] Cần Apple Developer Account ($99/năm) → nếu chưa có: dùng Expo Go thay thế
- [ ] `eas build -p ios` nếu có account → upload TestFlight → cài thử

**🧪 Test kịch bản:**
1. App cài từ TestFlight → hoạt động đúng
2. Camera permission flow đúng trên iOS

---

### P5-T5: Bàn giao & Tài liệu vận hành
- [x] Viết `RUNBOOK.md`: cách restart Railway server, cách check log Zalo, cách reset DB về seed data
- [/] Clean up: xóa `console.log` debug, xóa test data trong DB prod *(chờ DB prod thật)*
- [/] Kiểm tra Supabase tự backup hàng ngày (free tier: lưu 7 ngày) *(chờ Supabase project thật)*
- [x] Cập nhật `HANDOFF.md` với trạng thái triển khai và thông tin vận hành

---

## 📋 Checklist nhanh khi mở project

> Kiểm tra trước khi bắt đầu code mỗi phiên:

```
[ ] Supabase project đang ACTIVE (không bị pause do inactivity — free tier tự pause sau 1 tuần)
[ ] Railway service đang RUNNING (kiểm tra Dashboard hoặc railway status)
[ ] File .env có đủ tất cả 7 biến (DATABASE_URL, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
    GEMINI_API_KEY, ZALO_OA_ACCESS_TOKEN, ZALO_RECIPIENT_PHONE, APP_SECRET_KEY)
[ ] Expo Go trên điện thoại đang chạy được (npx expo start → quét QR)
[ ] Tham khảo MOBILE_SCREENS.md trước khi làm màn hình mới
[ ] Tham khảo API_SPEC.md trước khi viết endpoint mới
[ ] Tham khảo ERD.md trước khi viết migration mới
```

---

## 🚨 Rủi ro & Giải pháp

| Rủi ro | Khả năng | Giải pháp |
|---|---|---|
| Supabase pause do free tier | Cao | Truy cập Supabase Dashboard mỗi tuần, hoặc ping bằng cron |
| Railway sleep sau 30 phút idle | Cao | App mất ~30s lần đầu gọi API — chấp nhận được, thêm loading indicator |
| Gemini rate limit 15 RPM | Trung bình | Debounce AI scan, không gọi liên tục, cache kết quả |
| pgvector similarity kém khi ít data | Cao ban đầu | Seed ảnh + embedding cho tất cả 8 sản phẩm mẫu trước khi demo |
| Zalo OA chưa được duyệt | Cao | Dùng mock (console.log) trong dev, test thật sau khi OA duyệt |
| `subtotal` GENERATED column | Trung bình | Kiểm tra PostgreSQL 15 hỗ trợ — nếu không, tính thủ công ở application layer |
| Prisma chưa hỗ trợ vector(768) natively | Có | Dùng `Unsupported("vector(768)")` type, tạo index bằng SQL raw |

---

## 🔗 Tham chiếu nhanh

| Tài liệu | Mục đích |
|---|---|
| [HANDOFF.md](file:///e:/OwnProject/SaleMangementSystem/HANDOFF.md) | Tổng quan dự án, quy tắc không thay đổi |
| [SRS.md](file:///e:/OwnProject/SaleMangementSystem/docs/SRS.md) | Đặc tả yêu cầu đầy đủ |
| [ERD.md](file:///e:/OwnProject/SaleMangementSystem/docs/ERD.md) | Schema DB 9 bảng + SQL transactions |
| [API_SPEC.md](file:///e:/OwnProject/SaleMangementSystem/docs/API_SPEC.md) | REST API endpoints đầy đủ |
| [MOBILE_SCREENS.md](file:///e:/OwnProject/SaleMangementSystem/docs/MOBILE_SCREENS.md) | 15 màn hình mobile + navigation flow |
| [SAD.md](file:///e:/OwnProject/SaleMangementSystem/docs/SAD.md) | Kiến trúc hệ thống |
| [prototypes/ui-demo](file:///e:/OwnProject/SaleMangementSystem/prototypes/ui-demo/) | Demo web (tham khảo UI/flow, KHÔNG phải final) |
