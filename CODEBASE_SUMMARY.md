# Phone Store — Codebase Summary

Tài liệu ngắn để nắm implementation hiện có. Yêu cầu, quyết định phạm vi và phần chưa làm được ghi tại [PHONE_STORE_FINAL_PROJECT_SPEC.md](PHONE_STORE_FINAL_PROJECT_SPEC.md).

## Trạng thái hiện tại

- MERN: React/Vite frontend và Express/Mongoose backend.
- Đăng ký gửi OTP 6 số để xác minh email; hồ sơ hiển thị trạng thái xác minh. Đổi/quên mật khẩu cũng dùng OTP email; refresh token được xoay vòng.
- Phân quyền backend cho `CUSTOMER`, `STAFF`, `ADMIN`; tài khoản `BLOCKED` không thể đăng nhập hoặc gọi API bảo vệ.
- Admin quản lý hãng, sản phẩm, biến thể, giá nhập/giá bán, tồn kho và ảnh Cloudinary; dashboard có biểu đồ doanh thu/lợi nhuận theo ngày, tháng hoặc năm.
- Storefront có danh sách sản phẩm, tìm kiếm, lọc/sắp xếp/phân trang bằng truy vấn MongoDB phía backend; frontend debounce 1 giây sau thay đổi bộ lọc rồi mới gọi API. Lựa chọn RAM, bộ nhớ và màu trong bộ lọc được lấy động từ các biến thể đang bán. Trang chi tiết có hệ thống đánh giá sao/nhận xét có thống kê theo từng mức sao.
- Customer có giỏ hàng, voucher, trang “Ưu đãi của tôi”, checkout COD hoặc VNPay, lịch sử/chi tiết đơn, tiếp tục thanh toán VNPay cho đơn đang chờ và yêu cầu hủy đơn.
- Có menu tài khoản dạng dropdown, trang Về chúng tôi/Liên hệ và footer điều hướng, hỗ trợ khách hàng, thông tin liên hệ.
- Staff/Admin xem, tìm kiếm, lọc, cập nhật trạng thái đơn và duyệt/từ chối yêu cầu hủy. Admin có dashboard, quản lý người dùng và CRUD voucher.
- Backend tự bảo đảm ba tài khoản demo khi khởi động; lệnh seed thêm catalog và voucher `WELCOME10` theo cách idempotent.

Chưa có trong source: ảnh đại diện, hoàn trả, test tự động và cấu hình triển khai. Gửi email đặt lại mật khẩu cần cấu hình SMTP trong `server/.env`.

## Kiến trúc và thư mục

```text
client/                       React SPA
  src/api/                    Axios client và API auth/store/admin/management
  src/context/AuthContext.jsx Session JWT trong localStorage
  src/components/             Layout, ProtectedRoute, loading/message
  src/pages/                  Storefront, auth, customer, admin và staff
  src/App.jsx                 Khai báo routes

server/
  src/models/                 User, EmailVerificationCode, ProductReview, Brand, Product, Cart, Voucher, Order schemas
  src/controllers/            Auth, catalog, review, cart, order, payment, admin/dashboard/voucher
  src/routes/                 REST endpoint mapping
  src/middlewares/            JWT/role, Multer upload, error handler
  src/config/                 MongoDB và Cloudinary
  src/services/               Demo account bootstrap và pricing/cart helpers
  scripts/                    Seed demo và migration giá biến thể
```

Luồng backend: `Route → requireAuth/allowRoles (nếu cần) → Controller → Service/Model → MongoDB`.

## Role và bảo mật

| Role | Quyền hiện có |
|---|---|
| `CUSTOMER` | Profile; sau khi xác minh email mới có thể mua hàng, dùng giỏ/voucher, xem đơn và yêu cầu hủy. |
| `STAFF` | Profile và quản lý đơn: xem, cập nhật theo luồng, duyệt/từ chối hủy. |
| `ADMIN` | Quyền của Staff với đơn, đồng thời quản lý hãng/sản phẩm/voucher, user và dashboard. |

- Access token JWT dùng header `Authorization: Bearer <token>`; refresh token được xoay vòng trong cookie `httpOnly` và chỉ dùng ở `/api/auth/refresh`.
- Mật khẩu được bcrypt hash trong `passwordHash` và bị loại khỏi JSON trả về.
- Mã email gồm 6 số, được bcrypt hash, hết hạn sau 10 phút, dùng một lần, giới hạn 5 lần nhập sai và có thời gian chờ 60 giây trước khi gửi lại.
- API quản trị luôn kiểm tra role ở backend.
- Multer chỉ nhận JPG/PNG/WEBP, tối đa 5 MB mỗi ảnh và 5 ảnh mỗi request.
- VNPay chỉ hoạt động khi server có đủ `VNP_TMNCODE`, `VNP_HASHSECRET`, `VNP_URL`, `VNP_RETURNURL`; không có secret mặc định trong code. Mã mẫu cũ `2QX1X1TW` bị chặn vì không còn hợp lệ.

## Data models chính

- `User`: `fullName`, `email`, `passwordHash`, `phone`, `address`, `avatarUrl`, `role`, `status`, `isEmailVerified`, `emailVerifiedAt`, hash/hạn refresh token.
- `EmailVerificationCode`: hash OTP, mục đích (`EMAIL_VERIFICATION`, `PASSWORD_CHANGE`, `PASSWORD_RESET`), hạn dùng, thời điểm gửi và số lần thử.
- `Brand`: `name`, `slug`, `logoUrl`, `logoPublicId`, `isActive`.
- `Product`: `name`, `slug`, `modelCode`, `brandId`, `description`, `specifications`, `images`, `variants`, `isActive`.
- Mỗi `variant` có `sku`, `ram`, `storage`, `color`, `costPrice`, `salePrice`, `stock`, `isActive`. SKU được kiểm tra ở controller và có unique index; dùng `storage`, không dùng `rom`. `costPrice` không được trả về catalog/giỏ hàng công khai.
- `Cart` chỉ lưu `productId`, `variantId`, `quantity`; backend luôn đọc lại giá và stock.
- `Voucher` được validate ở backend khi báo giá/đặt hàng; Admin có thể thêm, sửa, xóa và bật/tắt, gồm thời gian bắt đầu/kết thúc.
- `ProductReview` là một đánh giá cho mỗi Customer trên mỗi sản phẩm, gồm 1–5 sao và nhận xét; API trả điểm trung bình và số lượng theo từng mức sao.
- `Order` lưu snapshot sản phẩm, gồm `unitPrice` và `unitCost`, địa chỉ, pricing, voucher, payment, trạng thái và lịch sử trạng thái. Nhờ vậy lợi nhuận lịch sử không thay đổi khi giá nhập sau này được sửa. Payment lưu các `requestRefs` VNPay để tiếp tục thanh toán an toàn; COD bắt đầu `PENDING`/`UNPAID`; VNPay được xác minh chữ ký, mã website và số tiền khi trả kết quả.

## API hiện có

Base URL: `/api`.

| Nhóm | Endpoint |
|---|---|
| Health | `GET /health` |
| Auth | `POST /auth/register`, `/login`, `/logout`, `/refresh`, `/email-verification-code`, `/verify-email`, `/password-change-code`, `/forgot-password`, `/reset-password`; `GET /auth/me`; `PATCH /auth/profile`, `/change-password` |
| Public | `GET /brands`, `GET /products`, `GET /products/:slug`; `GET /reviews` |
| Cart/Voucher | `GET /cart`; `POST /cart/items`; `PATCH/DELETE /cart/items/:variantId`; `DELETE /cart`; `GET /vouchers/available`; `POST /vouchers/validate` |
| Review | `GET /reviews/mine`, `POST /reviews`, `PATCH /reviews/:reviewId` cho Customer; mỗi Customer có một đánh giá/sản phẩm và chỉ được sửa đánh giá của chính mình. |
| Customer order | `POST /orders`; `GET /orders/my-orders`, `/my-orders/:orderCode`; `POST /orders/:id/cancel-request` |
| Payment | `POST /payments/vnpay/create`, `POST /payments/vnpay/orders/:orderCode/retry`, `GET /payments/vnpay/return` |
| Management order | `GET /management/orders`, `GET /management/orders/:id`, `PATCH /management/orders/:id/status`, `POST /:id/cancel/approve`, `POST /:id/cancel/reject` |
| Admin catalog | `GET/POST/PATCH /admin/brands`; `GET/POST/PATCH /admin/products`; upload/xóa ảnh; thêm/sửa biến thể |
| Admin user/dashboard | `GET /admin/users`, `PATCH /admin/users/:id/status`, `PATCH /admin/users/:id/role`; `GET /admin/dashboard/{overview,revenue,top-products,low-stock}` |
| Admin voucher | `GET/POST /admin/vouchers`; `PATCH /admin/vouchers/:id`, `/admin/vouchers/:id/status`; `DELETE /admin/vouchers/:id` |

`/management/orders/*` yêu cầu `ADMIN` hoặc `STAFF`; các endpoint `/admin/*` yêu cầu `ADMIN`.

## Giao diện và routes hiện có

- Storefront: `/`, `/products`, `/products/:slug`, `/about`, `/contact`, `/login`, `/register`, `/forgot-password`, `/profile`.
- Customer: `/cart`, `/checkout`, `/orders`, `/orders/success/:orderCode`, `/orders/:orderCode`, `/my-vouchers`.
- Staff/Admin: `/admin/orders`, `/admin/orders/:id`.
- Chỉ Admin: `/admin/dashboard`, `/admin/users`, `/admin/products`, `/admin/products/new`, `/admin/products/:id/edit`, `/admin/brands`, `/admin/vouchers`.

`AuthContext` lưu access token tại `localStorage` với key `phone_store_token`, gọi `/auth/me` khi tải ứng dụng và tự gọi `/auth/refresh` khi access token đã hết hạn. Refresh token không được JavaScript đọc trực tiếp.

## Kiểm tra trước khi bàn giao

Chạy `npm run lint` và `npm run build` ở thư mục gốc. Lint và build chỉ kiểm tra frontend; hiện chưa có test tự động cho backend.
