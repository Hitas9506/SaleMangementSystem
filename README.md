# SaleMangementSystem

Root chính của phần mềm quản lý cửa hàng vật tư gia đình VTShop.

## Cấu trúc thư mục

```txt
SaleMangementSystem/
├── backend/                 # Node.js + Express + Prisma API
├── mobile/                  # React Native + Expo app
├── prototypes/
│   └── ui-demo/             # Web UI demo/prototype, không phải app final
├── docs/                    # SRS, SAD, ERD, API spec, mobile screens
├── HANDOFF.md               # Trạng thái/handoff cho agent tiếp theo
├── IMPLEMENTATION_PLAN.md   # Kế hoạch và tiến độ triển khai
├── RUNBOOK.md               # Hướng dẫn vận hành, deploy, test E2E
└── DESIGN.md                # Design reference
```

## Chạy backend

```powershell
cd e:\OwnProject\SaleMangementSystem\backend
npm run typecheck
npm run build
npm run dev
```

## Chạy mobile

```powershell
cd e:\OwnProject\SaleMangementSystem\mobile
npm run typecheck
npm start
```

## Lưu ý

- `prototypes/ui-demo` chỉ để tham khảo giao diện/flow.
- App final là React Native + Expo trong `mobile`.
- Backend thật nằm trong `backend`.
- Không thêm login; API dùng `X-App-Key` theo `HANDOFF.md`.
