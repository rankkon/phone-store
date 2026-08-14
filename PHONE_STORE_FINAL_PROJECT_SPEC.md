# PHONE STORE — FINAL PROJECT SPECIFICATION

> **Trạng thái:** Đã chốt phạm vi và công nghệ.  
> **Thời gian thực hiện:** 1 tháng — 4 tuần.  
> **Nhân sự:** Nhóm 2 thành viên.  
> **Mục đích:** Tài liệu nguồn chính để nhóm và AI agent đọc trước khi thiết kế, viết code hoặc thay đổi project.  
> **Tài liệu này thay thế bản `AGENT_PROJECT_MASTER_PLAN.md` trước đó nếu có nội dung mâu thuẫn.**
> **Trạng thái source hiện tại:** Đã có storefront, phân quyền, quản lý catalog/đơn/người dùng/voucher, dashboard, hủy đơn, VNPay, refresh token, OTP email, đánh giá sản phẩm, ưu đãi khả dụng, trang About/Contact và footer. Đã bổ sung hệ thống tạo đơn trực tiếp tại quầy (POS), chế độ bán hàng qua điện thoại (Telesale) hỗ trợ COD/Chuyển khoản và tính phí ship theo chính sách Freeship, in hóa đơn chuyên nghiệp, quản lý CRM đồng bộ thông minh theo Email và SĐT (tự động gợi ý khi trùng SĐT, sinh Email ảo cho khách lớn tuổi), nút chỉnh sửa hồ sơ khách hàng cho Admin. Chưa có ảnh đại diện, test tự động hoặc cấu hình triển khai; gửi email cần SMTP trong `.env`.

---

# 1. Thông tin đề tài

## 1.1. Tên đề tài

**Xây dựng website thương mại điện tử bán điện thoại sử dụng MERN Stack**

Có thể sử dụng tên đầy đủ trong báo cáo:

> **Xây dựng website thương mại điện tử bán điện thoại tích hợp quản lý kho và đơn hàng sử dụng MongoDB, Express.js, React.js và Node.js**

Không bắt buộc đưa VNPay vào tên đề tài vì thanh toán trực tuyến là phần mở rộng nếu tiến độ cho phép.

## 1.2. Mục tiêu

Xây dựng một website bán điện thoại có hai khu vực chính:

- Khu vực khách hàng để xem sản phẩm, tìm kiếm, lọc, quản lý giỏ hàng, sử dụng voucher, đặt hàng và theo dõi đơn hàng.
- Khu vực quản trị để quản lý hãng điện thoại, sản phẩm, biến thể, giá, tồn kho, đơn hàng, người dùng và thống kê cơ bản.

Project phải thể hiện được các nội dung quan trọng:

- Xây dựng ứng dụng full-stack.
- Thiết kế và sử dụng REST API.
- Xác thực bằng JWT.
- Phân quyền Customer, Staff và Admin.
- Thiết kế cơ sở dữ liệu MongoDB.
- Quản lý sản phẩm có nhiều biến thể.
- Quản lý tồn kho theo từng biến thể.
- Xử lý giỏ hàng, voucher và đơn hàng.
- Đánh giá sản phẩm theo số sao và nhận xét.
- Lưu ảnh sản phẩm bằng Cloudinary.
- Triển khai website để có thể demo.

---

# 2. Công nghệ đã chốt

## 2.1. Công nghệ chính

| Thành phần | Công nghệ |
|---|---|
| Frontend | React.js |
| Backend | Node.js |
| Backend framework | Express.js |
| Database | MongoDB |
| Lưu trữ hình ảnh | Cloudinary |
| Xác thực | JWT |
| Giao tiếp hệ thống | REST API |

Bốn công nghệ chính được gọi chung là **MERN Stack**:

```text
MongoDB
Express.js
React.js
Node.js
```

## 2.2. Thư viện hỗ trợ cần thiết

Các thư viện dưới đây chỉ hỗ trợ việc phát triển, không được xem là công nghệ chính riêng biệt trong báo cáo.

### Frontend

```text
Vite                 Khởi tạo và chạy project React
react-router-dom      Điều hướng giữa các trang
axios                 Gửi request tới backend
CSS                   Thiết kế giao diện
```

Có thể dùng thư viện biểu đồ nhỏ như `recharts` nếu cần hiển thị doanh thu, nhưng không bắt buộc nếu nhóm có thể trình bày bằng bảng và thẻ thống kê.

### Backend

```text
mongoose              Làm việc với MongoDB
jsonwebtoken          Tạo và kiểm tra JWT
bcryptjs              Mã hóa mật khẩu
cors                  Cho phép frontend gọi backend
dotenv                Đọc biến môi trường
multer                Nhận file ảnh upload
cloudinary            Upload và xóa ảnh trên Cloudinary
nodemailer            Gửi mã xác minh và mã bảo mật qua email
```

## 2.3. Dịch vụ triển khai dự kiến

```text
Frontend: Vercel
Backend: Render
Database: MongoDB Atlas
Images: Cloudinary
```

Đây là các dịch vụ triển khai, không phải công nghệ cốt lõi của đề tài.

## 2.4. Các công nghệ không sử dụng

Không thêm các công nghệ sau trong project một tháng:

- Microservices.
- Docker.
- Kubernetes.
- Kafka.
- Redis.
- Elasticsearch.
- GraphQL.
- Blockchain.
- AI chatbot.
- AI recommendation.
- Mobile application.
- GitHub Actions.
- Hệ thống CI/CD phức tạp.
- Nhiều cổng thanh toán cùng lúc.
- Redux nếu chưa thật sự cần.
- Kiến trúc quá phức tạp ngoài mô hình REST API thông thường.

Swagger, Jest và Supertest không phải yêu cầu bắt buộc. Nếu còn thời gian, nhóm có thể bổ sung tài liệu API hoặc một số test quan trọng, nhưng không được ảnh hưởng tiến độ chức năng chính.

---

# 3. Phạm vi chức năng đã chốt

## 3.1. Vai trò người dùng

Hệ thống có ba vai trò:

```text
CUSTOMER
STAFF
ADMIN
```

### Customer

- Sử dụng website mua hàng.
- Chỉ xem và quản lý dữ liệu của chính mình.

### Staff

- Xem và xử lý đơn hàng.
- Không được quản lý sản phẩm, người dùng và phân quyền.

### Admin

- Có toàn quyền quản trị hệ thống.

Phân quyền phải được kiểm tra tại backend, không chỉ ẩn nút trên frontend.

---

# 4. Phân hệ khách hàng

## 4.1. Quản lý tài khoản

Chức năng bắt buộc:

- Đăng ký tài khoản.
- Đăng nhập.
- Đăng xuất.
- Xem hồ sơ cá nhân.
- Cập nhật họ tên, số điện thoại và địa chỉ.
- Đổi mật khẩu.
- Xác thực bằng JWT.
- Không cho tài khoản bị khóa đăng nhập hoặc truy cập API được bảo vệ.

Đã triển khai thêm:

- Đăng ký gửi mã OTP 6 số; hồ sơ hiển thị trạng thái email và cho phép xác minh/gửi lại mã.
- Quên mật khẩu và đổi mật khẩu dùng OTP 6 số gửi qua email, có hiệu lực 10 phút.
- Refresh token xoay vòng trong cookie `httpOnly`; access token vẫn gửi bằng header JWT.

Chức năng chưa có: ảnh đại diện. Gửi email cần cấu hình `SMTP_*` ở backend.

## 4.2. Danh sách sản phẩm

Khách hàng có thể:

- Xem toàn bộ sản phẩm đang hoạt động.
- Xem sản phẩm theo hãng.
- Tìm kiếm theo tên hoặc mã sản phẩm.
- Lọc theo:
  - Hãng.
  - Khoảng giá.
  - Dung lượng RAM.
  - Bộ nhớ trong.
  - Màu sắc.
  - Trạng thái còn hàng.
- Sắp xếp:
  - Giá tăng dần.
  - Giá giảm dần.
  - Mới nhất.
- Phân trang danh sách sản phẩm.

## 4.3. Chi tiết sản phẩm

Trang chi tiết phải hiển thị:

- Tên sản phẩm.
- Hãng.
- Mã sản phẩm.
- Mô tả.
- Thư viện ảnh.
- Chip.
- Pin.
- Màn hình.
- Camera.
- Hệ điều hành.
- Các biến thể.
- Dung lượng RAM.
- Bộ nhớ trong.
- Màu sắc.
- Giá của biến thể.
- Số lượng tồn kho.
- Trạng thái còn hàng hoặc hết hàng.

Khách hàng phải chọn đúng biến thể trước khi thêm vào giỏ hàng.

## 4.4. Giỏ hàng

Khách hàng có thể:

- Thêm một biến thể vào giỏ.
- Tăng hoặc giảm số lượng.
- Xóa một sản phẩm.
- Xóa toàn bộ giỏ.
- Xem tạm tính.
- Chuyển sang trang đặt hàng.

Quy tắc:

- Số lượng tối thiểu là 1.
- Không được vượt số lượng tồn kho.
- Backend phải kiểm tra lại tồn kho.
- Không tin giá hoặc tổng tiền do frontend gửi lên.

## 4.5. Voucher

Hệ thống hỗ trợ hai loại voucher:

```text
PERCENT    Giảm theo phần trăm
FIXED      Giảm số tiền cố định
```

Voucher có thể có:

- Mã voucher.
- Loại giảm.
- Giá trị giảm.
- Giá trị đơn tối thiểu.
- Mức giảm tối đa.
- Ngày bắt đầu.
- Ngày kết thúc.
- Số lượt sử dụng.
- Trạng thái hoạt động.

Quy tắc:

- Mỗi đơn chỉ áp dụng một voucher.
- Backend kiểm tra tính hợp lệ.
- Voucher không hợp lệ phải trả thông báo rõ ràng.
- Tổng giảm giá không được lớn hơn giá trị hàng hóa.

## 4.6. Phí vận chuyển

Quy tắc demo mặc định:

```text
Phí vận chuyển thông thường: 30.000 VND
Miễn phí vận chuyển nếu giá trị sau giảm từ 15.000.000 VND
```

Giá trị này đặt trong file cấu hình hoặc biến môi trường.

## 4.7. Đặt hàng

Khách hàng nhập:

- Tên người nhận.
- Số điện thoại.
- Tỉnh/thành phố.
- Quận/huyện.
- Phường/xã.
- Địa chỉ chi tiết.
- Ghi chú.
- Voucher nếu có.
- Phương thức thanh toán.

Phương thức bắt buộc:

```text
COD — Thanh toán khi nhận hàng
```

Phương thức mở rộng nếu hoàn thành chức năng chính sớm:

```text
VNPay Sandbox
```

Khi đặt hàng:

1. Backend đọc lại sản phẩm và biến thể.
2. Backend kiểm tra tồn kho.
3. Backend tính lại giá.
4. Backend kiểm tra voucher.
5. Backend tính phí vận chuyển.
6. Backend tạo đơn hàng.
7. Backend trừ tồn kho.
8. Backend xóa giỏ hàng.

## 4.8. Quản lý đơn hàng của khách

Khách hàng có thể:

- Xem lịch sử đơn hàng.
- Tìm đơn theo mã.
- Lọc theo trạng thái.
- Xem chi tiết đơn.
- Xem lịch sử trạng thái.
- Gửi yêu cầu hủy khi đơn còn ở trạng thái cho phép.

Chức năng hoàn trả có thể triển khai ở mức đơn giản nếu còn thời gian.

---

# 5. Phân hệ quản trị

## 5.1. Quản lý hãng điện thoại

Admin có thể:

- Thêm hãng.
- Sửa hãng.
- Ẩn hoặc hiện hãng.
- Upload logo hãng nếu cần.

Ví dụ:

```text
Apple
Samsung
Xiaomi
OPPO
vivo
realme
```

## 5.2. Quản lý sản phẩm

Admin có thể:

- Xem danh sách sản phẩm.
- Thêm sản phẩm.
- Sửa sản phẩm.
- Ẩn hoặc hiện sản phẩm.
- Upload nhiều ảnh lên Cloudinary.
- Xóa ảnh khỏi Cloudinary.
- Cập nhật thông số kỹ thuật.
- Quản lý biến thể.
- Cập nhật giá.
- Cập nhật tồn kho.

Không bắt buộc xóa cứng sản phẩm; ưu tiên chuyển `isActive` thành `false`.

## 5.3. Quản lý biến thể

Mỗi sản phẩm có nhiều biến thể theo:

- Dung lượng RAM.
- Bộ nhớ trong.
- Màu sắc.

Mỗi biến thể có:

- SKU duy nhất.
- Giá nhập.
- Giá bán.
- Số lượng tồn kho.
- Trạng thái hoạt động.

Ví dụ:

```text
iPhone 16 Pro
├── 8 GB / 128 GB / Titan Đen
├── 8 GB / 256 GB / Titan Đen
└── 8 GB / 256 GB / Titan Tự Nhiên
```

## 5.4. Quản lý đơn hàng

Admin và Staff có thể:

- Xem danh sách đơn.
- Tìm theo mã đơn.
- Tìm theo khách hàng.
- Lọc theo trạng thái.
- Xem chi tiết.
- Xác nhận đơn.
- Cập nhật trạng thái giao hàng.
- Xử lý yêu cầu hủy.

Admin và Staff không được chuyển trạng thái tùy ý; phải tuân theo luồng đã định nghĩa.

## 5.5. Quản lý người dùng

Chỉ Admin có thể:

- Xem danh sách tài khoản.
- Tìm kiếm theo tên hoặc email.
- Lọc theo vai trò.
- Khóa hoặc mở khóa tài khoản.
- Chuyển Customer thành Staff.
- Chuyển Staff thành Customer.

Không cho Admin:

- Tự khóa tài khoản của mình.
- Tự hạ quyền tài khoản đang đăng nhập.

## 5.6. Báo cáo và thống kê

Admin có thể xem:

- Tổng số sản phẩm.
- Tổng số người dùng.
- Tổng số đơn hàng.
- Tổng doanh thu.
- Doanh thu theo tuần hoặc tháng.
- Số đơn theo trạng thái.
- Top sản phẩm bán chạy.
- Sản phẩm sắp hết hàng.

Doanh thu chỉ tính từ đơn đã hoàn thành.

Có thể trình bày bằng:

- Thẻ thống kê.
- Bảng.
- Biểu đồ đơn giản nếu nhóm dùng thư viện hỗ trợ.

---

# 6. Ma trận phân quyền

| Chức năng | Customer | Staff | Admin |
|---|:---:|:---:|:---:|
| Xem sản phẩm | Có | Có | Có |
| Tìm kiếm và lọc | Có | Có | Có |
| Quản lý hồ sơ cá nhân | Có | Có | Có |
| Sử dụng giỏ hàng | Có | Không | Không |
| Đặt hàng | Có | Không | Không |
| Xem đơn của mình | Có | Không | Không |
| Yêu cầu hủy đơn | Có | Không | Không |
| Xem toàn bộ đơn | Không | Có | Có |
| Xác nhận và cập nhật đơn | Không | Có | Có |
| Quản lý hãng | Không | Không | Có |
| Quản lý sản phẩm | Không | Không | Có |
| Quản lý kho | Không | Không | Có |
| Quản lý voucher | Không | Không | Có |
| Quản lý người dùng | Không | Không | Có |
| Phân quyền | Không | Không | Có |
| Xem thống kê | Không | Không | Có |

---

# 7. Kiến trúc hệ thống

## 7.1. Sơ đồ

```text
Người dùng
    ↓
React.js Frontend
    ↓ REST API
Node.js + Express.js Backend
    ├── MongoDB
    └── Cloudinary
```

## 7.2. Backend

Sử dụng cấu trúc MVC đơn giản:

```text
Route
  ↓
Middleware
  ↓
Controller
  ↓
Model
  ↓
MongoDB
```

Nếu một nghiệp vụ trở nên dài, có thể tách sang `services`, nhưng không cần tạo quá nhiều lớp ngay từ đầu.

## 7.3. Nguyên tắc

- Frontend không truy cập trực tiếp MongoDB.
- Frontend gọi backend bằng Axios.
- Backend kiểm tra dữ liệu trước khi lưu.
- Backend kiểm tra JWT và role.
- Backend là nơi tính giá, voucher và tổng tiền.
- Backend giữ thông tin bí mật trong `.env`.
- Cloudinary API secret chỉ nằm ở backend.

---

# 8. Cấu trúc thư mục

```text
phone-store/
├── client/
│   ├── public/
│   ├── src/
│   │   ├── api/
│   │   ├── assets/
│   │   ├── components/
│   │   ├── context/
│   │   ├── pages/
│   │   │   ├── auth/
│   │   │   ├── customer/
│   │   │   └── admin/
│   │   ├── routes/
│   │   ├── utils/
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── .env.example
│   └── package.json
│
├── server/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middlewares/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── utils/
│   │   ├── app.js
│   │   └── server.js
│   ├── scripts/
│   │   └── seed.js
│   ├── .env.example
│   └── package.json
│
├── docs/
├── .gitignore
├── README.md
└── PHONE_STORE_FINAL_PROJECT_SPEC.md
```

Chỉ tạo `services` khi cần tách nghiệp vụ như tính giá, voucher hoặc đặt hàng.

---

# 9. Thiết kế cơ sở dữ liệu

Các collection chính:

```text
users
brands
products
carts
vouchers
orders
emailVerificationCodes
```

`emailVerificationCodes` dùng chung cho xác minh email, đổi mật khẩu và quên mật khẩu. Mã được hash, dùng một lần và hết hạn sau 10 phút.

Không cần `auditLogs` trong phạm vi bắt buộc.

---

## 9.1. Users

```js
{
  _id: ObjectId,

  fullName: String,
  email: String,
  passwordHash: String,
  phone: String,

  address: {
    recipientName: String,
    phone: String,
    province: String,
    district: String,
    ward: String,
    detail: String
  },

  avatarUrl: String,

  role: "CUSTOMER" | "STAFF" | "ADMIN",
  status: "ACTIVE" | "BLOCKED",

  createdAt: Date,
  updatedAt: Date
}
```

Quy tắc:

- Email duy nhất.
- Email được chuyển về chữ thường.
- Không lưu mật khẩu dạng thường.
- Không trả `passwordHash` về frontend.
- Tài khoản mới mặc định là Customer.

---

## 9.2. Brands

```js
{
  _id: ObjectId,

  name: String,
  slug: String,
  logoUrl: String,
  logoPublicId: String,

  isActive: Boolean,

  createdAt: Date,
  updatedAt: Date
}
```

---

## 9.3. Products

```js
{
  _id: ObjectId,

  name: String,
  slug: String,
  modelCode: String,
  brandId: ObjectId,

  description: String,

  specifications: {
    chip: String,
    battery: String,
    screen: String,
    rearCamera: String,
    frontCamera: String,
    operatingSystem: String
  },

  images: [
    {
      url: String,
      publicId: String,
      alt: String
    }
  ],

  variants: [
    {
      _id: ObjectId,
      sku: String,

      ram: String,
      storage: String,
      color: String,

      costPrice: Number,
      salePrice: Number,
      stock: Number,

      isActive: Boolean
    }
  ],

  isActive: Boolean,

  createdAt: Date,
  updatedAt: Date
}
```

Quy tắc:

- `modelCode` duy nhất.
- `sku` duy nhất.
- Giá không âm.
- Tồn kho không âm.
- Giá và tồn kho nằm trong từng biến thể.
- Trên giao diện dùng từ **Bộ nhớ trong**, trong code dùng `storage`.
- Không sử dụng tên trường `rom`.

---

## 9.4. Carts

```js
{
  _id: ObjectId,
  userId: ObjectId,

  items: [
    {
      productId: ObjectId,
      variantId: ObjectId,
      quantity: Number
    }
  ],

  createdAt: Date,
  updatedAt: Date
}
```

Quy tắc:

- Một user có một giỏ hàng.
- Không lưu giá làm nguồn dữ liệu chính trong cart.
- Khi hiển thị cart, backend lấy giá hiện tại từ product.
- Không cho quantity vượt stock.

---

## 9.5. Vouchers

```js
{
  _id: ObjectId,

  code: String,
  type: "PERCENT" | "FIXED",
  value: Number,

  minOrderValue: Number,
  maxDiscount: Number,

  startAt: Date,
  endAt: Date,

  usageLimit: Number,
  usedCount: Number,

  isActive: Boolean,

  createdAt: Date,
  updatedAt: Date
}
```

---

## 9.6. Orders

```js
{
  _id: ObjectId,

  orderCode: String,
  userId: ObjectId,

  items: [
    {
      productId: ObjectId,
      variantId: ObjectId,

      productName: String,
      modelCode: String,
      sku: String,

      ram: String,
      storage: String,
      color: String,

      imageUrl: String,
      unitPrice: Number,
      quantity: Number,
      lineTotal: Number
    }
  ],

  shippingAddress: {
    recipientName: String,
    phone: String,
    province: String,
    district: String,
    ward: String,
    detail: String
  },

  note: String,

  pricing: {
    subtotal: Number,
    discount: Number,
    shippingFee: Number,
    total: Number
  },

  voucher: {
    code: String,
    type: String,
    value: Number
  },

  payment: {
    method: "COD" | "VNPAY",
    status: "UNPAID" | "PENDING" | "PAID" | "FAILED",
    requestRefs: [String],
    transactionRef: String,
    paidAt: Date
  },

  status:
    "PENDING"
    | "CONFIRMED"
    | "PREPARING"
    | "SHIPPING"
    | "COMPLETED"
    | "CANCEL_REQUESTED"
    | "CANCELLED",

  statusHistory: [
    {
      status: String,
      note: String,
      changedBy: ObjectId,
      changedAt: Date
    }
  ],

  stockRestored: Boolean,

  createdAt: Date,
  updatedAt: Date
}
```

Đơn hàng phải lưu snapshot tên, cấu hình và giá sản phẩm tại thời điểm đặt hàng.

---

## 9.7. Email verification code

Đã triển khai cho xác minh email, đổi mật khẩu và quên mật khẩu:

```js
{
  _id: ObjectId,
  userId: ObjectId,
  purpose: 'EMAIL_VERIFICATION' | 'PASSWORD_CHANGE' | 'PASSWORD_RESET',
  codeHash: String,
  expiresAt: Date,
  sentAt: Date,
  attempts: Number,
  usedAt: Date,
  createdAt: Date
}
```

---

# 10. Quy tắc nghiệp vụ quan trọng

## 10.1. Tính tổng tiền

```text
subtotal = Tổng giá từng sản phẩm × số lượng
discount = Giá trị giảm hợp lệ
shippingFee = Phí vận chuyển
total = subtotal - discount + shippingFee
```

Tất cả giá trị được backend tính lại.

## 10.2. Tồn kho

Backend phải kiểm tra tồn kho khi:

- Thêm vào giỏ.
- Thay đổi số lượng.
- Xác nhận đặt hàng.

Khi đặt hàng thành công:

- Trừ tồn kho.
- Tạo đơn.
- Tăng số lượt dùng voucher.
- Xóa giỏ hàng.

Nếu đơn bị hủy:

- Cộng lại tồn kho.
- Chỉ cộng một lần.
- Sử dụng `stockRestored` để tránh cộng lặp.

Nên sử dụng MongoDB transaction khi tạo đơn để tránh tình trạng trừ kho nhưng không tạo được đơn.

## 10.3. Trạng thái đơn hàng

Luồng chính:

```text
PENDING
    ↓
CONFIRMED
    ↓
PREPARING
    ↓
SHIPPING
    ↓
COMPLETED
```

Luồng hủy:

```text
PENDING → CANCEL_REQUESTED → CANCELLED
CONFIRMED → CANCEL_REQUESTED → CANCELLED
```

Customer chỉ gửi yêu cầu hủy ở `PENDING` hoặc `CONFIRMED`. Staff/Admin duyệt hoặc từ chối yêu cầu qua API riêng; trong nghiệp vụ vận hành, họ cũng có thể hủy trực tiếp đơn đang ở `PENDING`, `CONFIRMED`, `PREPARING` hoặc `SHIPPING`. Khi hủy phải hoàn kho một lần.

Không được chuyển trạng thái tùy ý.

## 10.4. Trạng thái hiển thị

| Database | Giao diện |
|---|---|
| `PENDING` | Chờ xác nhận |
| `CONFIRMED` | Đã xác nhận |
| `PREPARING` | Đang chuẩn bị hàng |
| `SHIPPING` | Đang giao |
| `COMPLETED` | Đã hoàn thành |
| `CANCEL_REQUESTED` | Đang yêu cầu hủy |
| `CANCELLED` | Đã hủy |

## 10.5. Thanh toán COD

Khi tạo đơn:

```text
payment.method = COD
payment.status = UNPAID
order.status = PENDING
```

Khi đơn hoàn thành:

```text
payment.status = PAID
order.status = COMPLETED
```

## 10.6. VNPay Sandbox

VNPay là phần mở rộng, chỉ thực hiện sau khi COD và quản lý đơn hoạt động ổn định.

Nếu triển khai:

- Chỉ tích hợp VNPay.
- Không thêm MoMo hoặc ZaloPay.
- Backend tạo URL thanh toán.
- Đơn chưa thanh toán phải có thể tạo lại URL thanh toán mà không tạo thêm order hoặc trừ stock lần nữa.
- Backend xác minh chữ ký kết quả.
- Không tin dữ liệu thanh toán do frontend gửi.
- Giao dịch thành công cập nhật `PAID`.
- Giao dịch thất bại cập nhật `FAILED`.
- Không xử lý cùng một callback hai lần.

---

# 11. API dự kiến

Base URL:

```text
/api
```

## 11.1. Auth

```text
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
POST   /api/auth/refresh
GET    /api/auth/me
PATCH  /api/auth/profile
POST   /api/auth/email-verification-code
POST   /api/auth/verify-email
POST   /api/auth/password-change-code
PATCH  /api/auth/change-password
POST   /api/auth/forgot-password
POST   /api/auth/reset-password
```

## 11.2. Brands

```text
GET    /api/brands

GET    /api/admin/brands
POST   /api/admin/brands
PATCH  /api/admin/brands/:id
PATCH  /api/admin/brands/:id/status
```

## 11.3. Products

```text
GET    /api/products
GET    /api/products/:slug

GET    /api/admin/products
POST   /api/admin/products
GET    /api/admin/products/:id
PATCH  /api/admin/products/:id
PATCH  /api/admin/products/:id/status

POST   /api/admin/products/:id/images
DELETE /api/admin/products/:id/images/:imageId

POST   /api/admin/products/:id/variants
PATCH  /api/admin/products/:id/variants/:variantId
```

Query sản phẩm:

```text
/api/products
?search=iphone
&brand=apple
&minPrice=10000000
&maxPrice=30000000
&ram=8GB
&storage=256GB
&color=Black
&inStock=true
&sort=price_asc
&page=1
&limit=12
```

## 11.4. Cart

```text
GET    /api/cart
POST   /api/cart/items
PATCH  /api/cart/items/:variantId
DELETE /api/cart/items/:variantId
DELETE /api/cart
```

## 11.5. Voucher

```text
POST   /api/vouchers/validate

GET    /api/admin/vouchers
POST   /api/admin/vouchers
PATCH  /api/admin/vouchers/:id
PATCH  /api/admin/vouchers/:id/status
DELETE /api/admin/vouchers/:id

GET    /api/vouchers/available
```

## 11.5.1. Reviews

```text
GET    /api/reviews?productId=:id&rating=1..5&page=&limit=
GET    /api/reviews/mine?productId=:id      Customer
POST   /api/reviews                         Customer đã xác minh email
PATCH  /api/reviews/:reviewId               Customer đã xác minh email, chỉ sửa đánh giá của chính mình
```

## 11.6. Order

Customer:

```text
POST   /api/orders
GET    /api/orders/my-orders
GET    /api/orders/my-orders/:orderCode
POST   /api/orders/:id/cancel-request
```

Admin/Staff:

```text
GET    /api/management/orders
GET    /api/management/orders/:id
PATCH  /api/management/orders/:id/status
POST   /api/management/orders/:id/cancel/approve
POST   /api/management/orders/:id/cancel/reject
```

## 11.7. User management

```text
GET    /api/admin/users
PATCH  /api/admin/users/:id/status
PATCH  /api/admin/users/:id/role
```

## 11.8. Dashboard

```text
GET    /api/admin/dashboard/overview
GET    /api/admin/dashboard/revenue
GET    /api/admin/dashboard/top-products
GET    /api/admin/dashboard/low-stock
```

## 11.9. Payment optional

```text
POST   /api/payments/vnpay/create
POST   /api/payments/vnpay/orders/:orderCode/retry
GET    /api/payments/vnpay/return
```

---

# 12. Danh sách màn hình

## 12.1. Khách hàng

```text
Trang chủ
Danh sách sản phẩm
Chi tiết sản phẩm
Đăng ký
Đăng nhập
Quên mật khẩu và đặt lại mật khẩu
Hồ sơ cá nhân
Giỏ hàng
Đặt hàng
Đặt hàng thành công
Lịch sử đơn
Chi tiết đơn
```

## 12.2. Admin và Staff

```text
Dashboard — Admin
Quản lý hãng — Admin
Danh sách sản phẩm — Admin
Thêm sản phẩm — Admin
Sửa sản phẩm — Admin
Quản lý đơn — Admin và Staff
Chi tiết đơn — Admin và Staff
Quản lý người dùng — Admin
Quản lý voucher — Admin
Ưu đãi của tôi — Customer
Về chúng tôi
Liên hệ
```

---

# 13. Bảo mật tối thiểu

- Hash mật khẩu bằng bcrypt.
- Tạo JWT sau khi đăng nhập.
- Xác minh JWT ở các API được bảo vệ.
- Kiểm tra role ở backend.
- Kiểm tra người dùng có bị khóa không.
- Validate email, mật khẩu, giá, stock và quantity.
- Không trả password hash về frontend.
- Không đưa secret vào GitHub.
- Sử dụng `.env`.
- Chỉ backend biết MongoDB URI, JWT secret và Cloudinary secret.
- Kiểm tra loại và kích thước file ảnh.
- Customer chỉ xem được đơn của chính mình.
- Backend tự tính giá và tổng tiền.
- Không cho frontend tự gửi role khi đăng ký.

---

# 14. Biến môi trường

## Backend `.env.example`

```env
PORT=5000
NODE_ENV=development

MONGODB_URI=
CLIENT_URL=http://localhost:5173

JWT_SECRET=
JWT_EXPIRES_IN=1d

CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

DEFAULT_SHIPPING_FEE=30000
FREE_SHIPPING_THRESHOLD=15000000

SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=

VNP_TMNCODE=
VNP_HASHSECRET=
VNP_URL=
VNP_RETURNURL=
```

Các biến SMTP và VNPay chỉ cần điền nếu triển khai chức năng tương ứng.
Không hard-code hoặc commit `JWT_SECRET`, `VNP_HASHSECRET` hay thông tin truy cập dịch vụ.

## Frontend `.env.example`

```env
VITE_API_URL=http://localhost:5000/api
```

---

# 15. Kế hoạch thực hiện trong 4 tuần

Nguyên tắc phân chia:

- Thành viên 1 tập trung backend nhưng vẫn hỗ trợ tích hợp frontend.
- Thành viên 2 tập trung frontend nhưng vẫn hỗ trợ dữ liệu, kiểm thử và tích hợp.
- Mỗi tuần cả hai phải có khối lượng tương đương.
- Không chờ tuần cuối mới tích hợp.
- Cuối mỗi tuần phải có sản phẩm chạy được.

---

## TUẦN 1 — Chốt đề tài, khởi tạo, cơ sở dữ liệu và tài khoản

### Mục tiêu

- Chốt yêu cầu và công nghệ.
- Project frontend và backend chạy được.
- Kết nối MongoDB.
- Đăng ký và đăng nhập hoạt động.
- Có model hãng và sản phẩm.
- Có giao diện và API quản lý sản phẩm cơ bản.

### Công việc chung

- Chốt tên đề tài.
- Chốt phạm vi chức năng.
- Chốt MERN Stack và Cloudinary.
- Tạo GitHub repository.
- Thống nhất quy ước code và branch.
- Thiết kế database.
- Phác thảo giao diện.
- Chuẩn bị dữ liệu mẫu.

### Thành viên 1

- Khởi tạo backend Node.js và Express.js.
- Kết nối MongoDB bằng Mongoose.
- Tạo cấu trúc routes, controllers, models và middlewares.
- Tạo User model.
- Làm register, login, JWT và authorization middleware.
- Tạo Brand và Product model.
- Tạo API quản lý hãng và sản phẩm cơ bản.
- Cấu hình Cloudinary và API upload ảnh.
- Tạo tài khoản seed Admin, Staff và Customer.

### Thành viên 2

- Khởi tạo frontend React.js.
- Cấu hình React Router và Axios.
- Tạo layout khách hàng và quản trị.
- Làm giao diện register, login và profile.
- Làm route bảo vệ theo trạng thái đăng nhập.
- Làm giao diện danh sách hãng và sản phẩm Admin.
- Làm form thêm/sửa sản phẩm và biến thể.
- Kết nối giao diện với API backend.
- Chuẩn bị ảnh và dữ liệu sản phẩm mẫu.

### Kết quả tuần 1

- Đăng ký và đăng nhập được.
- Phân biệt được Customer, Staff và Admin.
- Admin thêm/sửa sản phẩm được.
- Sản phẩm có biến thể.
- Ảnh được upload Cloudinary.
- Dữ liệu lưu MongoDB.

---

## TUẦN 2 — Trang bán hàng, tìm kiếm, giỏ hàng và COD

### Mục tiêu

Hoàn thành luồng:

```text
Xem sản phẩm
→ Tìm kiếm và lọc
→ Xem chi tiết
→ Chọn biến thể
→ Thêm giỏ
→ Áp voucher
→ Đặt COD
```

### Thành viên 1

- Làm API danh sách sản phẩm.
- Làm tìm kiếm và lọc.
- Làm phân trang và sắp xếp.
- Làm API chi tiết sản phẩm.
- Tạo Cart model và API giỏ hàng.
- Tạo Voucher model và API kiểm tra voucher.
- Tạo hàm tính subtotal, discount, shipping fee và total.
- Tạo Order model.
- Làm API đặt hàng COD.
- Kiểm tra và trừ tồn kho.

### Thành viên 2

- Làm trang chủ.
- Làm danh sách sản phẩm.
- Làm thanh tìm kiếm.
- Làm bộ lọc và sắp xếp.
- Làm trang chi tiết.
- Làm chọn biến thể.
- Làm trang giỏ hàng.
- Làm trang checkout.
- Làm giao diện voucher và phí vận chuyển.
- Làm trang đặt hàng thành công.
- Làm lịch sử và chi tiết đơn.

### Công việc chung

- Kiểm tra luồng đặt hàng từ đầu đến cuối.
- Kiểm tra giá và tồn kho.
- Kiểm tra voucher.
- Sửa lỗi tích hợp frontend/backend.

### Kết quả tuần 2

- Customer mua hàng bằng COD được.
- Search và filter hoạt động.
- Cart hoạt động.
- Voucher hoạt động.
- Stock giảm sau khi đặt hàng.
- Customer xem được đơn đã mua.

---

## TUẦN 3 — Quản lý đơn, người dùng và dashboard

### Mục tiêu

- Staff xử lý được đơn.
- Admin quản lý được tài khoản.
- Admin xem được thống kê.
- Luồng hủy đơn hoạt động.
- VNPay chỉ làm nếu các chức năng chính đã ổn.

### Thành viên 1

- Làm API danh sách đơn cho Admin/Staff.
- Làm API chi tiết đơn.
- Làm logic chuyển trạng thái.
- Làm xử lý yêu cầu hủy.
- Hoàn tồn kho khi hủy.
- Làm API quản lý người dùng.
- Làm API dashboard và thống kê.
- Làm VNPay Sandbox nếu đủ thời gian.

### Thành viên 2

- Làm giao diện quản lý đơn.
- Làm chi tiết và timeline đơn.
- Làm nút chuyển trạng thái hợp lệ.
- Làm giao diện xử lý yêu cầu hủy.
- Làm trang quản lý người dùng.
- Làm chức năng khóa/mở và thay đổi role.
- Làm dashboard.
- Làm thẻ thống kê, bảng top sản phẩm và tồn kho thấp.
- Làm trang kết quả VNPay nếu tính năng được triển khai.

### Công việc chung

- Kiểm tra quyền Staff.
- Kiểm tra quyền Admin.
- Kiểm tra Customer không xem đơn người khác.
- Kiểm tra trạng thái đơn.
- Kiểm tra hủy đơn và hoàn tồn kho.
- Kiểm tra doanh thu.

### Kết quả tuần 3

- Admin và Staff xử lý đơn được.
- Customer yêu cầu hủy được.
- Admin quản lý người dùng được.
- Dashboard hiển thị dữ liệu thật.
- VNPay hoạt động nếu còn đủ thời gian.

---

## TUẦN 4 — Hoàn thiện, kiểm thử, deploy và báo cáo

### Mục tiêu

- Project ổn định.
- Giao diện hoàn chỉnh.
- Website được deploy.
- Có tài liệu và kịch bản demo.
- Không còn lỗi nghiêm trọng.

### Thành viên 1

- Kiểm tra toàn bộ API.
- Kiểm tra authorization.
- Kiểm tra tính giá và tồn kho.
- Sửa lỗi backend.
- Chuẩn hóa response và error.
- Deploy backend lên Render.
- Cấu hình MongoDB Atlas production.
- Viết hướng dẫn API hoặc Postman collection.
- Hỗ trợ viết phần backend và database trong báo cáo.

### Thành viên 2

- Hoàn thiện responsive.
- Thêm loading, error và empty state.
- Sửa lỗi giao diện.
- Kiểm tra toàn bộ form.
- Deploy frontend lên Vercel.
- Kiểm tra frontend production.
- Chuẩn bị ảnh chụp màn hình.
- Viết phần giao diện và chức năng trong báo cáo.

### Công việc chung

- Chạy thử từ tài khoản Customer.
- Chạy thử từ tài khoản Staff.
- Chạy thử từ tài khoản Admin.
- Kiểm tra COD.
- Kiểm tra voucher.
- Kiểm tra Cloudinary.
- Kiểm tra hủy đơn.
- Kiểm tra dashboard.
- Chuẩn bị dữ liệu demo.
- Hoàn thiện README.
- Hoàn thiện báo cáo.
- Chuẩn bị slide và kịch bản thuyết trình.
- Quay video demo nếu giảng viên yêu cầu.

### Kết quả tuần 4

- Frontend online.
- Backend online.
- MongoDB Atlas hoạt động.
- Cloudinary hoạt động.
- Có tài khoản demo.
- Có README.
- Có báo cáo.
- Có kịch bản demo.
- Các chức năng bắt buộc chạy ổn định.

---

# 16. Thứ tự ưu tiên

## P0 — Bắt buộc

- React frontend.
- Node.js + Express backend.
- MongoDB database.
- JWT authentication.
- Customer, Staff và Admin.
- Quản lý hãng.
- Quản lý sản phẩm.
- Biến thể RAM, bộ nhớ trong và màu.
- Cloudinary.
- Tìm kiếm và lọc.
- Giỏ hàng.
- Voucher.
- COD.
- Lịch sử đơn.
- Quản lý đơn.
- Quản lý người dùng.
- Thống kê cơ bản.
- Deploy.
- Báo cáo.

## P1 — Nên có

- Quên mật khẩu. — đã hoàn thành bằng OTP email.
- Yêu cầu hủy đơn.
- Timeline trạng thái.
- Biểu đồ doanh thu.
- VNPay Sandbox.
- Postman collection.

## P2 — Chỉ làm nếu còn thời gian

- Ảnh đại diện.
- Hoàn trả.
- Test tự động.
- Swagger.
- Animation giao diện.

Không được bỏ P0 để làm P2.

---

# 17. Kiểm thử tối thiểu

Nhóm phải kiểm tra các trường hợp sau, có thể bằng Postman và thao tác giao diện.

## Tài khoản

- Đăng ký thành công.
- Không đăng ký email trùng.
- Đăng nhập đúng.
- Đăng nhập sai mật khẩu.
- Tài khoản bị khóa không đăng nhập được.
- Customer không truy cập API Admin.
- Staff không quản lý sản phẩm và người dùng.

## Sản phẩm

- Admin thêm sản phẩm.
- Không cho trùng mã sản phẩm.
- Không cho trùng SKU.
- Không cho giá âm.
- Không cho tồn kho âm.
- Sản phẩm ẩn không xuất hiện cho Customer.
- Search và filter trả kết quả đúng.

## Giỏ hàng

- Thêm đúng biến thể.
- Thêm lại cùng biến thể tăng số lượng.
- Không thêm sản phẩm hết hàng.
- Không vượt tồn kho.
- Xóa sản phẩm.
- Xóa toàn bộ giỏ.

## Voucher

- Voucher hợp lệ.
- Voucher hết hạn.
- Voucher chưa bắt đầu.
- Không đạt giá trị tối thiểu.
- Vượt số lượt sử dụng.
- Tính giảm phần trăm đúng.
- Tính giảm cố định đúng.

## Đơn hàng

- Đặt COD thành công.
- Tổng tiền đúng.
- Stock giảm đúng.
- Cart được xóa.
- Customer chỉ xem đơn của mình.
- Chuyển trạng thái đúng luồng.
- Hủy đơn hoàn lại stock một lần.
- Doanh thu chỉ tính đơn hoàn thành.

---

# 18. Definition of Done

Một chức năng chỉ được đánh dấu hoàn thành khi:

- Backend API hoạt động.
- Frontend sử dụng được API.
- Dữ liệu được validate.
- Quyền được kiểm tra ở backend.
- Có xử lý lỗi.
- Giao diện có thông báo loading hoặc lỗi.
- Không làm hỏng chức năng cũ.
- Đã kiểm tra bằng Postman hoặc giao diện.
- Đã push code lên GitHub.
- Thành viên còn lại đã kiểm tra tích hợp.

---

# 19. Quy ước code và Git

## Branch

```text
main
develop
feature/auth
feature/products
feature/storefront
feature/cart
feature/orders
feature/admin
```

## Commit

```text
feat: add product creation API
feat: build customer product list
fix: prevent quantity exceeding stock
fix: restore stock after order cancellation
docs: update project setup guide
```

## Quy tắc

- Không commit `.env`.
- Không commit `node_modules`.
- Không sửa trực tiếp `main` khi đang phát triển.
- Pull code trước khi bắt đầu.
- Commit theo chức năng nhỏ.
- Không để business logic quan trọng ở frontend.
- Không hard-code secret.
- Không tự ý thêm công nghệ ngoài file này.

---

# 20. Tài khoản demo đề xuất

```text
Admin
admin@gmail.com
admin123

Staff
staff@gmail.com
staff123

Customer
customer@gmail.com
customer123
```

Chỉ dùng trong dữ liệu demo.

---

# 21. Kịch bản demo

## Customer

1. Đăng nhập.
2. Tìm kiếm sản phẩm.
3. Lọc theo hãng và bộ nhớ trong.
4. Xem chi tiết.
5. Chọn màu và dung lượng.
6. Thêm vào giỏ.
7. Áp voucher.
8. Đặt COD.
9. Xem lịch sử và trạng thái đơn.
10. Gửi yêu cầu hủy nếu trạng thái cho phép.

## Staff

1. Đăng nhập.
2. Xem đơn mới.
3. Xác nhận đơn.
4. Cập nhật chuẩn bị hàng.
5. Cập nhật đang giao.
6. Chứng minh Staff không quản lý sản phẩm và người dùng.

## Admin

1. Đăng nhập.
2. Thêm hoặc sửa một sản phẩm.
3. Upload ảnh Cloudinary.
4. Cập nhật giá và tồn kho biến thể.
5. Xử lý đơn.
6. Khóa hoặc mở tài khoản.
7. Xem dashboard và top sản phẩm.

---

# 22. Hướng dẫn dành cho AI agent

Trước khi sửa code, AI agent phải:

1. Đọc toàn bộ file này.
2. Đọc README.
3. Kiểm tra cấu trúc hiện tại.
4. Kiểm tra task thuộc tuần nào.
5. Không tự ý thay đổi stack.
6. Không thêm công nghệ ngoài phạm vi.
7. Không tạo kiến trúc quá phức tạp.
8. Không tin giá, role, stock hoặc total từ frontend.
9. Luôn kiểm tra JWT và role tại backend.
10. Dùng `storage` thay cho `rom` trong code.
11. Giá và stock phải nằm trong variant.
12. Order phải lưu snapshot sản phẩm.
13. Ảnh phải lưu URL và public ID của Cloudinary.
14. Chạy kiểm tra trước khi kết thúc.
15. Tóm tắt file đã thay đổi và vấn đề còn lại.

Prompt khởi đầu đề xuất:

```text
Read PHONE_STORE_FINAL_PROJECT_SPEC.md completely before making any changes.
Follow the finalized MERN + Cloudinary stack, feature scope, database design,
business rules and four-week plan. Do not add technologies or architecture
outside the approved scope.
```

---

# 23. Quyết định cuối cùng

Project được chốt theo hướng:

```text
React.js
    +
Node.js
    +
Express.js
    +
MongoDB
    +
Cloudinary
```

Các thư viện khác chỉ được dùng để hỗ trợ những chức năng cần thiết như JWT, mã hóa mật khẩu, gọi API, điều hướng và upload ảnh.

Project không chạy theo hướng sử dụng thật nhiều công nghệ. Điểm chính nằm ở việc hoàn thành tốt:

```text
Sản phẩm có biến thể
→ Giá và tồn kho theo biến thể
→ Tìm kiếm và lọc
→ Giỏ hàng
→ Voucher
→ Đặt hàng COD
→ Quản lý trạng thái đơn
→ Quản lý người dùng
→ Báo cáo thống kê
```

VNPay Sandbox, Swagger và test tự động chỉ thực hiện khi các chức năng bắt buộc đã hoàn thành và hoạt động ổn định.
