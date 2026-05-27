# VTShop RUNBOOK

Tài liệu vận hành nhanh cho backend, mobile, Supabase, Railway, Gemini và Zalo.

## 1. Chạy local

### Backend

```powershell
cd e:\OwnProject\SaleMangementSystem\backend
npm install
npm run typecheck
npm run build
npm run dev
```

Health check:

```powershell
Invoke-RestMethod http://localhost:3000/health
```

API v1 cần header:

```txt
X-App-Key: <APP_SECRET_KEY>
```

### Mobile

```powershell
cd e:\OwnProject\SaleMangementSystem\mobile
npm install
npm run typecheck
npm start
```

Mở Expo Go, quét QR.

### Prototype UI demo

```powershell
cd e:\OwnProject\SaleMangementSystem\prototypes\ui-demo
npm install
npm run lint
npm run build
npm run dev
```

## 2. Biến môi trường

Backend cần file [backend/.env](file:///e:/OwnProject/SaleMangementSystem/backend/.env):

```env
DATABASE_URL=postgresql://...
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
GEMINI_API_KEY=...
ZALO_OA_ACCESS_TOKEN=...
ZALO_RECIPIENT_PHONE=84xxxxxxxxx
APP_SECRET_KEY=<random-32-char-string>
PORT=3000
```

Mobile config nằm trong [mobile/app.json](file:///e:/OwnProject/SaleMangementSystem/mobile/app.json):

```json
{
  "extra": {
    "API_BASE_URL": "https://<railway-app>.railway.app/api/v1",
    "APP_KEY": "<same-as-APP_SECRET_KEY>"
  }
}
```

## 3. Supabase setup

### Migrate schema

Khi có `DATABASE_URL` thật:

```powershell
cd e:\OwnProject\SaleMangementSystem\backend
npx prisma validate
npm run prisma:generate
npm run prisma:migrate
```

Nếu migrate Prisma gặp vấn đề với `pgvector`, paste SQL thủ công:

- [supabase_manual_init.sql](file:///e:/OwnProject/SaleMangementSystem/backend/prisma/supabase_manual_init.sql)

### Seed data

```powershell
cd e:\OwnProject\SaleMangementSystem\backend
npm run prisma:seed
```

Kiểm tra bảng chính:

- `categories`
- `suppliers`
- `products`
- `store_settings`
- `orders`
- `import_logs`
- `product_embeddings`

## 4. Railway deploy

1. Tạo Railway project.
2. Kết nối repo hoặc deploy từ CLI.
3. Set biến môi trường giống [backend/.env](file:///e:/OwnProject/SaleMangementSystem/backend/.env).
4. Build command mặc định: `npm run build`.
5. Start command qua [Procfile](file:///e:/OwnProject/SaleMangementSystem/backend/Procfile):

```txt
web: npm start
```

Sau deploy:

```powershell
Invoke-RestMethod https://<railway-app>.railway.app/health
```

## 5. Gemini AI

Dùng cho:

- `POST /api/v1/ai/search-by-image`
- `POST /api/v1/products/:id/regenerate-embedding`

Checklist:

1. `GEMINI_API_KEY` tồn tại.
2. Supabase đã bật `vector` extension.
3. `product_embeddings` table tồn tại.
4. Sản phẩm có data đủ: name, sku, unit, category/specs.

Test regenerate:

```powershell
$headers = @{ "X-App-Key" = "<APP_SECRET_KEY>" }
Invoke-RestMethod -Method Post `
  -Uri "http://localhost:3000/api/v1/products/<product-id>/regenerate-embedding" `
  -Headers $headers
```

## 6. Zalo report

Endpoint thủ công:

```powershell
$headers = @{ "X-App-Key" = "<APP_SECRET_KEY>" }
Invoke-RestMethod -Method Post `
  -Uri "http://localhost:3000/api/v1/reports/send-zalo" `
  -Headers $headers
```

Cron:

- Chạy mỗi giờ.
- Gửi khi giờ hiện tại khớp `store_settings.zalo_notify_hour`.
- Không gửi nếu `store_settings.zalo_notify_enabled = false`.
- Nếu token là placeholder/mock, backend log `[ZALO MOCK]`.

## 7. Luồng test E2E chính

### POS cash

1. Mở tab POS.
2. Tìm sản phẩm.
3. Thêm vào giỏ.
4. Chọn thanh toán tiền mặt.
5. Nhập tiền khách đưa.
6. Xác nhận.
7. Kiểm tra stock giảm.

### POS QR

1. Thêm sản phẩm vào giỏ.
2. Chọn chuyển khoản QR.
3. QR hiển thị đúng amount.
4. Xác nhận.
5. Order pending rồi auto confirm paid.

### Nhập kho

1. Tab Kho.
2. Chọn Nhập hàng.
3. Chọn sản phẩm/NCC.
4. Nhập giá + số lượng.
5. Confirm.
6. Kiểm tra stock tăng.

### Hoàn trả

1. Mở chi tiết hóa đơn paid.
2. Chọn Hoàn trả.
3. Chọn số lượng hoàn.
4. Confirm.
5. Kiểm tra stock cộng lại và order status `returned`.

### AI search

1. Mở POS → Tìm bằng AI.
2. Chụp/chọn ảnh.
3. Chọn kết quả.
4. Thêm vào hóa đơn.

## 8. Backup / reset dữ liệu

Free tier Supabase có backup giới hạn. Trước demo quan trọng:

1. Export SQL từ Supabase Dashboard.
2. Ghi lại `DATABASE_URL` active.
3. Nếu cần reset demo:
   - truncate bảng transaction trước (`return_items`, `returns`, `order_items`, `orders`, `import_logs`)
   - seed lại data mẫu.

## 9. Lệnh kiểm tra trước bàn giao

```powershell
cd e:\OwnProject\SaleMangementSystem\backend
npm run typecheck
npm run build
npx prisma validate

cd e:\OwnProject\SaleMangementSystem\mobile
npm run typecheck
npx expo config --type public

cd e:\OwnProject\SaleMangementSystem\prototypes\ui-demo
npm run lint
npm run build
```

## 10. Giới hạn hiện tại

- Chưa E2E DB thật nếu thiếu Supabase credentials.
- Chưa gửi Zalo thật nếu thiếu OA token/user mapping.
- Chưa test camera/offline trên thiết bị nếu chưa chạy Expo Go.
- iOS TestFlight cần Apple Developer Account.
