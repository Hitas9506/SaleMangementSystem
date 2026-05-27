# API Specification
# Hệ thống Quản lý Cửa hàng Vật tư Gia đình

**Base URL:** `https://<railway-app>.railway.app/api/v1`  
**Auth:** Header `X-App-Key: <secret>` (bắt buộc mọi request)  
**Content-Type:** `application/json`

---

## 1. Products — Sản phẩm

### GET /products
Danh sách sản phẩm, hỗ trợ tìm kiếm và lọc.

**Query params:**
| Param | Type | Mô tả |
|---|---|---|
| `q` | string | Tìm theo tên hoặc SKU |
| `category_id` | uuid | Lọc theo ngành hàng |
| `low_stock` | boolean | Chỉ lấy sản phẩm sắp hết |
| `page` | int | Trang (default 1) |
| `limit` | int | Số dòng (default 20, max 100) |

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Dây điện Cadivi 2.5mm2",
      "sku": "DI-001",
      "unit": "mét",
      "retail_price": 15000,
      "stock_quantity": 150,
      "low_stock_threshold": 20,
      "category": { "id": "uuid", "name": "Điện", "icon": "⚡" },
      "image_url": "https://...",
      "is_active": true
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 20
}
```

---

### GET /products/:id
Chi tiết sản phẩm + lịch sử giá nhập gần nhất.

**Response 200:**
```json
{
  "id": "uuid",
  "name": "Dây điện Cadivi 2.5mm2",
  "sku": "DI-001",
  "unit": "mét",
  "retail_price": 15000,
  "stock_quantity": 150,
  "technical_specs": "Tiết diện: 2.5mm2, Vỏ PVC, Chịu nhiệt 70°C",
  "last_import_price": 11000,
  "last_import_date": "2026-05-20T10:00:00Z",
  "category": { "id": "uuid", "name": "Điện" },
  "supplier": { "id": "uuid", "name": "Cadivi" }
}
```

---

### POST /products
Tạo sản phẩm mới.

**Request body:**
```json
{
  "name": "Ống PVC Tiền Phong D21",
  "category_id": "uuid",
  "unit": "cây",
  "retail_price": 35000,
  "stock_quantity": 0,
  "low_stock_threshold": 10,
  "technical_specs": "Đường kính 21mm, dày 2.0mm, dài 4m",
  "image_url": "https://..."
}
```

**Response 201:**
```json
{ "id": "uuid", "sku": "NU-012", ...product }
```

---

### PUT /products/:id
Cập nhật thông tin sản phẩm.

**Request body:** (partial, chỉ field cần update)
```json
{
  "retail_price": 36000,
  "low_stock_threshold": 15
}
```

**Response 200:** product object

---

### GET /products/compare
So sánh 2–3 sản phẩm.

**Query params:** `ids=uuid1,uuid2,uuid3`

**Response 200:**
```json
{
  "products": [
    { "id": "uuid1", "name": "...", "retail_price": 35000, "technical_specs": "..." },
    { "id": "uuid2", "name": "...", "retail_price": 32000, "technical_specs": "..." }
  ]
}
```

---

## 2. Categories — Ngành hàng

### GET /categories
```json
{
  "data": [
    { "id": "uuid", "name": "Điện", "icon": "⚡", "product_count": 45 },
    { "id": "uuid", "name": "Nước", "icon": "💧", "product_count": 62 }
  ]
}
```

---

## 3. Suppliers — Nhà cung cấp

### GET /suppliers
```json
{
  "data": [
    { "id": "uuid", "name": "Cadivi", "phone": "028...", "note": "" }
  ]
}
```

### POST /suppliers
```json
{ "name": "Tiền Phong", "phone": "024...", "note": "Giao hàng thứ 2, 4, 6" }
```

### PUT /suppliers/:id — Cập nhật NCC

---

## 4. Import Logs — Nhập hàng

### GET /import-logs
**Query params:** `product_id`, `supplier_id`, `from_date`, `to_date`

```json
{
  "data": [
    {
      "id": "uuid",
      "product": { "id": "uuid", "name": "Dây điện Cadivi 2.5mm2" },
      "supplier": { "id": "uuid", "name": "Cadivi" },
      "import_price": 11000,
      "quantity": 100,
      "import_date": "2026-05-20T10:00:00Z",
      "note": ""
    }
  ]
}
```

### POST /import-logs
Nhập hàng — tự động cộng kho.

```json
{
  "product_id": "uuid",
  "supplier_id": "uuid",
  "import_price": 11000,
  "quantity": 100,
  "import_date": "2026-05-25T08:00:00Z",
  "note": ""
}
```

**Response 201:**
```json
{
  "import_log": { ...log },
  "updated_stock": 250
}
```

---

## 5. Orders — Hóa đơn

### GET /orders
**Query params:** `from_date`, `to_date`, `status`, `page`, `limit`

```json
{
  "data": [
    {
      "id": "uuid",
      "total_amount": 450000,
      "payment_method": "cash",
      "payment_status": "paid",
      "order_date": "2026-05-25T14:30:00Z",
      "items_count": 3,
      "note": ""
    }
  ],
  "total": 42,
  "page": 1
}
```

### GET /orders/:id
Chi tiết hóa đơn + từng dòng sản phẩm.

```json
{
  "id": "uuid",
  "total_amount": 450000,
  "paid_amount": 500000,
  "payment_method": "cash",
  "payment_status": "paid",
  "note": "Anh Minh, lắp đặt nhà bếp",
  "order_date": "2026-05-25T14:30:00Z",
  "items": [
    {
      "product_id": "uuid",
      "product_name": "Dây điện Cadivi 2.5mm2",
      "quantity": 10,
      "unit": "mét",
      "unit_price": 15000,
      "subtotal": 150000
    }
  ]
}
```

### POST /orders
Tạo hóa đơn + tự động trừ kho trong 1 transaction.

```json
{
  "payment_method": "cash",
  "paid_amount": 500000,
  "note": "Anh Minh",
  "items": [
    { "product_id": "uuid", "quantity": 10, "unit_price": 15000 },
    { "product_id": "uuid", "quantity": 2, "unit_price": 75000 }
  ]
}
```

**Response 201:**
```json
{
  "id": "uuid",
  "total_amount": 300000,
  "change_amount": 200000,
  "payment_status": "paid"
}
```

**Error 409:** Khi tồn kho không đủ
```json
{
  "error": "INSUFFICIENT_STOCK",
  "message": "Sản phẩm 'Dây điện Cadivi 2.5mm2' chỉ còn 5 mét"
}
```

### PATCH /orders/:id/cancel
Hủy hóa đơn (chỉ khi status = `pending`).

### POST /orders/:id/qr-confirm
Xác nhận thủ công đã nhận tiền QR.

```json
{ "confirmed": true }
```

---

## 6. Returns — Hoàn trả

### POST /returns
Tạo phiếu hoàn trả + cộng lại kho.

```json
{
  "order_id": "uuid",
  "reason": "Sản phẩm bị lỗi",
  "refund_amount": 75000,
  "items": [
    { "product_id": "uuid", "quantity": 1, "unit_price": 75000 }
  ]
}
```

---

## 7. AI Search

### POST /ai/search-by-image
Nhận diện linh kiện qua ảnh.

**Request body:**
```json
{
  "image_base64": "data:image/jpeg;base64,/9j/4AAQ..."
}
```

**Response 200:**
```json
{
  "ai_description": "Van cầu đồng DN25, ren trong 1 inch, dùng cho hệ thống nước",
  "results": [
    {
      "product_id": "uuid",
      "product_name": "Van cầu đồng Kitz DN25",
      "similarity": 0.92,
      "retail_price": 85000,
      "stock_quantity": 8,
      "image_url": "https://..."
    }
  ]
}
```

**Error 503:** Gemini API không khả dụng
```json
{ "error": "AI_UNAVAILABLE", "message": "Dịch vụ AI tạm thời không khả dụng" }
```

---

## 8. Reports — Báo cáo

### GET /reports/dashboard
Dữ liệu Dashboard tổng quan.

**Query params:** `date` (default: hôm nay, format: YYYY-MM-DD)

```json
{
  "today": {
    "revenue": 2500000,
    "gross_profit": 750000,
    "order_count": 12
  },
  "this_week": { "revenue": 15000000, "gross_profit": 4500000 },
  "this_month": { "revenue": 58000000, "gross_profit": 17400000 },
  "top_products": [
    { "product_name": "Dây điện Cadivi 2.5mm2", "quantity_sold": 150, "revenue": 2250000 }
  ],
  "low_stock_alerts": [
    { "product_id": "uuid", "name": "Van nước DN15", "stock_quantity": 2, "threshold": 5 }
  ]
}
```

### GET /reports/revenue
Báo cáo doanh thu theo kỳ.

**Query params:** `from_date`, `to_date`, `group_by` (day/week/month)

```json
{
  "summary": { "total_revenue": 58000000, "total_profit": 17400000, "total_orders": 340 },
  "chart_data": [
    { "period": "2026-05-01", "revenue": 1800000, "profit": 540000, "orders": 10 }
  ]
}
```

### GET /reports/inventory
Báo cáo tồn kho.

```json
{
  "total_sku": 312,
  "total_stock_value": 125000000,
  "low_stock": [...],
  "slow_moving": [
    { "product_id": "uuid", "name": "...", "last_sold_date": "2026-04-01", "days_no_sale": 54 }
  ]
}
```

---

## 9. Upload

### POST /upload/product-image
Upload ảnh sản phẩm lên Supabase Storage.

**Content-Type:** `multipart/form-data`  
**Body:** `file` (image/jpeg hoặc image/png, max 5MB)

```json
{
  "image_url": "https://supabase-storage.../product_images/uuid.jpg"
}
```

*Sau upload, backend tự tính embedding ảnh và cập nhật PRODUCT_EMBEDDINGS.*

---

## 10. Error Codes

| Code | HTTP | Mô tả |
|---|---|---|
| `UNAUTHORIZED` | 401 | Thiếu hoặc sai X-App-Key |
| `NOT_FOUND` | 404 | Resource không tồn tại |
| `INSUFFICIENT_STOCK` | 409 | Tồn kho không đủ |
| `INVALID_INPUT` | 422 | Dữ liệu đầu vào không hợp lệ |
| `AI_UNAVAILABLE` | 503 | Gemini API lỗi |
| `DB_ERROR` | 500 | Lỗi database |
