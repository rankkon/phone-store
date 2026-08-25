# Phone Store

Website thương mại điện tử bán điện thoại theo MERN Stack. Dự án có storefront, quản trị sản phẩm/đơn/người dùng, bán hàng tại quầy POS, Telesale, dashboard, thanh toán COD và tích hợp VNPay Sandbox. Hướng dẫn này dành cho người mới clone repository và muốn chạy dự án trên máy cá nhân.

Thông tin nhanh về cấu trúc và các chức năng đã có: [CODEBASE_SUMMARY.md](CODEBASE_SUMMARY.md). Phạm vi/định hướng toàn dự án: [PHONE_STORE_FINAL_PROJECT_SPEC.md](PHONE_STORE_FINAL_PROJECT_SPEC.md).

## 1. Yêu cầu trước khi bắt đầu

- Git.
- Node.js 20+ và npm 10+.
- Một MongoDB đang hoạt động: MongoDB Community local hoặc MongoDB Atlas.
- Tài khoản Cloudinary nếu muốn kiểm tra upload ảnh sản phẩm.

Kiểm tra Node.js và npm:

```bash
node --version
npm --version
```

## 2. Clone và cài dependencies

Thay `<repository-url>` bằng URL GitHub của repository:

```bash
git clone <repository-url>
cd phone-store
npm install
npm run install:all
```

`npm install` cài lệnh chạy đồng thời ở thư mục gốc; `npm run install:all` cài packages cho cả `server` và `client`.

## 3. Cấu hình biến môi trường

Không commit các file `.env`.

### Backend

Tạo `server/.env` từ file mẫu.

Windows PowerShell:

```powershell
Copy-Item server\.env.example server\.env
```

macOS/Linux:

```bash
cp server/.env.example server/.env
```

Mở `server/.env` và điền tối thiểu:

```env
PORT=5000
NODE_ENV=development

MONGODB_URI=mongodb://127.0.0.1:27017/phone-store
CLIENT_URL=http://localhost:5173

JWT_SECRET=thay-bang-chuoi-bi-mat-dai-va-kho-doan
JWT_EXPIRES_IN=1d
JWT_REFRESH_SECRET=thay-bang-chuoi-bi-mat-khac-va-dai
JWT_REFRESH_EXPIRES_IN=7d

DEFAULT_SHIPPING_FEE=30000
FREE_SHIPPING_THRESHOLD=15000000
```

#### Xác minh email và mã bảo mật qua SMTP

SMTP được dùng để gửi mã OTP 6 số khi đăng ký, xác minh email, đổi mật khẩu trong hồ sơ và quên mật khẩu. Mỗi mã có hiệu lực 10 phút, dùng một lần và bị giới hạn số lần nhập sai.

```env
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-smtp-username
SMTP_PASSWORD=your-smtp-password
SMTP_FROM=Phone Store <no-reply@example.com>
```

Không có cấu hình SMTP, không thể đăng ký tài khoản mới hoặc thực hiện các thao tác cần mã email. Tài khoản Customer mới chỉ được mua hàng sau khi đã xác minh email trong hồ sơ.

#### MongoDB local

Giữ `MONGODB_URI` như ví dụ trên và đảm bảo dịch vụ MongoDB đã chạy trước khi chạy backend.

#### MongoDB Atlas

1. Tạo Database User và cấp quyền truy cập database.
2. Trong **Network Access**, thêm IP hiện tại của bạn (chỉ dùng `0.0.0.0/0` cho môi trường demo, không dùng cho production).
3. Lấy connection string ở Atlas rồi đặt vào `MONGODB_URI`. Mật khẩu có ký tự đặc biệt phải được URL-encode.

Ví dụ dạng SRV thông thường:

```env
MONGODB_URI=mongodb+srv://<username>:<url-encoded-password>@<cluster-host>/phone-store?retryWrites=true&w=majority
```

Nếu Node.js báo `querySrv ECONNREFUSED`, DNS trên máy/mạng không tra được SRV record. Hãy dùng **Standard connection string** của Atlas thay vì `mongodb+srv`, có dạng:

```env
MONGODB_URI=mongodb://<username>:<url-encoded-password>@<host-1>:27017,<host-2>:27017,<host-3>:27017/phone-store?authSource=admin&replicaSet=<replica-set>&tls=true&retryWrites=true&w=majority
```

Lấy chính xác `<host-*>` và `<replica-set>` từ Atlas; không tự đoán giá trị này.

#### Cloudinary (để upload ảnh)

Thêm các biến sau vào `server/.env` nếu cần upload ảnh. Nếu để trống, website vẫn chạy nhưng API upload ảnh trả về lỗi cấu hình.

```env
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

#### VNPay Sandbox (tùy chọn)

Chỉ cần cấu hình khi muốn thanh toán VNPay. Không commit thông tin do VNPay cấp và không dùng thông tin Sandbox cho production. Đăng ký Sandbox để nhận `VNP_TMNCODE` và `VNP_HASHSECRET` tại [VNPay Sandbox](https://sandbox.vnpayment.vn/devreg/); mã mẫu cũ `2QX1X1TW` không còn được gateway chấp nhận.

```env
VNP_TMNCODE=
VNP_HASHSECRET=
VNP_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNP_RETURNURL=http://localhost:5000/api/payments/vnpay/return
```

Nếu thiếu một trong bốn biến này, checkout COD vẫn dùng được nhưng request tạo thanh toán VNPay sẽ báo lỗi cấu hình. Với đơn VNPay ở trạng thái chờ thanh toán, khách có thể mở lại liên kết bằng nút **Tiếp tục thanh toán qua VNPay** ở trang chi tiết đơn; hệ thống không tạo thêm đơn hoặc trừ kho lần nữa.

### Frontend

Tạo `client/.env`:

Windows PowerShell:

```powershell
Copy-Item client\.env.example client\.env
```

macOS/Linux:

```bash
cp client/.env.example client/.env
```

Nội dung mặc định phù hợp khi backend chạy local:

```env
VITE_API_URL=http://localhost:5000/api
```

## 4. Tài khoản mặc định và dữ liệu demo

Mỗi khi backend kết nối MongoDB, hệ thống tự kiểm tra và tạo các tài khoản sau nếu chúng chưa tồn tại:

| Vai trò | Email | Mật khẩu |
|---|---|---|
| Admin | `admin@gmail.com` | `admin123` |
| Staff | `staff@gmail.com` | `staff123` |
| Customer | `customer@gmail.com` | `customer123` |

Không cần chạy seed để có ba tài khoản này.

Ba tài khoản demo có trạng thái email đã xác minh để không làm gián đoạn dữ liệu demo. Chúng không gửi mã OTP qua email vì các địa chỉ Gmail ngắn này chỉ dành cho demo; hãy đăng ký Customer bằng email thật của bạn để kiểm tra luồng mã email.

Để có hãng, sản phẩm và voucher mẫu phục vụ trải nghiệm storefront, chạy một lần:

Sau khi MongoDB đã kết nối được, chạy một lần:

```bash
npm run seed --prefix server
```

Lệnh seed không xóa hoặc ghi đè dữ liệu hiện có. Nó bổ sung idempotent 10 hãng, 14 sản phẩm với nhiều biến thể RAM/bộ nhớ/màu, 8 voucher, 8 Customer mẫu và 22 đơn lịch sử năm 2026 để kiểm thử dashboard doanh thu, lợi nhuận, trạng thái đơn và CRM. Chạy lại lệnh sẽ không nhân bản dữ liệu.

## 5. Chạy dự án

### Cách A — chạy từng phần ở hai terminal

Terminal 1:

```bash
cd server
npm start
```

Terminal 2:

```bash
cd client
npm run dev
```

Khi phát triển backend, có thể dùng `npm run dev` trong thư mục `server` để tự khởi động lại khi sửa file.

### Cách B — chạy đồng thời từ thư mục gốc

```bash
npm run dev
```

## 6. Kiểm tra hoạt động

- Frontend: `http://localhost:5173`
- Backend health check: `http://localhost:5000/api/health`
- Đăng nhập bằng tài khoản Admin rồi vào **Quản trị** để thêm hãng/sản phẩm/voucher, quản lý khách hàng, xuất CSV và xem dashboard theo kênh Online/POS.
- Đăng nhập bằng tài khoản Staff để xem, lọc, xuất đơn, cập nhật đơn/thanh toán, xử lý yêu cầu hủy và tạo đơn POS hoặc Telesale.
- Đăng nhập bằng Customer để xem sản phẩm, thêm giỏ, áp dụng `WELCOME10`, đặt COD hoặc thử VNPay khi đã cấu hình.
- Mở chi tiết sản phẩm để xem thống kê/lọc đánh giá theo sao; Customer đã xác minh email có một đánh giá duy nhất trên mỗi sản phẩm và chỉ có thể sửa đánh giá của chính mình.
- Mở menu tên tài khoản để vào **Ưu đãi của tôi**, hồ sơ hoặc đơn hàng; footer có các liên kết Về chúng tôi, Liên hệ và hỗ trợ khách hàng.
- Đăng nhập Admin và vào **Tổng quan** để xem biểu đồ doanh thu/lợi nhuận; có thể chọn nhóm theo ngày, tháng, năm, khoảng thời gian và line hiển thị.
- Tại **Đơn hàng**, thử tạo đơn POS hoặc Telesale, tra cứu khách theo email/số điện thoại, chọn phương thức thanh toán, sau đó mở chi tiết đơn để in hóa đơn hoặc phiếu giao hàng.

Trước khi push code, chạy:

```bash
npm run lint
npm run build
```

## Lỗi thường gặp

| Hiện tượng | Cách xử lý |
|---|---|
| `MONGODB_URI is required` | Kiểm tra có `server/.env` và có giá trị `MONGODB_URI`. |
| `querySrv ECONNREFUSED` | Dùng Standard connection string của Atlas như hướng dẫn ở trên, hoặc kiểm tra DNS/VPN/mạng. |
| Không kết nối được Atlas | Kiểm tra Network Access, username/password và URL-encoding mật khẩu. |
| Upload ảnh báo Cloudinary chưa cấu hình | Điền đủ ba biến `CLOUDINARY_*` rồi khởi động lại backend. |
| VNPay báo chưa cấu hình hoặc mã website không hợp lệ | Đăng ký Sandbox để nhận `VNP_TMNCODE` và `VNP_HASHSECRET` riêng, điền đủ bốn biến `VNP_*` trong `server/.env`, rồi khởi động lại backend. |
| Đăng ký, xác minh hoặc quên mật khẩu báo chưa cấu hình email | Điền đủ các biến `SMTP_*` trong `server/.env`, sau đó khởi động lại backend. |
| Frontend không gọi được API | Chạy backend, kiểm tra `VITE_API_URL` và `CLIENT_URL`, sau đó khởi động lại Vite. |
