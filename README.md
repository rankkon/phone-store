# Phone Store

Website thương mại điện tử bán điện thoại theo MERN Stack. Hướng dẫn này dành cho người mới clone repository và muốn chạy dự án trên máy cá nhân.

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
```

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
| Admin | `admin@phonestore.local` | `Admin@123` |
| Staff | `staff@phonestore.local` | `Staff@123` |
| Client (Customer) | `client@phonestore.local` | `Client@123` |

Không cần chạy seed để có ba tài khoản này.

Để có hãng, sản phẩm và voucher mẫu phục vụ trải nghiệm storefront, chạy một lần:

Sau khi MongoDB đã kết nối được, chạy một lần:

```bash
npm run seed --prefix server
```

Lệnh seed không xóa dữ liệu hiện có. Nó chỉ tạo hãng, sản phẩm và voucher `WELCOME10` nếu chúng chưa tồn tại.

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
- Đăng nhập bằng tài khoản Admin rồi vào **Quản trị** để thêm hãng/sản phẩm.
- Đăng nhập bằng Client để xem sản phẩm, thêm giỏ, áp dụng `WELCOME10` và đặt đơn COD.

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
| Frontend không gọi được API | Chạy backend, kiểm tra `VITE_API_URL` và `CLIENT_URL`, sau đó khởi động lại Vite. |
