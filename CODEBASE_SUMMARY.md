# Phone Store — Codebase Summary

Tài liệu ngắn để nhóm và AI agent nắm nhanh source code hiện có. Tài liệu này chỉ mô tả implementation hiện tại; nếu khác với yêu cầu sản phẩm thì [PHONE_STORE_FINAL_PROJECT_SPEC.md](PHONE_STORE_FINAL_PROJECT_SPEC.md) là nguồn quyết định.

## Trạng thái hiện tại

Các chức năng hiện có:

- Khởi tạo MERN: React/Vite frontend và Express/Mongoose backend.
- Đăng ký, đăng nhập JWT, xem/sửa profile và đổi mật khẩu.
- Backend phân quyền `CUSTOMER`, `STAFF`, `ADMIN`.
- Admin quản lý hãng, sản phẩm và biến thể.
- Ảnh sản phẩm upload/xóa qua Cloudinary khi đã cấu hình.
- Storefront: danh sách sản phẩm, tìm kiếm, lọc, sắp xếp và phân trang.
- Chi tiết sản phẩm, chọn biến thể, giỏ hàng, voucher, checkout COD và lịch sử đơn hàng.
- Backend tự đảm bảo ba tài khoản demo tồn tại khi khởi động; seed thêm catalog và voucher mẫu.

Chưa triển khai: hủy đơn, quản lý đơn cho Staff/Admin, quản lý user, dashboard và thanh toán VNPay.

## Kiến trúc và thư mục

```text
client/                       React SPA
  src/api/                    Axios client và API auth/admin
  src/context/AuthContext.jsx JWT token + user hiện tại trong localStorage
  src/components/             Layout, ProtectedRoute, loading/message
  src/pages/                  Auth, profile, admin brands/products
  src/App.jsx                 Khai báo routes

server/
  src/models/                 User, Brand, Product, Cart, Voucher, Order schemas
  src/controllers/            Auth, catalog, cart, voucher, COD order logic
  src/routes/                 Ánh xạ REST endpoint
  src/middlewares/            JWT/role, upload Multer, error handler
  src/config/                 MongoDB và Cloudinary
  src/app.js                  Express app + gắn routes
  src/server.js               Đọc env, kết nối DB, mở cổng
  src/services/               Demo account bootstrap và pricing/cart helpers
  scripts/seed.js             Catalog + voucher demo idempotent
```

Luồng backend: `Route → requireAuth/allowRoles (nếu cần) → Controller → Model → MongoDB`.

## Role và bảo mật

| Role | Quyền hiện có |
|---|---|
| `CUSTOMER` | Đăng ký/đăng nhập, quản lý hồ sơ, mua hàng, giỏ, voucher và lịch sử đơn. |
| `STAFF` | Đăng nhập và quản lý hồ sơ; chưa có module order. |
| `ADMIN` | Toàn bộ quyền Customer và quản lý hãng/sản phẩm. |

- JWT gửi qua header `Authorization: Bearer <token>`.
- Mật khẩu được bcrypt hash trong trường `passwordHash`, không trả về client.
- Tài khoản `BLOCKED` không thể login hay dùng API protected.
- API admin luôn kiểm tra role ở backend, không chỉ ẩn giao diện.
- Multer chỉ nhận JPG/PNG/WEBP, tối đa 5 MB/ảnh, tối đa 5 ảnh/request.

## Data models chính

### User

`fullName`, `email` unique/lowercase, `passwordHash`, `phone`, `address`, `role`, `status`.

### Brand

`name` unique, `slug`, `logoUrl`, `logoPublicId`, `isActive`.

### Product

`name`, `slug`, `modelCode` unique, `brandId`, `description`, `specifications`, `images`, `variants`, `isActive`.

Mỗi `variant` có `sku`, `ram`, `storage`, `color`, `colorHex`, `price`, `compareAtPrice`, `stock`, `isActive`.

Quy tắc bắt buộc: dùng tên trường `storage`, **không dùng `rom`**; giá và tồn kho luôn nằm trong biến thể; SKU không được lặp; giá/tồn kho không âm.

### Cart, Voucher, Order

- Cart chỉ lưu `productId`, `variantId`, `quantity`; backend luôn đọc giá/tồn kho hiện tại từ Product.
- Voucher kiểm tra thời gian, trạng thái, mức đơn tối thiểu và số lượt dùng ở backend.
- Order lưu snapshot sản phẩm, giá, cấu hình và địa chỉ tại thời điểm đặt hàng. Đơn COD bắt đầu ở `PENDING` / `UNPAID`.

## API hiện có

Base URL: `/api`.

| Nhóm | Endpoint |
|---|---|
| Health | `GET /health` |
| Auth | `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`, `PATCH /auth/profile`, `PATCH /auth/change-password` |
| Public | `GET /brands`, `GET /products`, `GET /products/:slug` |
| Cart | `GET /cart`, `POST /cart/items`, `PATCH/DELETE /cart/items/:variantId`, `DELETE /cart` |
| Voucher | `POST /vouchers/validate` |
| Customer orders | `POST /orders`, `GET /orders/my-orders`, `GET /orders/my-orders/:orderCode` |
| Admin brands | `GET/POST /admin/brands`, `PATCH /admin/brands/:id`, `PATCH /admin/brands/:id/status` |
| Admin products | `GET/POST /admin/products`, `GET/PATCH /admin/products/:id`, `PATCH /admin/products/:id/status` |
| Images | `POST /admin/products/:id/images`, `DELETE /admin/products/:id/images/:imageId` |
| Variants | `POST /admin/products/:id/variants`, `PATCH /admin/products/:id/variants/:variantId` |

Tất cả endpoint `/admin/*` ở trên yêu cầu `ADMIN`.

## Giao diện và routes hiện có

- `/`: Trang chủ storefront và sản phẩm mới.
- `/products`, `/products/:slug`: Danh sách, lọc và chi tiết điện thoại.
- `/login`, `/register`: Đăng nhập/đăng ký.
- `/profile`: Hồ sơ và đổi mật khẩu; yêu cầu đăng nhập.
- `/cart`, `/checkout`, `/orders`, `/orders/:orderCode`: Luồng mua hàng Customer.
- `/admin/products`, `/admin/products/new`, `/admin/products/:id/edit`: Quản lý sản phẩm; Admin.
- `/admin/brands`: Quản lý hãng; Admin.

`AuthContext` lưu access token tại `localStorage` key `phone_store_token`, gọi `/auth/me` khi ứng dụng tải và xóa session nếu token lỗi/hết hạn.

## Cách tiếp tục phát triển

1. Đọc specification trước khi thêm tính năng.
2. Không đổi stack hoặc thêm kiến trúc/thư viện ngoài phạm vi đã duyệt.
3. Logic giá, stock, voucher và tổng tiền phải ở backend.
4. Thêm API trước, sau đó nối frontend, validation, loading/error state và kiểm tra role.
5. Chạy `npm run lint` và `npm run build` trước khi bàn giao.
